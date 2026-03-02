import type {ToolDefinition} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';

export interface EditToolParameters {
    file_path: string;
    old_string: string;
    new_string: string;
    replace_all?: boolean;
}

export async function defineEditTool(): Promise<ToolDefinition> {
    return loadDefinitionFromYamlRelative(import.meta.url);
}
