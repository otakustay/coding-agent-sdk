/* oxlint-disable max-lines */
import {OpenRouter} from '@openrouter/sdk';
import type {OpenResponsesRequestToolFunction} from '@openrouter/sdk/models';
import type {
    AgentWorkItem,
    AgentWorkItemToolCallOutput,
    AgentWorkItemToolResultInput,
    StreamChunk,
} from './interface.js';
import {transformWorkItemsToInput} from './transform.js';
import type {ToolDefinition, ToolImplementation, ProcessRecord} from '../tools/interface.js';
import {stringifyError} from '../../utils/error.js';
import {discard} from '../../utils/iterable.js';
import {error} from './utils/prompt.js';

interface RegisteredTool {
    definition: ToolDefinition;
    implement: ToolImplementation;
}

function isExecutableToolCall(item: AgentWorkItem): item is AgentWorkItemToolCallOutput {
    return item.type === 'output.toolCall' && item.status === 'completed';
}

function toToolDefinition({definition}: RegisteredTool): OpenResponsesRequestToolFunction {
    return {
        type: 'function',
        name: definition.name,
        description: definition.description,
        parameters: definition.inputSchema.toJSONSchema(),
    };
}

export class AgentLoop {
    private client: OpenRouter;
    private model: string;
    private items: AgentWorkItem[] = [];
    private tools = new Map<string, RegisteredTool>();
    private subagents = new Map<string, AgentLoop>();
    private processes = new Map<string, ProcessRecord>();
    private running = false;

    constructor(apiKeyOrClient: string | OpenRouter, model: string) {
        this.client = typeof apiKeyOrClient === 'string'
            ? new OpenRouter({apiKey: apiKeyOrClient})
            : apiKeyOrClient;
        this.model = model;
    }

    fork(): AgentLoop {
        return new AgentLoop(this.client, this.model);
    }

    setSystemPrompt(prompt: string): void {
        const existingIndex = this.items.findIndex(item => item.type === 'input.system');
        if (existingIndex >= 0) {
            this.items.splice(existingIndex, 1);
        }
        this.items.unshift({type: 'input.system', content: prompt});
    }

    async submitUserQueryForFinalMessageText(userQuery: string): Promise<string> {
        await discard(this.submitUserQuery(userQuery));
        return this.getLastMessageText();
    }

    isRunning(): boolean {
        return this.running;
    }

    getLastMessageText(): string {
        const lastTextItem = this.items.findLast(item => item.type === 'output.text');
        return lastTextItem?.type === 'output.text' ? lastTextItem.content : '';
    }

    registerTool(definition: ToolDefinition, implement: ToolImplementation<any>): void {
        this.tools.set(definition.name, {definition, implement});
    }

    /**
     * Submit a user query, stream all model turns and tool calls until completion.
     *
     * @param userQuery - The user's input query
     * @yields StreamChunk - Chunks with type, id, status, and optional fields to merge
     */
    async *submitUserQuery(userQuery: string): AsyncGenerator<StreamChunk, void, undefined> {
        this.items.push({type: 'input.user', content: [{type: 'text', content: userQuery}]});
        this.running = true;

        try {
            while (true) {
                const startIndex = this.items.length;

                yield* this.streamModelResponse();

                const newToolCalls = this.items.slice(startIndex).filter(isExecutableToolCall);

                if (newToolCalls.length === 0) {
                    break;
                }

                const results = await this.executeToolCalls(newToolCalls);

                for (const result of results) {
                    this.items.push(result);
                    yield {
                        type: 'input.toolResult',
                        id: `toolResult:${result.callId}`,
                        status: 'completed',
                        callId: result.callId,
                        content: result.content,
                    };
                }
            }
        }
        finally {
            this.running = false;
        }
    }

    private buildToolDefinitions(): OpenResponsesRequestToolFunction[] {
        return [...this.tools.values()].map(toToolDefinition);
    }

    private async *streamModelResponse(): AsyncGenerator<StreamChunk, void, undefined> {
        const toolDefinitions = this.buildToolDefinitions();
        const response = await this.client.beta.responses.send({
            stream: true,
            model: this.model,
            input: transformWorkItemsToInput(this.items),
            ...(toolDefinitions.length > 0 ? {tools: toolDefinitions} : {}),
        });

        for await (const event of response) {
            if (event.type === 'error') {
                throw new Error(event.message ?? 'Unknown error occurred');
            }

            if (event.type === 'response.failed') {
                throw new Error(event.response.error?.message ?? 'Response failed');
            }

            if (event.type === 'response.output_item.added') {
                const {item} = event;

                if (item.type === 'reasoning') {
                    this.items.push({
                        type: 'output.reasoning',
                        id: item.id,
                        status: 'open',
                        content: '',
                        summary: '',
                    });
                    yield {
                        type: 'output.reasoning',
                        id: item.id,
                        status: 'open',
                    };
                }
                else if (item.type === 'message') {
                    this.items.push({
                        type: 'output.text',
                        id: item.id,
                        status: 'open',
                        content: '',
                    });
                    yield {
                        type: 'output.text',
                        id: item.id,
                        status: 'open',
                    };
                }
                else if (item.type === 'function_call') {
                    const functionCallItem = item as Extract<typeof item, {type: 'function_call'}>;
                    this.items.push({
                        type: 'output.toolCall',
                        id: functionCallItem.id ?? '',
                        status: 'open',
                        callId: functionCallItem.callId ?? '',
                        name: functionCallItem.name ?? '',
                        arguments: '',
                    });
                    yield {
                        type: 'output.toolCall',
                        id: functionCallItem.id ?? '',
                        status: 'open',
                        callId: functionCallItem.callId ?? '',
                        name: functionCallItem.name ?? '',
                    };
                }

                continue;
            }

            if (event.type === 'response.content_part.added') {
                continue;
            }

            if (event.type === 'response.output_text.delta') {
                const item = this.items.findLast(i => i.type === 'output.text' && i.id === event.itemId);
                if (item && item.type === 'output.text') {
                    item.content += event.delta;
                }
                yield {
                    type: 'output.text',
                    id: event.itemId,
                    status: 'open',
                    content: event.delta,
                };
                continue;
            }

            if (event.type === 'response.reasoning_text.delta') {
                const item = this.items.findLast(i => i.type === 'output.reasoning' && i.id === event.itemId);
                if (item && item.type === 'output.reasoning') {
                    item.content += event.delta;
                }
                yield {
                    type: 'output.reasoning',
                    id: event.itemId,
                    status: 'open',
                    content: event.delta,
                };
                continue;
            }

            if (event.type === 'response.reasoning_summary_text.delta') {
                const item = this.items.findLast(i => i.type === 'output.reasoning' && i.id === event.itemId);
                if (item && item.type === 'output.reasoning') {
                    item.summary += event.delta;
                }
                yield {
                    type: 'output.reasoning',
                    id: event.itemId,
                    status: 'open',
                    summary: event.delta,
                };
                continue;
            }

            if (event.type === 'response.function_call_arguments.delta') {
                const item = this.items.findLast(i => i.type === 'output.toolCall' && i.id === event.itemId);
                if (item && item.type === 'output.toolCall') {
                    item.arguments += event.delta;
                }
                yield {
                    type: 'output.toolCall',
                    id: event.itemId,
                    status: 'open',
                    arguments: event.delta,
                };
                continue;
            }

            if (event.type === 'response.refusal.delta') {
                const item = this.items.findLast(i => i.type === 'output.text' && i.id === event.itemId);
                if (item && item.type === 'output.text') {
                    item.content += event.delta;
                }
                yield {
                    type: 'output.text',
                    id: event.itemId,
                    status: 'open',
                    content: event.delta,
                };
                continue;
            }

            if (event.type === 'response.output_item.done') {
                const matchId = event.item.type === 'function_call'
                    ? event.item.id ?? event.item.callId
                    : event.item.id;

                const item = this.items.findLast(
                    i => (i.type === 'output.reasoning'
                        || i.type === 'output.reasoningSummary'
                        || i.type === 'output.text'
                        || i.type === 'output.toolCall')
                        && i.id === matchId
                );

                if (item) {
                    if (
                        item.type === 'output.reasoning'
                        || item.type === 'output.reasoningSummary'
                        || item.type === 'output.text'
                        || item.type === 'output.toolCall'
                    ) {
                        item.status = 'completed';
                    }

                    if (item.type === 'output.reasoning') {
                        yield {type: 'output.reasoning', id: item.id, status: 'completed'};
                    }
                    else if (item.type === 'output.text') {
                        yield {type: 'output.text', id: item.id, status: 'completed'};
                    }
                    else if (item.type === 'output.toolCall') {
                        yield {type: 'output.toolCall', id: item.id, status: 'completed'};
                    }
                }
                continue;
            }
        }
    }

    private createToolCallContext() {
        return {
            historyItems: [...this.items],
            respondingModel: this.model,
            workingAgentLoop: this,
            subagents: this.subagents,
            processes: this.processes,
        };
    }
    private async executeToolCall(toolCall: AgentWorkItemToolCallOutput): Promise<AgentWorkItemToolResultInput> {
        const registered = this.tools.get(toolCall.name);
        if (!registered) {
            return {
                type: 'input.toolResult',
                callId: toolCall.callId,
                content: error(`Tool "${toolCall.name}" does not exist`),
            };
        }
        try {
            const rawParameters = JSON.parse(toolCall.arguments);
            const parameters = registered.definition.inputSchema.parse(rawParameters);
            const content = await registered.implement(parameters, this.createToolCallContext());
            return {type: 'input.toolResult', callId: toolCall.callId, content};
        }
        catch (ex) {
            return {
                type: 'input.toolResult',
                callId: toolCall.callId,
                content: error(stringifyError(ex)),
            };
        }
    }

    private async executeToolCalls(toolCalls: AgentWorkItemToolCallOutput[]): Promise<AgentWorkItemToolResultInput[]> {
        const results: AgentWorkItemToolResultInput[] = [];
        for (const toolCall of toolCalls) {
            results.push(await this.executeToolCall(toolCall));
        }
        return results;
    }
}
