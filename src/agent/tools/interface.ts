import type {z} from 'zod';
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
    subtasks: Map<string, AgentLoop>;
    processes: Map<string, ProcessRecord>;
}

export interface ToolDefinition<P = unknown> {
    name: string;
    description: string;
    inputSchema: z.ZodType<P>;
}

export type ToolImplementation<T = unknown> = (parameters: T, context: ToolExecutionContext) => Promise<string>;
