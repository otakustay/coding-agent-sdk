import type {ToolDefinition} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';

export interface GrepToolParameters {
    pattern: string;
    path?: string;
    glob?: string;
    output_mode?: 'content' | 'files_with_matches' | 'count';
    '-B'?: number;
    '-A'?: number;
    '-C'?: number;
    '-n'?: boolean;
    '-i'?: boolean;
    type?: string;
    head_limit?: number;
    offset?: number;
    multiline?: boolean;
}

export async function defineGrepTool(): Promise<ToolDefinition> {
    return loadDefinitionFromYamlRelative(import.meta.url);
}
