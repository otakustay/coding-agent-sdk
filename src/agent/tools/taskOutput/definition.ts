import type {ToolDefinition} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';

export interface TaskOutputToolParameters {
    task_id: string;
    offset?: number;
    limit?: number;
}

export async function defineTaskOutputTool(): Promise<ToolDefinition> {
    return loadDefinitionFromYamlRelative(import.meta.url);
}
