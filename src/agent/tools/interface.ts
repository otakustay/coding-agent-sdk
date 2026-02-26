import type {z} from 'zod';
import type {AgentWorkItem} from '../loop/interface.js';

export interface ToolExecutionContext {
    historyItems: AgentWorkItem[];
    respondingModel: string;
}

export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: z.ZodObject<any>;
}

export type ToolImplementation<T = any> = (parameters: T, context: ToolExecutionContext) => Promise<string>;
