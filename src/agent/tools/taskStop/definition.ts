import type {ToolDefinition} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';

export interface TaskStopToolParameters {
    task_id: string;
}

export async function defineTaskStopTool(): Promise<ToolDefinition> {
    return loadDefinitionFromYamlRelative(import.meta.url);
}
