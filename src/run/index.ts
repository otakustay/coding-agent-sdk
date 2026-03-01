import {AgentLoop} from '../agent/loop/index.js';
import {renderAgentLoop} from './render.js';
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
            + '- The command is known to produce verbose or noisy output (e.g., npm install, docker logs, test runners, build output) and you only need the meaningful parts\n'
            + '- The task requires running multiple commands whose results need to be aggregated or cross-referenced to produce a single answer\n'
            + '- The output needs interpretation, error diagnosis, or contextual analysis rather than raw display\n\n'
            + 'Unlike the bash tool which runs a single command and returns raw output verbatim, this agent can run multiple commands across turns, read files, search with glob/grep, filter out noise, and return only the meaningful findings as a clean summary.',
        setup: async agentLoop => {
            agentLoop.setSystemPrompt(
                'You are a Bash agent. Your goal is to run commands, analyze their output, and synthesize the results into a concise, accurate answer. '
                    + 'Filter out noise from verbose or complex output, interpret error messages, and extract only what is meaningful. '
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

const agentDefinition = defineAgentTool(agentTypes);
const agentImplement = await createAgentImplement(agentTypes);
agentLoop.registerTool(agentDefinition, agentImplement);

const taskOutputDefinition = await defineTaskOutputTool();
const taskOutputImplement = await createTaskOutputImplement();
agentLoop.registerTool(taskOutputDefinition, taskOutputImplement);

const stream = agentLoop.submitUserQuery(
    '用npm命令行找一些react相关的组件库的说明，给我推荐几个，注意npm命令的输出通常会很冗余'
);

await renderAgentLoop(stream);
