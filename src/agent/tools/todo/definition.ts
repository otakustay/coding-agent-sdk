import type {ToolDefinition} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';

export type TodoItemStatus = 'pending' | 'in_progress' | 'completed';

export interface TodoToolParameters {
    todos: Array<{
        content: string;
        status: TodoItemStatus;
    }>;
}

export async function defineTodoWriteTool(): Promise<ToolDefinition> {
    return loadDefinitionFromYamlRelative(import.meta.url);
}
