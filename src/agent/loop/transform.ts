import type {
    OpenResponsesInput,
    OpenResponsesInputMessageItem,
    OpenResponsesFunctionCallOutput,
    ResponsesOutputMessage,
    ResponsesOutputItemReasoning,
    ResponsesOutputItemFunctionCall,
} from '@openrouter/sdk/models';
import type {
    AgentWorkItem,
    AgentWorkItemSystemInput,
    AgentWorkItemUserInput,
    AgentWorkItemToolResultInput,
    AgentWorkItemTextOutput,
    AgentWorkItemReasoningOutput,
    AgentWorkItemReasoningSummaryOutput,
    AgentWorkItemToolCallOutput,
} from './interface.js';

type ItemInput = Extract<OpenResponsesInput, readonly unknown[]>[number];

/**
 * Transform system input to OpenRouter format
 */
function transformSystemInput(item: AgentWorkItemSystemInput): OpenResponsesInputMessageItem {
    return {
        role: 'system',
        content: [{type: 'input_text', text: item.content}],
    };
}

/**
 * Transform user input to OpenRouter format
 */
function transformUserInput(item: AgentWorkItemUserInput): OpenResponsesInputMessageItem {
    return {
        role: 'user',
        content: item.content.map(part => ({
            type: 'input_text',
            text: part.content,
        })),
    };
}

/**
 * Transform tool result to OpenRouter format
 */
function transformToolResultInput(item: AgentWorkItemToolResultInput): OpenResponsesFunctionCallOutput {
    return {
        callId: item.callId,
        type: 'function_call_output',
        output: item.content,
    };
}

/**
 * Transform text output to OpenRouter format
 */
function transformTextOutput(item: AgentWorkItemTextOutput): ResponsesOutputMessage {
    return {
        id: item.id,
        role: 'assistant',
        type: 'message',
        status: item.status === 'completed' ? 'completed' : 'in_progress',
        content: [
            {
                type: 'output_text',
                text: item.content,
            },
        ],
    };
}

/**
 * Transform reasoning output to OpenRouter format
 */
function transformReasoningOutput(item: AgentWorkItemReasoningOutput): ResponsesOutputItemReasoning {
    return {
        id: item.id,
        type: 'reasoning',
        status: item.status === 'completed' ? 'completed' : 'in_progress',
        content: [
            {
                type: 'reasoning_text',
                text: item.content,
            },
        ],
        summary: [
            {
                type: 'summary_text',
                text: item.summary,
            },
        ],
    };
}

/**
 * Transform reasoning summary output to OpenRouter format
 */
function transformReasoningSummaryOutput(item: AgentWorkItemReasoningSummaryOutput): ResponsesOutputItemReasoning {
    return {
        id: item.id,
        type: 'reasoning',
        status: item.status === 'completed' ? 'completed' : 'in_progress',
        content: [],
        summary: [
            {
                type: 'summary_text',
                text: item.content,
            },
        ],
    };
}

/**
 * Transform tool call output to OpenRouter format
 */
function transformToolCallOutput(item: AgentWorkItemToolCallOutput): ResponsesOutputItemFunctionCall {
    return {
        callId: item.callId,
        type: 'function_call',
        name: item.name,
        arguments: item.arguments,
        status: item.status === 'completed' ? 'completed' : 'in_progress',
    };
}

/**
 * Transform AgentWorkItem to OpenRouter SDK input format
 */
function transformWorkItemToInput(item: AgentWorkItem): ItemInput {
    switch (item.type) {
        case 'input.system':
            return transformSystemInput(item);

        case 'input.user':
            return transformUserInput(item);

        case 'input.toolResult':
            return transformToolResultInput(item);

        case 'output.text':
            return transformTextOutput(item);

        case 'output.reasoning':
            return transformReasoningOutput(item);

        case 'output.reasoningSummary':
            return transformReasoningSummaryOutput(item);

        case 'output.toolCall':
            return transformToolCallOutput(item);

        default:
            // TypeScript will catch if we miss a case
            const exhaustiveCheck: never = item;
            throw new Error(`Unhandled item type: ${(exhaustiveCheck as AgentWorkItem).type}`);
    }
}

/**
 * Transform an array of AgentWorkItems to OpenRouter SDK input format
 */
export function transformWorkItemsToInput(items: AgentWorkItem[]): OpenResponsesInput {
    return items.map(transformWorkItemToInput);
}
