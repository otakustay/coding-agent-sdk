import path from 'node:path';
import url from 'node:url';
import {execa} from 'execa';
import type {ExecuteResult} from './interface.js';

export class ScriptExecutor {
    private getLoaderPath(): string {
        const currentFile = url.fileURLToPath(import.meta.url);
        return path.resolve(path.dirname(currentFile), 'loader.js');
    }

    async executeScript(scriptPath: string): Promise<ExecuteResult> {
        const loaderPath = this.getLoaderPath();

        const result = await execa(
            'node',
            ['--import', loaderPath, scriptPath],
            {reject: false}
        );

        return {
            exitCode: result.exitCode ?? 0,
            output: result.stdout || '',
            error: result.stderr || undefined,
        };
    }
}
