import type {AgentWorkItem} from '../loop/interface.js';
import type {AgentLoop} from '../loop/index.js';

export interface ProcessRecord {
    status: 'running' | 'completed';
    exitCode?: number;
    output: string;
    subprocess: Promise<unknown> & {kill: () => void};
}

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
    subagents: Map<string, AgentLoop>;
    processes: Map<string, ProcessRecord>;
    tasks: Map<string, TaskRecord>;
}

export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

export type ToolImplementation<T = unknown> = (parameters: T, context: ToolExecutionContext) => Promise<string>;
