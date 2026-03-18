import type {RawMessageStreamEvent, MessageDeltaUsage} from '@anthropic-ai/sdk/resources/messages/messages';
import type {OpenResponsesStreamEvent, OpenResponsesNonStreamingResponse} from '@openrouter/sdk/models';
import {createIdGenerator, createIncrementCounter} from '../../../utils/id.js';

const nextId = createIdGenerator();
const nextOutputIndex = createIncrementCounter();
const seq = createIncrementCounter();

interface TrackedTextItem {
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

interface TrackedReasoningItem {
    kind: 'reasoning';
    id: string;
    outputIndex: number;
    content: string;
}

type TrackedItem = TrackedTextItem | TrackedFunctionCallItem | TrackedReasoningItem;

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
    if (item.kind === 'reasoning') {
        return {
            type: 'response.output_item.added',
            outputIndex: item.outputIndex,
            item: {
                type: 'reasoning',
                id: item.id,
                summary: [],
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
    if (item.kind === 'reasoning') {
        return {
            type: 'response.output_item.done',
            outputIndex: item.outputIndex,
            item: {
                type: 'reasoning',
                id: item.id,
                summary: [],
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
    lastDeltaUsage: MessageDeltaUsage | null;
}

export async function* convertAnthropicStreamEvents(
    stream: AsyncIterable<RawMessageStreamEvent>,
): AsyncGenerator<OpenResponsesStreamEvent, void, undefined> {
    const state: StreamState = {lastDeltaUsage: null};

    // Track items by content block index
    const trackedItems = new Map<number, TrackedItem>();

    for await (const event of stream) {
        if (event.type === 'message_delta') {
            state.lastDeltaUsage = event.usage;
            continue;
        }

        if (event.type === 'content_block_start') {
            const block = event.content_block;
            const index = event.index;

            if (block.type === 'text') {
                const item: TrackedTextItem = {
                    kind: 'message',
                    id: nextId(),
                    outputIndex: nextOutputIndex(),
                    content: '',
                };
                trackedItems.set(index, item);
                yield createOutputItemAddedEvent(item, seq());
            }
            else if (block.type === 'tool_use') {
                const item: TrackedFunctionCallItem = {
                    kind: 'function_call',
                    id: nextId(),
                    callId: block.id,
                    outputIndex: nextOutputIndex(),
                    name: block.name,
                    arguments: '',
                };
                trackedItems.set(index, item);
                yield createOutputItemAddedEvent(item, seq());
            }
            else if (block.type === 'thinking') {
                const item: TrackedReasoningItem = {
                    kind: 'reasoning',
                    id: nextId(),
                    outputIndex: nextOutputIndex(),
                    content: '',
                };
                trackedItems.set(index, item);
                yield createOutputItemAddedEvent(item, seq());
            }
            continue;
        }

        if (event.type === 'content_block_delta') {
            const tracked = trackedItems.get(event.index);
            if (!tracked) {
                continue;
            }

            const delta = event.delta;

            if (delta.type === 'text_delta' && tracked.kind === 'message') {
                tracked.content += delta.text;
                yield {
                    type: 'response.output_text.delta',
                    itemId: tracked.id,
                    outputIndex: tracked.outputIndex,
                    contentIndex: 0,
                    delta: delta.text,
                    logprobs: [],
                    sequenceNumber: seq(),
                };
            }
            else if (delta.type === 'input_json_delta' && tracked.kind === 'function_call') {
                tracked.arguments += delta.partial_json;
                yield {
                    type: 'response.function_call_arguments.delta',
                    itemId: tracked.id,
                    outputIndex: tracked.outputIndex,
                    delta: delta.partial_json,
                    sequenceNumber: seq(),
                };
            }
            else if (delta.type === 'thinking_delta' && tracked.kind === 'reasoning') {
                tracked.content += delta.thinking;
                yield {
                    type: 'response.reasoning_text.delta',
                    itemId: tracked.id,
                    outputIndex: tracked.outputIndex,
                    contentIndex: 0,
                    delta: delta.thinking,
                    sequenceNumber: seq(),
                };
            }
            continue;
        }

        if (event.type === 'content_block_stop') {
            const tracked = trackedItems.get(event.index);
            if (tracked) {
                yield createOutputItemDoneEvent(tracked, seq());
                trackedItems.delete(event.index);
            }
            continue;
        }
    }

    if (state.lastDeltaUsage) {
        const usage = {
            inputTokens: state.lastDeltaUsage.input_tokens ?? 0,
            inputTokensDetails: {cachedTokens: state.lastDeltaUsage.cache_read_input_tokens ?? 0},
            outputTokens: state.lastDeltaUsage.output_tokens,
            outputTokensDetails: {reasoningTokens: 0},
            totalTokens: (state.lastDeltaUsage.input_tokens ?? 0) + state.lastDeltaUsage.output_tokens,
            cacheWriteTokens: state.lastDeltaUsage.cache_creation_input_tokens ?? 0,
        };
        yield {
            type: 'response.completed',
            response: {usage} as unknown as OpenResponsesNonStreamingResponse,
            sequenceNumber: seq(),
        };
    }
}
