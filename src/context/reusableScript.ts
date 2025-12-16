import type {SandboxManager} from '../sandbox/index.js';

export interface ReusableScript {
    name: string;
    description: string;
}

export interface ScanReusableScriptsOptions {
    sandbox: SandboxManager;
}

export async function scanReusableScripts(options: ScanReusableScriptsOptions): Promise<ReusableScript[]> {
    const scripts = await options.sandbox.listScripts();
    return scripts;
}