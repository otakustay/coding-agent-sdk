import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {parse} from 'yaml';
import {
    AgentLoop,
    createClient,
    ReadTool,
    WriteTool,
    ListTool,
    EditTool,
    BashTool,
    GrepTool,
    GlobTool,
    AgentTool,
    TaskOutputTool,
    TaskStopTool,
    TodoWriteTool,
    SkillTool,
    AgentsMdProvider,
    WorkspaceEnvProvider,
    GitStatusProvider,
} from '../agent/index.js';
import type {AgentConfig, SkillConfig, ModelProvider} from '../agent/index.js';
import {renderInteractiveLoop} from './render.js';

function parseSkillFile(fileContent: string, directory: string): SkillConfig | null {
    if (!fileContent.startsWith('---\n')) {
        return null;
    }
    const rest = fileContent.slice(4);
    const sepIdx = rest.indexOf('\n---\n');
    if (sepIdx === -1) {
        return null;
    }
    const frontmatterStr = rest.slice(0, sepIdx);
    const body = rest.slice(sepIdx + 5).trim();
    const frontmatter = parse(frontmatterStr) as {name?: string, description?: string};
    if (!frontmatter.name || !frontmatter.description) {
        return null;
    }
    return {
        name: frontmatter.name,
        description: frontmatter.description,
        content: body,
        directory,
    };
}

async function loadSkillConfigs(): Promise<SkillConfig[]> {
    const skillsDir = path.join(process.cwd(), '.comate', 'skills');
    if (!existsSync(skillsDir)) {
        return [];
    }
    const entries = await fs.readdir(skillsDir, {withFileTypes: true});
    const skills: SkillConfig[] = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }
        const skillDir = path.join(skillsDir, entry.name);
        const skillFile = path.join(skillDir, 'SKILL.md');
        if (!existsSync(skillFile)) {
            continue;
        }
        const content = await fs.readFile(skillFile, 'utf8');
        const skill = parseSkillFile(content, skillDir);
        if (skill) {
            skills.push(skill);
        }
    }
    return skills;
}

const agentTypes: AgentConfig[] = [
    {
        name: 'Explore',
        description:
            'Fast agent specialized for exploring codebases. Use this when you need to quickly find files with natural language query, search code of a certain function module with keywords, or answer questions about the codebase (eg. "how do API endpoints work?").',
        setup: async agentLoop => {
            agentLoop.setSystemPrompt(
                'You are an Explore agent specialized for fast codebase exploration. Focus on finding files, searching code, and answering questions about how the codebase works. Be concise and efficient in your exploration.'
            );

            // Register tools (excluding agent to prevent nesting)
            agentLoop.registerTool(await ReadTool.create());
            agentLoop.registerTool(await ListTool.create());
            agentLoop.registerTool(await GlobTool.create());
            agentLoop.registerTool(await GrepTool.create());
        },
    },
    {
        name: 'Bash',
        description: 'Agent specialized for executing shell commands and summarizing results. '
            + 'Use this agent (instead of the bash tool) when any of these apply:\n'
            + '- The command produces verbose or noisy output (e.g., npm search, npm install, docker logs, test runners, build output) and you only need the meaningful parts extracted\n'
            + '- The task requires running multiple commands (e.g., search then view details) whose results need aggregation into a single answer\n'
            + '- The output needs interpretation, error diagnosis, or contextual analysis rather than raw display\n\n'
            + 'When NOT to use:\n'
            + '- For single simple commands (e.g., git status, mkdir, cd) - use the bash tool instead\n'
            + '- When you already know the exact file path - use read/write/edit tools instead\n\n'
            + 'Unlike the bash tool which runs a single command and returns raw output verbatim, this agent runs multiple commands across turns, filters out noise, and returns only meaningful findings as a clean summary.',
        setup: async agentLoop => {
            agentLoop.setSystemPrompt(
                'You are a Bash agent. Run shell commands, analyze their output, and synthesize results into a concise, accurate answer. '
                    + 'Filter out noise from verbose output (progress bars, timestamps, redundant logs). '
                    + 'Interpret error messages and extract only what is meaningful. '
                    + 'If multiple commands are needed, run them sequentially and aggregate the results. '
                    + 'Return what you found — no need to explain why it answers the query.'
            );

            agentLoop.registerTool(await ReadTool.create());
            agentLoop.registerTool(await ListTool.create());
            agentLoop.registerTool(await GlobTool.create());
            agentLoop.registerTool(await GrepTool.create());
            agentLoop.registerTool(await BashTool.create());
        },
    },
];

const argv = await yargs(hideBin(process.argv))
    .option('model', {type: 'string', demandOption: true, description: 'Model name to use'})
    .parse();

const clientOptions = {
    provider: process.env.MODEL_PROVIDER as ModelProvider | undefined,
    apiKey: process.env.MODEL_API_KEY,
    baseURL: process.env.MODEL_API_ENDPOINT,
};
const client = createClient(clientOptions);
const agentLoop = new AgentLoop(client, argv.model);

const systemPromptPath = fileURLToPath(new URL('system.txt', import.meta.url));
if (existsSync(systemPromptPath)) {
    const systemPromptContent = await fs.readFile(systemPromptPath, 'utf8');
    const systemPrompt = systemPromptContent.trim();
    if (systemPrompt) {
        agentLoop.setSystemPrompt(systemPrompt);
    }
}

agentLoop.registerTool(await ReadTool.create());
agentLoop.registerTool(await WriteTool.create());
agentLoop.registerTool(await ListTool.create());
agentLoop.registerTool(await EditTool.create());
agentLoop.registerTool(await BashTool.create());
agentLoop.registerTool(await GrepTool.create());
agentLoop.registerTool(await GlobTool.create());
agentLoop.registerTool(await AgentTool.create(agentTypes));

agentLoop.registerTool(await TaskOutputTool.create());

agentLoop.registerTool(await TaskStopTool.create());
agentLoop.registerTool(await TodoWriteTool.create());

const skillConfigs = await loadSkillConfigs();
agentLoop.registerTool(await SkillTool.create(skillConfigs));

agentLoop.registerQueryContextProvider(new WorkspaceEnvProvider());
agentLoop.registerQueryContextProvider(new GitStatusProvider());
agentLoop.registerQueryContextProvider(new AgentsMdProvider());

await renderInteractiveLoop(agentLoop);
