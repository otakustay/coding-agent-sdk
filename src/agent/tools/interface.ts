import type {z} from 'zod';

export interface ToolExecutionContext {
    id?: string;
}

export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: z.ZodObject<any>;
}

export type ToolImplementation<T = any> = (parameters: T, context: ToolExecutionContext) => Promise<string>;
