import type {Tool, ToolDefinition, ToolExecutionContext} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';
import {SkillToolExecution} from './execution.js';
import type {SkillConfig, SkillToolParameters} from './execution.js';

export type {SkillConfig, SkillToolParameters} from './execution.js';

export class SkillTool implements Tool<SkillToolParameters> {
    private readonly definition: ToolDefinition;
    private readonly skills: SkillConfig[];

    private constructor(definition: ToolDefinition, skills: SkillConfig[]) {
        this.definition = definition;
        this.skills = skills;
    }

    static async create(skills: SkillConfig[]): Promise<SkillTool> {
        const skillList = SkillTool.buildSkillList(skills);
        const definition = await loadDefinitionFromYamlRelative(import.meta.url);
        return new SkillTool(
            {...definition, description: definition.description.replaceAll('{{skillList}}', skillList)},
            skills
        );
    }

    private static buildSkillList(skills: SkillConfig[]): string {
        return skills
            .map(
                s => `  <skill>\n    <name>${s.name}</name>\n    <description>${s.description}</description>\n  </skill>`
            )
            .join('\n');
    }

    getName(): string {
        return this.definition.name;
    }

    getDescription(): string {
        return this.definition.description;
    }

    getInputSchema(): Record<string, unknown> {
        return this.definition.inputSchema;
    }

    execute(parameters: SkillToolParameters, _context: ToolExecutionContext): Promise<string> {
        return new SkillToolExecution(parameters, this.skills).run();
    }
}
