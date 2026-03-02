import type {ToolDefinition} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';

export interface ReadToolParameters {
    target_file: string;
    offset?: number;
    limit?: number;
}

export async function defineReadTool(): Promise<ToolDefinition> {
    return loadDefinitionFromYamlRelative(import.meta.url);
}
