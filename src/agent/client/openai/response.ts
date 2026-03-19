import crypto from 'node:crypto';
import type {ChatCompletionChunk} from 'openai/resources/chat/completions';
import type {OpenResponsesStreamEvent, OpenResponsesNonStreamingResponse} from '@openrouter/sdk/models';
import {createIncrementCounter} from '../../../utils/id.js';

const prefixMap = {
    message: 'msg_tmp_',
    function_call: 'fc_tmp_',
} as const;

function randomItemId(type: keyof typeof prefixMap): string {
    const n = crypto.randomBytes(8).readBigUInt64BE();
    const suffix = n.toString(36).slice(0, 11).padStart(11, '0');
    return prefixMap[type] + suffix;
}

interface TrackedMessageItem {
    kind: 'message';
    id: string;
    outputIndex: number;
    content: string;
}

interface TrackedFunctionCallItem {
    kind: 'function_call';
    id: string;
    callId: string;
    outputIndex: number;
    name: string;
    arguments: string;
}

type TrackedItem = TrackedMessageItem | TrackedFunctionCallItem;

function getOrCreate<K, V>(map: Map<K, V>, key: K, factory: () => V): [V, boolean] {
    const existing = map.get(key);
    if (existing !== undefined) {
        return [existing, false];
    }
    const item = factory();
    map.set(key, item);
    return [item, true];
}

function createOutputItemAddedEvent(item: TrackedItem, seq: number): OpenResponsesStreamEvent {
    if (item.kind === 'message') {
        return {
            type: 'response.output_item.added',
            outputIndex: item.outputIndex,
            item: {
                type: 'message',
                id: item.id,
                role: 'assistant',
                status: 'in_progress',
                content: [],
            },
            sequenceNumber: seq,
        };
    }
    return {
        type: 'response.output_item.added',
        outputIndex: item.outputIndex,
        item: {
            type: 'function_call',
            id: item.id,
            callId: item.callId,
            name: item.name,
            arguments: '',
            status: 'in_progress',
        },
        sequenceNumber: seq,
    };
}

function createOutputItemDoneEvent(item: TrackedItem, seq: number): OpenResponsesStreamEvent {
    if (item.kind === 'message') {
        return {
            type: 'response.output_item.done',
            outputIndex: item.outputIndex,
            item: {
                type: 'message',
                id: item.id,
                role: 'assistant',
                status: 'completed',
                content: [{type: 'output_text', text: item.content}],
            },
            sequenceNumber: seq,
        };
    }
    return {
        type: 'response.output_item.done',
        outputIndex: item.outputIndex,
        item: {
            type: 'function_call',
            id: item.id,
            callId: item.callId,
            name: item.name,
            arguments: item.arguments,
            status: 'completed',
        },
        sequenceNumber: seq,
    };
}

interface StreamState {
    lastUsage: ChatCompletionChunk['usage'];
    messageItem: TrackedMessageItem | null;
}

export async function* convertStreamEvents(
    stream: AsyncIterable<ChatCompletionChunk>,
): AsyncGenerator<OpenResponsesStreamEvent, void, undefined> {
    const state: StreamState = {lastUsage: null, messageItem: null};
    const nextOutputIndex = createIncrementCounter();
    const seq = createIncrementCounter();

    // Track items: message item and per-index tool call items
    const toolCallItems = new Map<number, TrackedFunctionCallItem>();

    for await (const chunk of stream) {
        if (chunk.usage) {
            state.lastUsage = chunk.usage;
        }

        const choice = chunk.choices[0];
        if (!choice) {
            continue;
        }

        const delta = choice.delta;

        // Handle text content
        if (delta.content) {
            if (!state.messageItem) {
                state.messageItem = {
                    kind: 'message',
                    id: randomItemId('message'),
                    outputIndex: nextOutputIndex(),
                    content: '',
                };
                yield createOutputItemAddedEvent(state.messageItem, seq());
            }
            state.messageItem.content += delta.content;
            yield {
                type: 'response.output_text.delta',
                itemId: state.messageItem.id,
                outputIndex: state.messageItem.outputIndex,
                contentIndex: 0,
                delta: delta.content,
                logprobs: [],
                sequenceNumber: seq(),
            };
        }

        // Handle refusal
        if (delta.refusal) {
            if (!state.messageItem) {
                state.messageItem = {
                    kind: 'message',
                    id: randomItemId('message'),
                    outputIndex: nextOutputIndex(),
                    content: '',
                };
                yield createOutputItemAddedEvent(state.messageItem, seq());
            }
            yield {
                type: 'response.refusal.delta',
                itemId: state.messageItem.id,
                outputIndex: state.messageItem.outputIndex,
                contentIndex: 0,
                delta: delta.refusal,
                sequenceNumber: seq(),
            };
        }

        // Handle tool calls
        if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
                const [tracked, isNew] = getOrCreate(toolCallItems, tc.index, () => ({
                    kind: 'function_call' as const,
                    id: randomItemId('function_call'),
                    callId: tc.id ?? `call_${tc.index}`,
                    outputIndex: nextOutputIndex(),
                    name: tc.function?.name ?? '',
                    arguments: '',
                }));
                if (isNew) {
                    yield createOutputItemAddedEvent(tracked, seq());
                }
                if (tc.function?.name && !tracked.name) {
                    tracked.name = tc.function.name;
                }
                if (tc.function?.arguments) {
                    tracked.arguments += tc.function.arguments;
                    yield {
                        type: 'response.function_call_arguments.delta',
                        itemId: tracked.id,
                        outputIndex: tracked.outputIndex,
                        delta: tc.function.arguments,
                        sequenceNumber: seq(),
                    };
                }
            }
        }

        // Handle finish
        if (choice.finish_reason) {
            if (state.messageItem) {
                yield createOutputItemDoneEvent(state.messageItem, seq());
            }
            for (const tracked of toolCallItems.values()) {
                yield createOutputItemDoneEvent(tracked, seq());
            }
        }
    }

    if (state.lastUsage) {
        const usage = {
            inputTokens: state.lastUsage.prompt_tokens,
            inputTokensDetails: {cachedTokens: state.lastUsage.prompt_tokens_details?.cached_tokens ?? 0},
            outputTokens: state.lastUsage.completion_tokens,
            outputTokensDetails: {reasoningTokens: 0},
            totalTokens: state.lastUsage.total_tokens,
        };
        yield {
            type: 'response.completed',
            response: {usage} as unknown as OpenResponsesNonStreamingResponse,
            sequenceNumber: seq(),
        };
    }
}
