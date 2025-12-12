import type {Message, ToolDefinitionJson} from '@openrouter/sdk/models';
import type {ActionMessage} from '../tools/evaluate/index.js';

export interface StreamingChatOptions {
    model: string;
    messages: Message[];
    tools?: ToolDefinitionJson[];
}

export interface ToolCallData {
    id: string;
    name: string;
    arguments: string;
}

export interface ToolCallDelta {
    id?: string;
    name?: string;
    arguments?: string;
}

export interface ChatTextChunk {
    type: 'text';
    content: string;
}

export interface ChatToolCallChunk {
    type: 'tool-call';
    index: number;
    toolCall: ToolCallData;
}

export interface ChatToolCallStartChunk {
    type: 'tool-call-start';
    index: number;
}

export interface ChatToolCallEndChunk {
    type: 'tool-call-end';
    index: number;
}

export interface ChatToolResultChunk {
    type: 'tool-result';
    id: string;
    index: number;
    result: unknown;
    actions: ActionMessage[];
}

export interface ChatDoneChunk {
    type: 'done';
}

export type ToolChunk = ChatToolCallStartChunk | ChatToolCallChunk | ChatToolCallEndChunk;

export type ChatOutputChunk = ChatTextChunk | ToolChunk | ChatDoneChunk;

export type ChatChunk = ChatOutputChunk | ChatToolResultChunk;

export interface StartAgentTaskOptions {
    query: string;
    model: string;
}
