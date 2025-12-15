import {describe, it, expect, beforeEach} from 'vitest';
import {AssistantMessageBuilder} from '../builder.js';

describe('AssistantMessageBuilder', () => {
    let builder: AssistantMessageBuilder;

    beforeEach(() => {
        builder = new AssistantMessageBuilder();
    });

    it('should build message with text content', () => {
        builder.consume({type: 'text', content: 'Hello'});
        builder.consume({type: 'text', content: ' world'});
        builder.consume({type: 'done'});

        const message = builder.getAssistantMessage();

        expect(message).toEqual({
            role: 'assistant',
            content: 'Hello world',
        });
    });

    it('should build message with tool calls', () => {
        builder.consume({type: 'tool-call-start', index: 0});
        builder.consume({
            type: 'tool-call',
            index: 0,
            toolCall: {id: 'call_1', name: 'get_weather', arguments: '{"lo'},
        });
        builder.consume({
            type: 'tool-call',
            index: 0,
            toolCall: {id: '', name: '', arguments: 'cation":"'},
        });
        builder.consume({
            type: 'tool-call',
            index: 0,
            toolCall: {id: '', name: '', arguments: 'NYC"}'},
        });
        builder.consume({type: 'done'});

        const message = builder.getAssistantMessage();

        expect(message).toEqual({
            role: 'assistant',
            toolCalls: [
                {
                    id: 'call_1',
                    type: 'function',
                    function: {
                        name: 'get_weather',
                        arguments: '{"location":"NYC"}',
                    },
                },
            ],
        });
    });

    it('should build message with multiple tool calls', () => {
        builder.consume({type: 'tool-call-start', index: 0});
        builder.consume({
            type: 'tool-call',
            index: 0,
            toolCall: {id: 'call_1', name: 'get_weather', arguments: '{"location":"NYC"}'},
        });
        builder.consume({type: 'tool-call-start', index: 1});
        builder.consume({
            type: 'tool-call',
            index: 1,
            toolCall: {id: 'call_2', name: 'get_time', arguments: '{"timezone":"EST"}'},
        });
        builder.consume({type: 'done'});

        const message = builder.getAssistantMessage();

        expect(message.toolCalls).toHaveLength(2);
        expect(message.toolCalls?.[0].function.name).toBe('get_weather');
        expect(message.toolCalls?.[1].function.name).toBe('get_time');
    });

    it('should ignore UI control chunks', () => {
        builder.consume({type: 'tool-call-start', index: 0});
        builder.consume({
            type: 'tool-call',
            index: 0,
            toolCall: {id: 'call_1', name: 'test', arguments: '{}'},
        });
        builder.consume({type: 'tool-call-end', index: 0});
        builder.consume({type: 'done'});

        const message = builder.getAssistantMessage();

        expect(message.toolCalls).toHaveLength(1);
    });

    it('should handle mixed content and tool calls', () => {
        builder.consume({type: 'text', content: 'Let me check that.'});
        builder.consume({type: 'tool-call-start', index: 0});
        builder.consume({
            type: 'tool-call',
            index: 0,
            toolCall: {id: 'call_1', name: 'search', arguments: '{"query":"test"}'},
        });
        builder.consume({type: 'done'});

        const message = builder.getAssistantMessage();

        expect(message.content).toBe('Let me check that.');
        expect(message.toolCalls).toHaveLength(1);
    });

    it('should return minimal message when no chunks consumed', () => {
        const message = builder.getAssistantMessage();

        expect(message).toEqual({role: 'assistant'});
    });
});
