import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {AgentLoop} from '../agent/loop/index.js';
import {renderInteractiveLoop} from './render.js';
import {
    defineReadTool,
    createReadImplement,
    defineWriteTool,
    createWriteImplement,
    defineListTool,
    createListImplement,
    defineEditTool,
    createEditImplement,
    defineBashTool,
    createBashImplement,
    defineGrepTool,
    createGrepImplement,
    defineGlobTool,
    createGlobImplement,
    defineAgentTool,
    createAgentImplement,
    defineTaskOutputTool,
    createTaskOutputImplement,
    defineTaskStopTool,
    createTaskStopImplement,
    defineTodoWriteTool,
    createTodoWriteImplement,
} from '../agent/tools/index.js';
import type {AgentConfig} from '../agent/tools/index.js';

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
            const readDefinition = await defineReadTool();
            const readImplement = await createReadImplement();
            agentLoop.registerTool(readDefinition, readImplement);

            const listDefinition = await defineListTool();
            const listImplement = await createListImplement();
            agentLoop.registerTool(listDefinition, listImplement);

            const globDefinition = await defineGlobTool();
            const globImplement = await createGlobImplement();
            agentLoop.registerTool(globDefinition, globImplement);

            const grepDefinition = await defineGrepTool();
            const grepImplement = await createGrepImplement();
            agentLoop.registerTool(grepDefinition, grepImplement);
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

            const readDefinition = await defineReadTool();
            const readImplement = await createReadImplement();
            agentLoop.registerTool(readDefinition, readImplement);

            const listDefinition = await defineListTool();
            const listImplement = await createListImplement();
            agentLoop.registerTool(listDefinition, listImplement);

            const globDefinition = await defineGlobTool();
            const globImplement = await createGlobImplement();
            agentLoop.registerTool(globDefinition, globImplement);

            const grepDefinition = await defineGrepTool();
            const grepImplement = await createGrepImplement();
            agentLoop.registerTool(grepDefinition, grepImplement);

            const bashDefinition = await defineBashTool();
            const bashImplement = await createBashImplement();
            agentLoop.registerTool(bashDefinition, bashImplement);
        },
    },
];

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
}

const agentLoop = new AgentLoop(apiKey, 'moonshotai/kimi-k2.5');

const systemPromptPath = fileURLToPath(new URL('system.txt', import.meta.url));
if (existsSync(systemPromptPath)) {
    const systemPromptContent = await fs.readFile(systemPromptPath, 'utf8');
    const systemPrompt = systemPromptContent.trim();
    if (systemPrompt) {
        agentLoop.setSystemPrompt(systemPrompt);
    }
}

const readDefinition = await defineReadTool();
const readImplement = await createReadImplement();
agentLoop.registerTool(readDefinition, readImplement);

const writeDefinition = await defineWriteTool();
const writeImplement = await createWriteImplement();
agentLoop.registerTool(writeDefinition, writeImplement);

const listDefinition = await defineListTool();
const listImplement = await createListImplement();
agentLoop.registerTool(listDefinition, listImplement);

const editDefinition = await defineEditTool();
const editImplement = await createEditImplement();
agentLoop.registerTool(editDefinition, editImplement);

const bashDefinition = await defineBashTool();
const bashImplement = await createBashImplement();
agentLoop.registerTool(bashDefinition, bashImplement);

const grepDefinition = await defineGrepTool();
const grepImplement = await createGrepImplement();
agentLoop.registerTool(grepDefinition, grepImplement);

const globDefinition = await defineGlobTool();
const globImplement = await createGlobImplement();
agentLoop.registerTool(globDefinition, globImplement);

const agentDefinition = await defineAgentTool(agentTypes);
const agentImplement = await createAgentImplement(agentTypes);
agentLoop.registerTool(agentDefinition, agentImplement);

const taskOutputDefinition = await defineTaskOutputTool();
const taskOutputImplement = await createTaskOutputImplement();
agentLoop.registerTool(taskOutputDefinition, taskOutputImplement);

const taskStopDefinition = await defineTaskStopTool();
const taskStopImplement = await createTaskStopImplement();
agentLoop.registerTool(taskStopDefinition, taskStopImplement);

const todoWriteDefinition = await defineTodoWriteTool();
const todoWriteImplement = await createTodoWriteImplement();
agentLoop.registerTool(todoWriteDefinition, todoWriteImplement);

await renderInteractiveLoop(agentLoop);
