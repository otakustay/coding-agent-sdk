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

// Stream events - Delta events for incremental updates
export interface WorkItemReasoningDelta {
    type: 'reasoning.delta';
    id: string;
    contentDelta?: string;
    summaryDelta?: string;
}

export interface WorkItemTextDelta {
    type: 'text.delta';
    id: string;
    contentDelta: string;
}

export interface WorkItemToolCallDelta {
    type: 'toolCall.delta';
    id: string;
    argumentsDelta: string;
}

// Stream events - Added events with minimal properties
export interface WorkItemReasoningAdded {
    type: 'reasoning.added';
    id: string;
}

export interface WorkItemTextAdded {
    type: 'text.added';
    id: string;
}

export interface WorkItemToolCallAdded {
    type: 'toolCall.added';
    id: string;
    callId: string;
    name: string;
}

// Stream events - Done events
export interface WorkItemReasoningDone {
    type: 'reasoning.done';
    id: string;
}

export interface WorkItemTextDone {
    type: 'text.done';
    id: string;
}

export interface WorkItemToolCallDone {
    type: 'toolCall.done';
    id: string;
}

// Unified stream event type
export type WorkItemStreamEvent =
    | WorkItemReasoningAdded
    | WorkItemTextAdded
    | WorkItemToolCallAdded
    | WorkItemReasoningDelta
    | WorkItemTextDelta
    | WorkItemToolCallDelta
    | WorkItemReasoningDone
    | WorkItemTextDone
    | WorkItemToolCallDone;
