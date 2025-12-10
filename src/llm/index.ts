import type {ChatChunk, ChatOutputChunk} from './interface.js';
import {streamingChat} from './openRouter.js';
import {renderSystemPrompt} from './prompt.js';
import {evaluateToolDescription} from './tools.js';
import {evaluate} from '../tools/evaluate/index.js';
import {AssistantMessageBuilder} from './builder.js';
import type {Message} from '@openrouter/sdk/models';

export {AssistantMessageBuilder} from './builder.js';
export type {
    StreamingChatOptions,
    ToolCallData,
    ToolCallDelta,
    ChatTextChunk,
    ChatToolCallChunk,
    ChatToolCallStartChunk,
    ChatToolCallEndChunk,
    ChatDoneChunk,
    ChatChunk,
} from './interface.js';

const toolImplements: Record<string, ((args: any) => unknown) | undefined> = {evaluate};

async function* runModel(messages: Message[]): AsyncGenerator<ChatOutputChunk> {
    const tools = [evaluateToolDescription];
    const stream = streamingChat({model: 'anthropic/claude-sonnet-4.5', messages, tools});

    yield* stream;
}

export async function* startAgentTask(query: string): AsyncGenerator<ChatChunk> {
    const messages: Message[] = [
        {
            role: 'system',
            content: renderSystemPrompt(),
        },
        {
            role: 'user',
            content: query,
        },
    ];

    while (true) {
        const builder = new AssistantMessageBuilder();

        for await (const chunk of runModel(messages)) {
            builder.consume(chunk);
            yield chunk;
        }

        const assistantMessage = builder.getAssistantMessage();
        const toolCalls = assistantMessage.toolCalls ?? [];

        if (toolCalls.length === 0) {
            break;
        }

        messages.push(assistantMessage);

        const toolResults: Array<{id: string, result: unknown}> = [];
        for (let index = 0; index < toolCalls.length; index++) {
            const toolCall = toolCalls[index];
            const toolImplement = toolImplements[toolCall.function.name];

            if (!toolImplement) {
                throw new Error(`Tool implementation not found: ${toolCall.function.name}`);
            }

            const args = JSON.parse(toolCall.function.arguments);
            const result = await toolImplement(args);

            toolResults.push({id: toolCall.id, result});

            yield {
                type: 'tool-result',
                id: toolCall.id,
                index,
                result,
            };
        }

        for (const {id, result} of toolResults) {
            const toolMessage: Message = {
                role: 'tool',
                toolCallId: id,
                content: JSON.stringify(result),
            };
            messages.push(toolMessage);
        }

        yield {type: 'done'};
    }
}
