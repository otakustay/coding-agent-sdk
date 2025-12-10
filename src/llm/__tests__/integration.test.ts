import {describe, it, expect} from 'vitest';
import {AssistantMessageBuilder} from '../builder.js';
import type {ChatChunk} from '../interface.js';

describe('Integration: AssistantMessageBuilder', () => {
    it('should process streaming chunks', () => {
        const builder = new AssistantMessageBuilder();

        // Simulate streaming chunks
        const chunks: ChatChunk[] = [
            {type: 'text', content: 'Let me help you with that.'},
            {type: 'tool-call-start', index: 0},
            {
                type: 'tool-call',
                index: 0,
                toolCall: {id: 'call_1', name: 'search', arguments: '{"qu'},
            },
            {
                type: 'tool-call',
                index: 0,
                toolCall: {id: '', name: '', arguments: 'ery":"test"}'},
            },
            {type: 'tool-call-end', index: 0},
            {type: 'done'},
        ];

        // Process all chunks
        for (const chunk of chunks) {
            // Builder consumes all chunks except tool-result
            if (chunk.type !== 'tool-result') {
                builder.consume(chunk);
            }
        }

        // Verify AssistantMessageBuilder result
        const message = builder.getAssistantMessage();
        expect(message).toEqual({
            role: 'assistant',
            content: 'Let me help you with that.',
            toolCalls: [
                {
                    id: 'call_1',
                    type: 'function',
                    function: {
                        name: 'search',
                        arguments: '{"query":"test"}',
                    },
                },
            ],
        });
    });

    it('should handle text-only response', () => {
        const builder = new AssistantMessageBuilder();

        const chunks: ChatChunk[] = [
            {type: 'text', content: 'Hello, '},
            {type: 'text', content: 'how can I help you?'},
            {type: 'done'},
        ];

        for (const chunk of chunks) {
            if (chunk.type !== 'tool-result') {
                builder.consume(chunk);
            }
        }

        expect(builder.getAssistantMessage()).toEqual({
            role: 'assistant',
            content: 'Hello, how can I help you?',
        });
    });
});
