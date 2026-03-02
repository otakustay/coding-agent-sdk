import type {AgentWorkItem} from '../loop/interface.js';
import type {AgentLoop} from '../loop/index.js';

export interface ProcessRecord {
    status: 'running' | 'completed';
    exitCode?: number;
    output: string;
}

export interface ToolExecutionContext {
    historyItems: AgentWorkItem[];
    respondingModel: string;
    workingAgentLoop: AgentLoop;
    subagents: Map<string, AgentLoop>;
    processes: Map<string, ProcessRecord>;
}

export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

export type ToolImplementation<T = unknown> = (parameters: T, context: ToolExecutionContext) => Promise<string>;
