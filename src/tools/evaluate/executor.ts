import path from 'node:path';
import url from 'node:url';
import {execa} from 'execa';
import type {ExecuteResult} from './interface.js';
import type {ActionStartMessage, ActionEndMessage} from '../../actions/index.js';

type ActionMessage = ActionStartMessage<any> | ActionEndMessage;

export class ScriptExecutor {
    private getLoaderPath(): string {
        const currentFile = url.fileURLToPath(import.meta.url);
        return path.resolve(path.dirname(currentFile), 'loader.js');
    }

    async executeScript(scriptPath: string): Promise<ExecuteResult> {
        const loaderPath = this.getLoaderPath();
        const actions: ActionMessage[] = [];

        const childProcess = execa(
            'node',
            ['--import', loaderPath, scriptPath],
            {
                reject: false,
                ipc: true,
            }
        );

        childProcess.on(
            'message',
            (message: unknown) => {
                actions.push(message as ActionMessage);
            }
        );

        const result = await childProcess;

        return {
            exitCode: result.exitCode ?? 0,
            output: result.stdout || '',
            error: result.stderr || undefined,
            actions,
        };
    }
}
