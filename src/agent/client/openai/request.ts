import type {ChatCompletionMessageParam, ChatCompletionTool} from 'openai/resources/chat/completions';
import type {
    OpenResponsesInput,
    OpenResponsesInputMessageItem,
    OpenResponsesRequestToolFunction,
    ResponsesOutputMessage,
    ResponsesOutputItemFunctionCall,
} from '@openrouter/sdk/models';

interface AssistantGroup {
    content: string;
    toolCalls: Array<{id: string, name: string, arguments: string}>;
}

interface IterationState {
    pendingGroup: AssistantGroup | null;
}

function isInputMessageItem(item: unknown): item is OpenResponsesInputMessageItem {
    const v = item as Record<string, unknown>;
    return v.type === 'message' || (v.role !== undefined && v.type !== 'function_call_output');
}

function isFunctionCallOutput(item: unknown): item is {type: 'function_call_output', callId: string, output: string} {
    return (item as Record<string, unknown>).type === 'function_call_output';
}

function isAssistantMessage(item: unknown): item is ResponsesOutputMessage {
    const v = item as Record<string, unknown>;
    return v.type === 'message' && v.role === 'assistant';
}

function isFunctionCall(item: unknown): item is ResponsesOutputItemFunctionCall {
    return (item as Record<string, unknown>).type === 'function_call';
}

function extractTextFromContent(content: OpenResponsesInputMessageItem['content']): string {
    if (typeof content === 'string') {
        return content;
    }
    return content
        .filter(p => p.type === 'input_text')
        .map(p => (p as {text: string}).text)
        .join('');
}

function flushAssistantGroup(group: AssistantGroup, messages: ChatCompletionMessageParam[]): void {
    const msg: ChatCompletionMessageParam = {
        role: 'assistant' as const,
        content: group.content || null,
        ...(group.toolCalls.length > 0
            ? {
                tool_calls: group.toolCalls.map(tc => ({
                    id: tc.id,
                    type: 'function' as const,
                    function: {name: tc.name, arguments: tc.arguments},
                })),
            }
            : {}),
    };
    messages.push(msg);
}

export function convertInputToMessages(input: OpenResponsesInput): ChatCompletionMessageParam[] {
    if (typeof input === 'string') {
        return [{role: 'user', content: input}];
    }

    const messages: ChatCompletionMessageParam[] = [];
    const state: IterationState = {pendingGroup: null};

    for (const item of input) {
        // Assistant message or function_call -> group them
        if (isAssistantMessage(item)) {
            if (!state.pendingGroup) {
                state.pendingGroup = {content: '', toolCalls: []};
            }
            const text = item
                .content
                .filter(p => p.type === 'output_text')
                .map(p => (p as {text: string}).text)
                .join('');
            state.pendingGroup.content += text;
            continue;
        }

        if (isFunctionCall(item)) {
            if (!state.pendingGroup) {
                state.pendingGroup = {content: '', toolCalls: []};
            }
            state.pendingGroup.toolCalls.push({
                id: item.callId ?? item.id ?? '',
                name: item.name ?? '',
                arguments: item.arguments ?? '',
            });
            continue;
        }

        // Non-assistant item -> flush any pending assistant group
        if (state.pendingGroup) {
            flushAssistantGroup(state.pendingGroup, messages);
            state.pendingGroup = null;
        }

        if (isFunctionCallOutput(item)) {
            messages.push({
                role: 'tool',
                tool_call_id: item.callId,
                content: item.output,
            });
            continue;
        }

        if (isInputMessageItem(item)) {
            const role = item.role;
            const text = extractTextFromContent(item.content);
            if (role === 'system') {
                messages.push({role: 'system', content: text});
            }
            else if (role === 'developer') {
                messages.push({role: 'developer', content: text});
            }
            else {
                messages.push({role: 'user', content: text});
            }
        }
    }

    // Flush trailing assistant group
    if (state.pendingGroup) {
        flushAssistantGroup(state.pendingGroup, messages);
    }

    return messages;
}

export function convertTools(tools: OpenResponsesRequestToolFunction[]): ChatCompletionTool[] {
    return tools.map(t => ({
        type: 'function' as const,
        function: {
            name: t.name,
            ...(t.description ? {description: t.description} : {}),
            ...(t.parameters ? {parameters: t.parameters as Record<string, unknown>} : {}),
        },
    }));
}
