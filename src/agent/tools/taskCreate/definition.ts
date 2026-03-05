import type {ToolDefinition} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';

export interface TaskCreateToolParameters {
    subject: string;
    description: string;
    metadata?: Record<string, unknown>;
}

export async function defineTaskCreateTool(): Promise<ToolDefinition> {
    return loadDefinitionFromYamlRelative(import.meta.url);
}
