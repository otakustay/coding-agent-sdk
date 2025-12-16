import {scanReusableScripts} from './reusableScript.js';
import type {ReusableScript} from './reusableScript.js';
import type {SandboxManager} from '../sandbox/index.js';

export interface RetrieveContextOptions {
    sandbox: SandboxManager;
}

export interface TaskContext {
    reusableScripts: ReusableScript[];
}

export async function retrieveContext(options: RetrieveContextOptions): Promise<TaskContext> {
    const reusableScripts = await scanReusableScripts(options);
    return {reusableScripts};
}

export type {ReusableScript} from './reusableScript.js';