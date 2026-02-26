import {AgentLoop} from './agent/loop/index.js';
import type {AgentWorkItem} from './agent/loop/interface.js';
import {toItemUpdateStream} from './agent/index.js';
import {defineReadTool, createReadImplement} from './agent/tools/index.js';

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
}

const agentLoop = new AgentLoop(apiKey, 'moonshotai/kimi-k2.5');

// Register read tool
const readDefinition = await defineReadTool();
const readImplement = await createReadImplement();
agentLoop.registerTool(readDefinition, readImplement);

let items: AgentWorkItem[] = [];

const first = agentLoop.submitUserQuery(
    '请使用 read 工具读取 /Users/otakustay/Develop/coding-agent-sdk/package.json 文件'
);

for await (const update of toItemUpdateStream(first)) {
    items = update(items);
    console.log('Chunk:', items);
}
