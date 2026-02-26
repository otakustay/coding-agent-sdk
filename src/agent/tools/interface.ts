import type {z} from 'zod';
import type {AgentWorkItem} from '../loop/interface.js';

export interface ToolExecutionContext {
    historyItems: AgentWorkItem[];
    respondingModel: string;
}

export interface ToolDefinition<P = unknown> {
    name: string;
    description: string;
    inputSchema: z.ZodType<P>;
}

export type ToolImplementation<T = unknown> = (parameters: T, context: ToolExecutionContext) => Promise<string>;
