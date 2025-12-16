import {existsSync} from 'node:fs';
import {stringifyError} from '../../utils/error.js';
import type {SandboxManager} from '../../sandbox/index.js';
import {ScriptExecutor} from './executor.js';
import type {EvaluateInput, EvaluateResult} from './interface.js';

export interface CreateEvaluateToolOptions {
    sandbox: SandboxManager;
}

async function resolveScriptPath(sandbox: SandboxManager, input: EvaluateInput): Promise<string> {
    if (input.code) {
        return sandbox.writeScript(
            input.name,
            input.code,
            {reusable: input.reusable, description: input.description}
        );
    }

    const scriptPath = sandbox.getScriptPath(input.name);
    if (!existsSync(scriptPath)) {
        throw new Error(`Reusable script "${input.name}" not found in sandbox`);
    }
    return scriptPath;
}

export function createEvaluateTool(options: CreateEvaluateToolOptions) {
    return async (input: EvaluateInput): Promise<EvaluateResult> => {
        const {sandbox} = options;
        const executor = new ScriptExecutor();

        try {
            if (input.dependencies && input.dependencies.length > 0) {
                await sandbox.installDependencies(input.dependencies);
            }

            const scriptPath = await resolveScriptPath(sandbox, input);
            const result = await executor.executeScript(scriptPath);

            return result;
        }
        catch (ex) {
            return {error: stringifyError(ex), actions: []};
        }
        finally {
            if (!input.reusable && input.code) {
                sandbox.cleanup(input.name).catch(() => {});
            }
        }
    };
}

export type {EvaluateInput, EvaluateResult, ActionMessage} from './interface.js';
