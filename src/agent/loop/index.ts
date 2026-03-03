/* oxlint-disable max-lines */
import {z} from 'zod';
import {OpenRouter} from '@openrouter/sdk';
import type {
    OpenResponsesRequestToolFunction,
    OpenResponsesStreamEvent,
} from '@openrouter/sdk/models';
import type {
    AgentWorkItem,
    AgentWorkItemToolCallOutput,
    AgentWorkItemToolResultInput,
    StreamChunk,
    TimelineEntry,
} from './interface.js';
import {materializeTimeline, transformTimelineToInput} from './transform.js';
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
        parameters: definition.inputSchema,
    };
}

function createSystemInputEntry(prompt: string): TimelineEntry {
    return {
        source: 'input',
        item: {
            role: 'system',
            type: 'message',
            content: [{type: 'input_text', text: prompt}],
        },
    };
}

function createUserInputEntry(userQuery: string): TimelineEntry {
    return {
        source: 'input',
        item: {
            role: 'user',
            type: 'message',
            content: [{type: 'input_text', text: userQuery}],
        },
    };
}

function createToolResultInputEntry(result: AgentWorkItemToolResultInput): TimelineEntry {
    return {
        source: 'input',
        item: {
            type: 'function_call_output',
            callId: result.callId,
            output: result.content,
        },
    };
}

function isSystemInputEntry(entry: TimelineEntry): boolean {
    return entry.source === 'input' && entry.item.type === 'message' && entry.item.role === 'system';
}

export class AgentLoop {
    private client: OpenRouter;
    private model: string;
    private timeline: TimelineEntry[] = [];
    private tools = new Map<string, RegisteredTool>();
    private subagents = new Map<string, AgentLoop>();
    private processes = new Map<string, ProcessRecord>();
    private processedToolCallIds = new Set<string>();
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
        this.timeline = this.timeline.filter(entry => !isSystemInputEntry(entry));
        this.timeline.unshift(createSystemInputEntry(prompt));
    }

    async submitUserQueryForFinalMessageText(userQuery: string): Promise<string> {
        await discard(this.submitUserQuery(userQuery));
        return this.getLastMessageText();
    }

    isRunning(): boolean {
        return this.running;
    }

    getLastMessageText(): string {
        const lastTextItem = materializeTimeline(this.timeline).findLast(item => item.type === 'output.text');
        return lastTextItem?.type === 'output.text'
            ? lastTextItem.content.map(p => p.type === 'output_text' ? p.text : p.refusal).join('')
            : '';
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
        this.timeline.push(createUserInputEntry(userQuery));
        this.running = true;

        try {
            while (true) {
                yield* this.streamModelResponse();

                const newToolCalls = materializeTimeline(this.timeline)
                    .filter(isExecutableToolCall)
                    .filter(item => !this.processedToolCallIds.has(item.callId));

                if (newToolCalls.length === 0) {
                    break;
                }

                for (const toolCall of newToolCalls) {
                    this.processedToolCallIds.add(toolCall.callId);
                }

                const results = await this.executeToolCalls(newToolCalls);

                for (const result of results) {
                    this.timeline.push(createToolResultInputEntry(result));
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

    private appendOutputEvent(event: OpenResponsesStreamEvent): void {
        this.timeline.push({source: 'output', event});
    }

    private async *streamModelResponse(): AsyncGenerator<StreamChunk, void, undefined> {
        const toolDefinitions = this.buildToolDefinitions();
        const response = await this.client.beta.responses.send({
            stream: true,
            model: this.model,
            input: transformTimelineToInput(this.timeline),
            ...(toolDefinitions.length > 0 ? {tools: toolDefinitions} : {}),
        });

        for await (const event of response) {
            this.appendOutputEvent(event);

            if (event.type === 'error') {
                throw new Error(event.message ?? 'Unknown error occurred');
            }

            if (event.type === 'response.failed') {
                throw new Error(event.response.error?.message ?? 'Response failed');
            }

            if (event.type === 'response.output_item.added') {
                const {item} = event;

                if (item.type === 'reasoning') {
                    yield {
                        type: 'output.reasoning',
                        id: item.id,
                        status: 'open',
                    };
                }
                else if (item.type === 'message') {
                    yield {
                        type: 'output.text',
                        id: item.id,
                        status: 'open',
                    };
                }
                else if (item.type === 'function_call') {
                    const id = item.id ?? item.callId ?? '';
                    yield {
                        type: 'output.toolCall',
                        id,
                        status: 'open',
                        callId: item.callId ?? '',
                        name: item.name ?? '',
                    };
                }

                continue;
            }

            if (event.type === 'response.content_part.added') {
                continue;
            }

            if (event.type === 'response.output_text.delta') {
                yield {
                    type: 'output.text',
                    id: event.itemId,
                    status: 'open',
                    content: event.delta,
                };
                continue;
            }

            if (event.type === 'response.reasoning_text.delta') {
                yield {
                    type: 'output.reasoning',
                    id: event.itemId,
                    status: 'open',
                    content: event.delta,
                };
                continue;
            }

            if (event.type === 'response.reasoning_summary_text.delta') {
                yield {
                    type: 'output.reasoning',
                    id: event.itemId,
                    status: 'open',
                    summary: event.delta,
                };
                continue;
            }

            if (event.type === 'response.function_call_arguments.delta') {
                yield {
                    type: 'output.toolCall',
                    id: event.itemId,
                    status: 'open',
                    arguments: event.delta,
                };
                continue;
            }

            if (event.type === 'response.refusal.delta') {
                yield {
                    type: 'output.text',
                    id: event.itemId,
                    status: 'open',
                    content: event.delta,
                };
                continue;
            }

            if (event.type === 'response.output_item.done') {
                if (event.item.type === 'reasoning' && event.item.id) {
                    yield {type: 'output.reasoning', id: event.item.id, status: 'completed'};
                }
                else if (event.item.type === 'message' && event.item.id) {
                    yield {type: 'output.text', id: event.item.id, status: 'completed'};
                }
                else if (event.item.type === 'function_call') {
                    const id = event.item.id ?? event.item.callId ?? '';
                    yield {type: 'output.toolCall', id, status: 'completed'};
                }
                continue;
            }
        }
    }

    private createToolCallContext() {
        return {
            historyItems: materializeTimeline(this.timeline),
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
            const parameters = z.fromJSONSchema(registered.definition.inputSchema).parse(rawParameters);
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
