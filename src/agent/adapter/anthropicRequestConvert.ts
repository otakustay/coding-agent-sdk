import type {MessageParam, Tool, ContentBlockParam} from '@anthropic-ai/sdk/resources/messages/messages';
import type {
    OpenResponsesInput,
    OpenResponsesInputMessageItem,
    OpenResponsesRequestToolFunction,
    ResponsesOutputMessage,
    ResponsesOutputItemFunctionCall,
} from '@openrouter/sdk/models';

interface AssistantGroup {
    content: string;
    toolUses: Array<{id: string, name: string, input: unknown}>;
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

function flushAssistantGroup(group: AssistantGroup, messages: MessageParam[]): void {
    const content: ContentBlockParam[] = [];
    if (group.content) {
        content.push({type: 'text', text: group.content});
    }
    for (const tu of group.toolUses) {
        content.push({type: 'tool_use', id: tu.id, name: tu.name, input: tu.input});
    }
    if (content.length > 0) {
        messages.push({role: 'assistant', content});
    }
}

function flushToolResults(results: Array<{toolUseId: string, content: string}>, messages: MessageParam[]): void {
    if (results.length === 0) {
        return;
    }
    const content: ContentBlockParam[] = results.map(r => ({
        type: 'tool_result' as const,
        tool_use_id: r.toolUseId,
        content: r.content,
    }));
    messages.push({role: 'user', content});
}

export interface AnthropicConvertedInput {
    system: string | undefined;
    messages: MessageParam[];
}

export function convertInputToAnthropicParams(input: OpenResponsesInput): AnthropicConvertedInput {
    if (typeof input === 'string') {
        return {system: undefined, messages: [{role: 'user', content: input}]};
    }

    let system: string | undefined;
    const messages: MessageParam[] = [];
    let pendingGroup: AssistantGroup | null = null;
    let pendingToolResults: Array<{toolUseId: string, content: string}> = [];

    for (const item of input) {
        if (isAssistantMessage(item)) {
            // Flush pending tool results before assistant group
            flushToolResults(pendingToolResults, messages);
            pendingToolResults = [];

            if (!pendingGroup) {
                pendingGroup = {content: '', toolUses: []};
            }
            const text = item
                .content
                .filter(p => p.type === 'output_text')
                .map(p => (p as {text: string}).text)
                .join('');
            pendingGroup.content += text;
            continue;
        }

        if (isFunctionCall(item)) {
            // Flush pending tool results before assistant group
            flushToolResults(pendingToolResults, messages);
            pendingToolResults = [];

            if (!pendingGroup) {
                pendingGroup = {content: '', toolUses: []};
            }
            let parsedInput: unknown = {};
            try {
                parsedInput = JSON.parse(item.arguments ?? '{}');
            }
            catch {
                parsedInput = {};
            }
            pendingGroup.toolUses.push({
                id: item.callId ?? item.id ?? '',
                name: item.name ?? '',
                input: parsedInput,
            });
            continue;
        }

        // Non-assistant, non-function-call item: flush pending assistant group
        if (pendingGroup) {
            flushAssistantGroup(pendingGroup, messages);
            pendingGroup = null;
        }

        if (isFunctionCallOutput(item)) {
            pendingToolResults.push({toolUseId: item.callId, content: item.output});
            continue;
        }

        // Flush pending tool results before non-tool-result messages
        flushToolResults(pendingToolResults, messages);
        pendingToolResults = [];

        if (isInputMessageItem(item)) {
            const role = item.role;
            const text = extractTextFromContent(item.content);
            if (role === 'system' || role === 'developer') {
                system = text;
            }
            else {
                messages.push({role: 'user', content: text});
            }
        }
    }

    // Flush trailing
    if (pendingGroup) {
        flushAssistantGroup(pendingGroup, messages);
    }
    flushToolResults(pendingToolResults, messages);

    return {system, messages};
}

export function convertAnthropicTools(tools: OpenResponsesRequestToolFunction[]): Tool[] {
    return tools.map(t => ({
        name: t.name,
        ...(t.description ? {description: t.description} : {}),
        input_schema: {
            type: 'object' as const,
            ...(t.parameters ? t.parameters as Record<string, unknown> : {}),
        },
    }));
}
