import type {ChatOutputChunk} from './interface.js';
import type {AssistantMessage, ChatMessageToolCall} from '@openrouter/sdk/models';

export class AssistantMessageBuilder {
    private content: string = '';

    private toolCalls = new Map<number, ChatMessageToolCall>();

    consume(chunk: ChatOutputChunk): void {
        if (chunk.type === 'text') {
            this.content += chunk.content;
        }
        else if (chunk.type === 'tool-call-start') {
            const newCall: ChatMessageToolCall = {
                id: '',
                type: 'function',
                function: {
                    name: '',
                    arguments: '',
                },
            };
            this.toolCalls.set(chunk.index, newCall);
        }
        else if (chunk.type === 'tool-call') {
            const toolCall = this.getToolCallAt(chunk.index);
            toolCall.id += chunk.toolCall.id ?? '';
            toolCall.function.name += chunk.toolCall.name ?? '';
            toolCall.function.arguments += chunk.toolCall.arguments;
        }
    }

    getToolCallAt(index: number): ChatMessageToolCall {
        const toolCall = this.toolCalls.get(index);
        if (!toolCall) {
            throw new Error(`Tool call at index ${index} does not exist`);
        }
        return toolCall;
    }

    getAssistantMessage(): AssistantMessage {
        const message: AssistantMessage = {
            role: 'assistant',
        };

        if (this.content) {
            message.content = this.content;
        }
        if (this.toolCalls.size > 0) {
            message.toolCalls = [...this.toolCalls.values()];
        }

        return message;
    }
}
