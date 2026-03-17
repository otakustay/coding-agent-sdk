import type {ChatCompletionChunk} from 'openai/resources/chat/completions';
import type {OpenResponsesStreamEvent} from '@openrouter/sdk/models';
import {createIdGenerator} from '../../../utils/id.js';

const nextId = createIdGenerator();

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

export async function* convertStreamEvents(
    stream: AsyncIterable<ChatCompletionChunk>,
): AsyncGenerator<OpenResponsesStreamEvent, void, undefined> {
    let seq = 0;
    let nextOutputIndex = 0;

    // Track items: message item and per-index tool call items
    let messageItem: TrackedMessageItem | null = null;
    const toolCallItems = new Map<number, TrackedFunctionCallItem>();

    for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) {
            continue;
        }

        const delta = choice.delta;

        // Handle text content
        if (delta.content) {
            if (!messageItem) {
                messageItem = {
                    kind: 'message',
                    id: nextId(),
                    outputIndex: nextOutputIndex++,
                    content: '',
                };
                yield createOutputItemAddedEvent(messageItem, seq++);
            }
            messageItem.content += delta.content;
            yield {
                type: 'response.output_text.delta',
                itemId: messageItem.id,
                outputIndex: messageItem.outputIndex,
                contentIndex: 0,
                delta: delta.content,
                logprobs: [],
                sequenceNumber: seq++,
            };
        }

        // Handle refusal
        if (delta.refusal) {
            if (!messageItem) {
                messageItem = {
                    kind: 'message',
                    id: nextId(),
                    outputIndex: nextOutputIndex++,
                    content: '',
                };
                yield createOutputItemAddedEvent(messageItem, seq++);
            }
            yield {
                type: 'response.refusal.delta',
                itemId: messageItem.id,
                outputIndex: messageItem.outputIndex,
                contentIndex: 0,
                delta: delta.refusal,
                sequenceNumber: seq++,
            };
        }

        // Handle tool calls
        if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
                let tracked = toolCallItems.get(tc.index);
                if (!tracked) {
                    tracked = {
                        kind: 'function_call',
                        id: nextId(),
                        callId: tc.id ?? `call_${tc.index}`,
                        outputIndex: nextOutputIndex++,
                        name: tc.function?.name ?? '',
                        arguments: '',
                    };
                    toolCallItems.set(tc.index, tracked);
                    yield createOutputItemAddedEvent(tracked, seq++);
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
                        sequenceNumber: seq++,
                    };
                }
            }
        }

        // Handle finish
        if (choice.finish_reason) {
            if (messageItem) {
                yield createOutputItemDoneEvent(messageItem, seq++);
            }
            for (const tracked of toolCallItems.values()) {
                yield createOutputItemDoneEvent(tracked, seq++);
            }
        }
    }
}
