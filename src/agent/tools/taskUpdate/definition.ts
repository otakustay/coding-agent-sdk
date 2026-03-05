import type {ToolDefinition} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';

export interface TaskUpdateToolParameters {
    task_id: string;
    subject?: string;
    description?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'deleted';
    add_blocks?: string[];
    add_blocked_by?: string[];
    metadata?: Record<string, unknown | null>;
}

export async function defineTaskUpdateTool(): Promise<ToolDefinition> {
    return loadDefinitionFromYamlRelative(import.meta.url);
}
