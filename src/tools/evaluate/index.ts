import {stringifyError} from '../../utils/error.js';
import {SandboxManager} from './sandbox.js';
import {ScriptExecutor} from './executor.js';
import type {EvaluateInput, EvaluateResult} from './interface.js';

export async function evaluate(input: EvaluateInput): Promise<EvaluateResult> {
    const sandbox = new SandboxManager();
    const executor = new ScriptExecutor();

    try {
        await sandbox.init();

        if (input.dependencies && input.dependencies.length > 0) {
            await sandbox.installDependencies(input.dependencies);
        }

        const scriptPath = await sandbox.writeScript(input.name, input.code);

        const result = await executor.executeScript(scriptPath);

        return result;
    }
    catch (ex) {
        return {error: stringifyError(ex)};
    }
    finally {
        sandbox.cleanup(input.name).catch(() => {});
    }
}

export type {EvaluateInput, EvaluateResult} from './interface.js';
