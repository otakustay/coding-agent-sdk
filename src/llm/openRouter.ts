import {OpenRouter} from '@openrouter/sdk';
import type {StreamingChatOptions, ToolCallData, ChatOutputChunk} from './interface.js';

interface StreamingState {
    lastChunkType: 'text' | 'tool-call' | null;
    lastToolCallIndex: number | null;
    needsChunkTypeTransition: boolean;
}

export async function* streamingChat(options: StreamingChatOptions): AsyncGenerator<ChatOutputChunk> {
    const {model, messages, tools} = options;

    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY environment variable is required');
    }

    const client = new OpenRouter({apiKey: process.env.OPENROUTER_API_KEY});
    const state: StreamingState = {
        lastChunkType: null,
        lastToolCallIndex: null,
        needsChunkTypeTransition: false,
    };

    const stream = await client.chat.send({model, messages, tools, stream: true});
    for await (const chunk of stream) {
        const choice = chunk.choices.at(0);

        if (!choice) {
            continue;
        }

        const delta = choice.delta;

        if (delta.content) {
            // Transition from tool-call to text: end previous spinner
            const transitioningFromToolCall = state.lastChunkType === 'tool-call';
            if (transitioningFromToolCall && state.lastToolCallIndex !== null) {
                yield {type: 'tool-call-end', index: state.lastToolCallIndex};
            }

            yield {
                type: 'text',
                content: delta.content,
            };

            state.lastChunkType = 'text';
            state.lastToolCallIndex = null;
            state.needsChunkTypeTransition = false;
        }

        if (delta.toolCalls) {
            for (const toolCall of delta.toolCalls) {
                const isNewToolCall = state.lastToolCallIndex !== toolCall.index;

                // End previous tool call spinner when switching to a new one
                if (isNewToolCall && state.lastToolCallIndex !== null) {
                    yield {type: 'tool-call-end', index: state.lastToolCallIndex};
                }

                // Start new tool call spinner
                if (isNewToolCall) {
                    yield {type: 'tool-call-start', index: toolCall.index};
                }

                const deltaData: ToolCallData = {
                    id: toolCall.id ?? '',
                    name: toolCall.function?.name ?? '',
                    arguments: toolCall.function?.arguments ?? '',
                };

                yield {
                    type: 'tool-call',
                    index: toolCall.index,
                    toolCall: deltaData,
                };

                state.lastChunkType = 'tool-call';
                state.lastToolCallIndex = toolCall.index;
                state.needsChunkTypeTransition = true;
            }
        }

        if (choice.finishReason) {
            // End any ongoing tool call spinner before finishing
            if (
                state.needsChunkTypeTransition && state.lastChunkType === 'tool-call'
                && state.lastToolCallIndex !== null
            ) {
                yield {type: 'tool-call-end', index: state.lastToolCallIndex};
            }

            state.lastChunkType = null;
            state.lastToolCallIndex = null;
            state.needsChunkTypeTransition = false;
        }
    }
}
