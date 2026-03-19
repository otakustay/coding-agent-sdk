import type {AgentWorkItem} from '../loop/interface.js';
import type {AgentLoop} from '../loop/index.js';

export type FinishReason = 'success' | 'exception' | 'stop';

export interface ProcessRunningRecord {
    status: 'running';
    owner: AgentLoop;
    output: string;
    subprocess: Promise<unknown> & {kill: () => void};
    exitCode?: number;
}

export interface ProcessFinishedRecord {
    status: 'finished';
    finishReason: FinishReason;
    owner: AgentLoop;
    output: string;
    subprocess: Promise<unknown> & {kill: () => void};
    exitCode?: number;
}

export type ProcessRecord = ProcessRunningRecord | ProcessFinishedRecord;

export interface SubagentRunningRecord {
    status: 'running';
    owner: AgentLoop;
    agent: AgentLoop;
}

export interface SubagentFinishedRecord {
    status: 'idle';
    finishReason: FinishReason;
    owner: AgentLoop;
    agent: AgentLoop;
}

export type SubagentRecord = SubagentRunningRecord | SubagentFinishedRecord;

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deleted';

export interface TaskRecord {
    id: string;
    subject: string;
    description: string;
    status: TaskStatus;
    blocks: string[];
    blockedBy: string[];
    metadata: Record<string, unknown>;
}

export interface ToolExecutionContext {
    historyItems: AgentWorkItem[];
    respondingModel: string;
    workingAgentLoop: AgentLoop;
    subagents: Map<string, SubagentRecord>;
    processes: Map<string, ProcessRecord>;
    tasks: Map<string, TaskRecord>;
}

export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

export interface Tool<T = unknown> {
    getName(): string;
    getDescription(): string;
    getInputSchema(): Record<string, unknown>;
    execute(parameters: T, context: ToolExecutionContext): Promise<string>;
}
