import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import fs from 'node:fs/promises';
import {
    AgentLoop,
    toItemUpdateStream,
    createClient,
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
    AgentsMdProvider,
    WorkspaceEnvProvider,
    GitStatusProvider,
} from '../agent/index.js';
import type {AgentWorkItem, AgentConfig, AgentWorkItemUsage} from '../agent/index.js';
import {fromScriptDirectory} from '../utils/path.js';

const agentTypes: AgentConfig[] = [
    {
        name: 'Explore',
        description:
            'Fast agent specialized for exploring codebases. Use this when you need to quickly find files with natural language query, search code of a certain function module with keywords, or answer questions about the codebase (eg. "how do API endpoints work?").',
        setup: async agentLoop => {
            agentLoop.setSystemPrompt(
                'You are an Explore agent specialized for fast codebase exploration. Focus on finding files, searching code, and answering questions about how the codebase works. Be concise and efficient in your exploration.'
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

const argv = await yargs(hideBin(process.argv))
    .option('query', {type: 'string', demandOption: true, description: 'User query to submit'})
    .option('model', {type: 'string', demandOption: true, description: 'Model name to use'})
    .parse();

const clientOptions = {
    provider: process.env.MODEL_PROVIDER,
    apiKey: process.env.MODEL_API_KEY,
    baseURL: process.env.MODEL_API_ENDPOINT,
};
const client = createClient(clientOptions);
const loop = new AgentLoop(client, argv.model);

const systemPromptBase = await fs.readFile(fromScriptDirectory(import.meta.url, 'system.txt'), 'utf8');
loop.setSystemPrompt(`${systemPromptBase.trim()}\nThe current working directory is: ${process.cwd()}`);

const readDef = await defineReadTool();
const readImpl = await createReadImplement();
loop.registerTool(readDef, readImpl);

const writeDef = await defineWriteTool();
const writeImpl = await createWriteImplement();
loop.registerTool(writeDef, writeImpl);

const listDef = await defineListTool();
const listImpl = await createListImplement();
loop.registerTool(listDef, listImpl);

const editDef = await defineEditTool();
const editImpl = await createEditImplement();
loop.registerTool(editDef, editImpl);

const bashDef = await defineBashTool();
const bashImpl = await createBashImplement();
loop.registerTool(bashDef, bashImpl);

const grepDef = await defineGrepTool();
const grepImpl = await createGrepImplement();
loop.registerTool(grepDef, grepImpl);

const globDef = await defineGlobTool();
const globImpl = await createGlobImplement();
loop.registerTool(globDef, globImpl);

const agentDef = await defineAgentTool(agentTypes);
const agentImpl = await createAgentImplement(agentTypes);
loop.registerTool(agentDef, agentImpl);

const taskOutputDef = await defineTaskOutputTool();
const taskOutputImpl = await createTaskOutputImplement();
loop.registerTool(taskOutputDef, taskOutputImpl);

const taskStopDef = await defineTaskStopTool();
const taskStopImpl = await createTaskStopImplement();
loop.registerTool(taskStopDef, taskStopImpl);

const todoWriteDef = await defineTodoWriteTool();
const todoWriteImpl = await createTodoWriteImplement();
loop.registerTool(todoWriteDef, todoWriteImpl);

loop.registerQueryContextProvider(new WorkspaceEnvProvider());
loop.registerQueryContextProvider(new GitStatusProvider());
loop.registerQueryContextProvider(new AgentsMdProvider());

const stream = loop.submitUserQuery(argv.query);

interface WorkingState {
    items: AgentWorkItem[];
}
const state: WorkingState = {items: []};
for await (const update of toItemUpdateStream(stream)) {
    state.items = update(state.items);
}

console.log(JSON.stringify(state.items, null, 2));

const usageItem = state.items.findLast((v: AgentWorkItem): v is AgentWorkItemUsage => v.type === 'usage');
if (usageItem) {
    const {usage} = usageItem;
    const parts: string[] = [];
    if (usage.inputTokens > 0) {
        parts.push(`I/${usage.inputTokens}`);
    }
    if (usage.outputTokens > 0) {
        parts.push(`O/${usage.outputTokens}`);
    }
    if (usage.cacheReadTokens > 0) {
        parts.push(`R/${usage.cacheReadTokens}`);
    }
    if (usage.cacheWriteTokens > 0) {
        parts.push(`W/${usage.cacheWriteTokens}`);
    }
    if (parts.length > 0) {
        console.error(`\nTokens: ${parts.join('  ')}`);
    }
}
