export interface AgentWorkItemOutputBase {
    id: string;
    status: 'open' | 'completed';
}

export interface AgentWorkItemSystemInput {
    type: 'input.system';
    content: string;
}

export interface AgentWorkItemUserInputContentPart {
    type: 'text';
    content: string;
}

export interface AgentWorkItemUserInput {
    type: 'input.user';
    content: AgentWorkItemUserInputContentPart[];
}

export interface AgentWorkItemReasoningOutput extends AgentWorkItemOutputBase {
    type: 'output.reasoning';
    content: string;
    summary: string;
}

export interface AgentWorkItemReasoningSummaryOutput extends AgentWorkItemOutputBase {
    type: 'output.reasoningSummary';
    content: string;
}

export interface AgentWorkItemTextOutput extends AgentWorkItemOutputBase {
    type: 'output.text';
    content: string;
}

export interface AgentWorkItemToolCallOutput extends AgentWorkItemOutputBase {
    type: 'output.toolCall';
    callId: string;
    name: string;
    arguments: string;
}

export interface AgentWorkItemToolResultInput {
    type: 'input.toolResult';
    callId: string;
    content: string;
}

export type AgentWorkItem =
    | AgentWorkItemSystemInput
    | AgentWorkItemUserInput
    | AgentWorkItemReasoningOutput
    | AgentWorkItemReasoningSummaryOutput
    | AgentWorkItemTextOutput
    | AgentWorkItemToolCallOutput
    | AgentWorkItemToolResultInput;

export type StreamItemStatus = 'open' | 'completed';

export interface StreamChunkBase {
    id: string;
    status: StreamItemStatus;
}

export interface ReasoningStreamChunk extends StreamChunkBase {
    type: 'output.reasoning';
    content?: string;
    summary?: string;
}

export interface TextStreamChunk extends StreamChunkBase {
    type: 'output.text';
    content?: string;
}

export interface ToolCallStreamChunk extends StreamChunkBase {
    type: 'output.toolCall';
    callId?: string;
    name?: string;
    arguments?: string;
}

export interface ToolResultStreamChunk {
    type: 'input.toolResult';
    id: string;
    status: 'completed';
    callId: string;
    content: string;
}

export type StreamChunk =
    | ReasoningStreamChunk
    | TextStreamChunk
    | ToolCallStreamChunk
    | ToolResultStreamChunk;
