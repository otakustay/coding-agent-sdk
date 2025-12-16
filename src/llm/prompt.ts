import dedent from 'dedent';
import type {TaskContext} from '../context/index.js';

export interface RenderSystemPromptOptions {
    context: TaskContext;
}

export function renderSystemPrompt(options: RenderSystemPromptOptions): string {
    const parts = [
        'You are a helpful coding agent, think deep, explore thorough, take care of environment correctness, speak less, do more, make things fully completed.',
    ];

    if (options.context.reusableScripts.length > 0) {
        parts.push(formatReusableScripts(options.context.reusableScripts));
    }

    return parts.join('\n\n');
}

function formatReusableScripts(scripts: Array<{name: string, description: string}>): string {
    const scriptTags = scripts.map(s =>
        `<reusable-script name="${s.name}">${s.description}</reusable-script>`
    ).join('\n');

    return dedent`
        ## Available Reusable Scripts

        ${scriptTags}

        These are reusable scripts that existed at the start of this conversation. Additionally, any scripts created during this task with \`reusable: true\` can also be invoked directly by name. When calling the evaluate tool, consider reusing these scripts by invoking them with appropriate arguments instead of writing new code from scratch.
    `;
}
