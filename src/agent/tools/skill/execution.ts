export interface SkillConfig {
    name: string;
    description: string;
    content: string;
    directory: string;
}

export interface SkillToolParameters {
    skill: string;
}

export class SkillToolExecution {
    constructor(private readonly parameters: SkillToolParameters, private readonly skills: SkillConfig[]) {}

    run(): Promise<string> {
        const {skill: skillName} = this.parameters;

        const skill = this.skills.find(s => s.name === skillName);
        if (!skill) {
            const available = this.skills.map(s => s.name).join(', ');
            throw new Error(`Skill \`${skillName}\` not found. Available skills: ${available}`);
        }

        return Promise.resolve(
            `## Skill: ${skill.name}\n\n**Base directory**: ${skill.directory}\n\n${skill.content}`
        );
    }
}
