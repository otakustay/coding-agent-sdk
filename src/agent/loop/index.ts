/* oxlint-disable max-lines */
import {z} from 'zod';
import type {
    OpenResponsesRequestToolFunction,
    OpenResponsesStreamEvent,
} from '@openrouter/sdk/models';
import type {ModelClient} from '../client/interface.js';
import type {
    AgentWorkItem,
    AgentWorkItemToolCallOutput,
    AgentWorkItemToolResultInput,
    StreamChunk,
    TimelineEntry,
    TokenUsage,
} from './interface.js';
import {materializeTimeline, transformTimelineToInput} from './transform.js';
import type {QueryContextProvider, QueryState} from '../context/index.js';
import {UserQueryProvider} from '../context/index.js';
import type {
    ToolDefinition,
    ToolImplementation,
    ProcessRecord,
    SubagentRecord,
    TaskRecord,
} from '../tools/interface.js';
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
    private client: ModelClient;
    private model: string;
    private timeline: TimelineEntry[] = [];
    private tools = new Map<string, RegisteredTool>();
    private subagents = new Map<string, SubagentRecord>();
    private processes = new Map<string, ProcessRecord>();
    private tasks = new Map<string, TaskRecord>();
    private processedToolCallIds = new Set<string>();
    private queryContextProviders: QueryContextProvider[] = [new UserQueryProvider()];
    private running = false;
    /**
     * Flag whether current loop aborted externally, aborted loop will stop at next model response
     */
    private aborting: PromiseWithResolvers<void> | null = null;

    constructor(client: ModelClient, model: string) {
        this.client = client;
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

    submitNotificationIfIdle(notification: string): void {
        if (this.running) {
            return;
        }
        void discard(this.submitUserQuery(notification), {silentError: true});
    }

    abort(): Promise<void> {
        if (!this.running) {
            return Promise.resolve();
        }
        this.aborting ??= Promise.withResolvers<void>();
        return this.aborting.promise;
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

    registerQueryContextProvider(provider: QueryContextProvider): void {
        this.queryContextProviders.splice(-1, 0, provider);
    }

    /**
     * Submit a user query, stream all model turns and tool calls until completion.
     *
     * @param userQuery - The user's input query
     * @yields StreamChunk - Chunks with type, id, status, and optional fields to merge
     */
    async *submitUserQuery(userQuery: string): AsyncGenerator<StreamChunk, void, undefined> {
        const state: QueryState = {timeline: this.timeline, model: this.model, userQuery, cwd: process.cwd()};

        const parts: string[] = [];
        for (const provider of this.queryContextProviders) {
            const result = await provider.provide(state);
            if (result) {
                parts.push(result);
            }
        }

        this.timeline.push(createUserInputEntry(parts.join('\n')));
        this.running = true;

        try {
            const loopState = {consecutiveErrors: 0};
            while (this.aborting === null) {
                const {error: modelError, hasCalls} = yield* this.streamOneTurn();

                if (modelError) {
                    loopState.consecutiveErrors++;
                    if (loopState.consecutiveErrors >= 3) {
                        throw new Error(modelError);
                    }
                }
                else {
                    loopState.consecutiveErrors = 0;
                    if (!hasCalls) {
                        break;
                    }
                }
            }
        }
        finally {
            this.running = false;
            this.aborting?.resolve();
            this.aborting = null;
        }
    }

    private buildToolDefinitions(): OpenResponsesRequestToolFunction[] {
        return [...this.tools.values()].map(toToolDefinition);
    }

    private appendOutputEvent(event: OpenResponsesStreamEvent): void {
        this.timeline.push({source: 'output', event});
    }

    private async *streamModelResponse(): AsyncGenerator<StreamChunk, {error?: string}, undefined> {
        const toolDefinitions = this.buildToolDefinitions();
        const input = transformTimelineToInput(this.timeline);

        const hasSystem = input.some(v => typeof v === 'object' && v.type === 'message' && v.role === 'system');
        if (!hasSystem) {
            throw new Error('No system prompt set. Call setSystemPrompt() before submitting queries.');
        }

        const response = this.client.sendStream({
            model: this.model,
            input,
            tools: toolDefinitions,
        });

        for await (const event of response) {
            this.appendOutputEvent(event);

            if (event.type === 'error') {
                return {error: event.message ?? 'Unknown error occurred'};
            }

            if (event.type === 'response.failed') {
                return {error: event.response.error?.message ?? 'Response failed'};
            }

            if (event.type === 'response.completed' && event.response.usage != null) {
                const raw = event.response.usage;
                const usage: TokenUsage = {
                    inputTokens: raw.inputTokens,
                    outputTokens: raw.outputTokens,
                    cacheReadTokens: raw.inputTokensDetails?.cachedTokens ?? 0,
                    cacheWriteTokens: (raw as {cacheWriteTokens?: number}).cacheWriteTokens ?? 0,
                };
                this.timeline.push({source: 'usage', usage});
                yield {type: 'usage', usage};
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

        return {};
    }

    private async *streamOneTurn(): AsyncGenerator<StreamChunk, {error?: string, hasCalls: boolean}, undefined> {
        const {error: modelError} = yield* this.streamModelResponse();

        const newToolCalls = materializeTimeline(this.timeline)
            .filter(isExecutableToolCall)
            .filter(item => !this.processedToolCallIds.has(item.callId));

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

        return modelError
            ? {error: modelError, hasCalls: newToolCalls.length > 0}
            : {hasCalls: newToolCalls.length > 0};
    }

    private createToolCallContext() {
        return {
            historyItems: materializeTimeline(this.timeline),
            respondingModel: this.model,
            workingAgentLoop: this,
            subagents: this.subagents,
            processes: this.processes,
            tasks: this.tasks,
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
