import {AgentLoop} from './agent/loop/index.js';
import type {AgentWorkItem} from './agent/loop/interface.js';
import {toItemUpdateStream} from './agent/index.js';
import {defineReadTool, createReadImplement, defineWriteTool, createWriteImplement} from './agent/tools/index.js';

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

interface LoopState {
    items: AgentWorkItem[];
}
const state: LoopState = {
    items: [],
};

const first = agentLoop.submitUserQuery(
    '请使用 write 工具将内容 "hello from agent" 写入 /tmp/agent-test.txt 文件'
);

for await (const update of toItemUpdateStream(first)) {
    state.items = update(state.items);
    console.log('Chunk:', state.items);
}
