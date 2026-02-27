import {AgentLoop} from './agent/loop/index.js';
import type {AgentWorkItem} from './agent/loop/interface.js';
import {toItemUpdateStream} from './agent/index.js';
import {
    defineReadTool,
    createReadImplement,
    defineWriteTool,
    createWriteImplement,
    defineListTool,
    createListImplement,
} from './agent/tools/index.js';

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

interface LoopState {
    items: AgentWorkItem[];
}
const state: LoopState = {
    items: [],
};

const first = agentLoop.submitUserQuery(
    '检查一下我有哪些util函数'
);

for await (const update of toItemUpdateStream(first)) {
    state.items = update(state.items);
    console.log('Chunk:', state.items);
}
