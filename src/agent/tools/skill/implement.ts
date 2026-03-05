import type {SkillConfig, SkillToolParameters} from './definition.js';
import type {ToolImplementation} from '../interface.js';

export async function createSkillImplement(skills: SkillConfig[]): Promise<ToolImplementation<SkillToolParameters>> {
    return async (parameters): Promise<string> => {
        const {skill: skillName} = parameters;

        const skill = skills.find(s => s.name === skillName);
        if (!skill) {
            const available = skills.map(s => s.name).join(', ');
            throw new Error(`Skill \`${skillName}\` not found. Available skills: ${available}`);
        }

        return `## Skill: ${skill.name}\n\n**Base directory**: ${skill.directory}\n\n${skill.content}`;
    };
}
