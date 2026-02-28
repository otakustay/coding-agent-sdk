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
} from '../agent/tools/index.js';

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

const stream = agentLoop.submitUserQuery(
    '搜索下代码库中"bash"字样，分析下相关的逻辑'
);

await renderAgentLoop(stream);
