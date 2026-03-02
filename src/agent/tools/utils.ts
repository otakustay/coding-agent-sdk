import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import {parse} from 'yaml';
import type {ToolDefinition} from './interface.js';

interface ToolYml {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}

export async function loadDefinitionFromYaml(file: string): Promise<ToolDefinition> {
    const content = await fs.readFile(file, 'utf8');
    const yml = parse(content) as ToolYml;
    return {
        name: yml.name,
        description: yml.description,
        inputSchema: yml.parameters,
    };
}

export async function loadDefinitionFromYamlRelative(importMetaUrl: string): Promise<ToolDefinition> {
    const dir = path.dirname(url.fileURLToPath(importMetaUrl));
    return loadDefinitionFromYaml(path.join(dir, 'definition.yml'));
}
