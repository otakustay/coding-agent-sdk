import type {ToolDefinition} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';

export interface ListToolParameters {
    target_directory: string;
    ignore_globs?: string[];
    depth?: number;
}

export async function defineListTool(): Promise<ToolDefinition> {
    return loadDefinitionFromYamlRelative(import.meta.url);
}
