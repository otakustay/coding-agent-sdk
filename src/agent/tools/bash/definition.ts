import type {ToolDefinition} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';

export interface BashToolParameters {
    description: string;
    command: string;
    background?: boolean;
}

export async function defineBashTool(): Promise<ToolDefinition> {
    return loadDefinitionFromYamlRelative(import.meta.url);
}
