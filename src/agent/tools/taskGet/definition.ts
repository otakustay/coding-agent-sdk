import type {ToolDefinition} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';

export interface TaskGetToolParameters {
    task_id: string;
}

export async function defineTaskGetTool(): Promise<ToolDefinition> {
    return loadDefinitionFromYamlRelative(import.meta.url);
}
