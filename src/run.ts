import {AgentLoop} from './agent/loop/index.js';
import type {AgentWorkItem} from './agent/loop/interface.js';
import {toItemUpdateStream} from './agent/index.js';

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
}

interface State {
    items: AgentWorkItem[];
}

const state: State = {items: []};

function setState(update: (items: AgentWorkItem[]) => AgentWorkItem[]) {
    state.items = update(state.items);
}

const agentLoop = new AgentLoop(apiKey, 'moonshotai/kimi-k2.5');

const first = agentLoop.submitUserQuery('Hello, how are you?');

for await (const update of toItemUpdateStream(first)) {
    setState(update);
    console.log('Current items:', JSON.stringify(state.items, null, 2));
}

const second = agentLoop.submitUserQuery('What is the weather like in Seattle?');

for await (const update of toItemUpdateStream(second)) {
    setState(update);
    console.log('Current items:', JSON.stringify(state.items, null, 2));
}
