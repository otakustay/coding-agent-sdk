import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import fs from 'node:fs/promises';
import {AgentLoop, toItemUpdateStream, createClient} from '../agent/index.js';
import {fromScriptDirectory} from '../utils/path.js';
import {defineReadTool, createReadImplement} from '../agent/tools/index.js';
import type {AgentWorkItem} from '../agent/loop/interface.js';

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

const stream = loop.submitUserQuery(argv.query);

interface WorkingState {
    items: AgentWorkItem[];
}
const state: WorkingState = {items: []};
for await (const update of toItemUpdateStream(stream)) {
    state.items = update(state.items);
}

console.log(JSON.stringify(state.items, null, 2));
