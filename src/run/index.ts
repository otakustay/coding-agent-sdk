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
    defineTaskTool,
    createTaskImplement,
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

            // Register tools (excluding task to prevent nesting)
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

const taskDefinition = await defineTaskTool(agentTypes);
const taskImplement = await createTaskImplement(agentTypes);
agentLoop.registerTool(taskDefinition, taskImplement);

const taskOutputDefinition = await defineTaskOutputTool();
const taskOutputImplement = await createTaskOutputImplement();
agentLoop.registerTool(taskOutputDefinition, taskOutputImplement);

const stream = agentLoop.submitUserQuery(
    '启动2个background任务，每个任务每隔3s随机输出一串东西（独占一行），随后你每隔10s分别读取2个任务的最后输出并告诉我'
);

await renderAgentLoop(stream);
