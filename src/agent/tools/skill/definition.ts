import type {ToolDefinition} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';

export interface SkillConfig {
    name: string;
    description: string;
    content: string;
    directory: string;
}

export interface SkillToolParameters {
    skill: string;
    args?: string;
}

function buildSkillList(skills: SkillConfig[]): string {
    return skills
        .map(s => `  <skill>\n    <name>${s.name}</name>\n    <description>${s.description}</description>\n  </skill>`)
        .join('\n');
}

export async function defineSkillTool(skills: SkillConfig[]): Promise<ToolDefinition> {
    const skillList = buildSkillList(skills);
    const definition = await loadDefinitionFromYamlRelative(import.meta.url);
    return {
        ...definition,
        description: definition.description.replaceAll('{{skillList}}', skillList),
    };
}
