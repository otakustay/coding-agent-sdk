import {execa} from 'execa';
import crypto from 'node:crypto';
import type {ActionStartMessage, ActionEndMessage, ExecMessageArgs} from './interface.js';

/**
 * Result of executing a command
 */
export interface ExecResult {
    /** Exit code of the command */
    exitCode: number;
    /** Standard output of the command */
    output: string;
    /** Standard error of the command */
    error: string;
}

/**
 * Input parameters for the exec function
 */
export interface ExecInput {
    /** Working directory for the command (optional) */
    cwd?: string;
    /** Command to execute */
    command: string;
    /** Command arguments (optional) */
    args?: string[];
}

/**
 * Execute a shell command
 * @param options - Execution options
 * @returns Promise that resolves to execution result
 */
export async function exec({cwd, command, args = []}: ExecInput): Promise<ExecResult> {
    const uuid = crypto.randomUUID();

    const startMessage: ActionStartMessage<ExecMessageArgs> = {
        type: 'actionStart',
        uuid,
        name: 'exec',
        args: {
            cwd,
            command,
            argsCount: args.length,
        },
    };
    process.send?.(startMessage);

    try {
        const options: any = {reject: false};
        if (cwd) {
            options.cwd = cwd;
        }
        const result = await execa(command, args, options);

        const endMessage: ActionEndMessage = {
            type: 'actionEnd',
            uuid,
            result: 'success',
        };
        process.send?.(endMessage);

        return {
            exitCode: result.exitCode ?? 0,
            output: result.stdout || '',
            error: result.stderr || '',
        };
    }
    catch (ex) {
        const endMessage: ActionEndMessage = {
            type: 'actionEnd',
            uuid,
            result: 'error',
        };
        process.send?.(endMessage);

        return {
            exitCode: 1,
            output: '',
            error: ex instanceof Error ? ex.message : String(ex),
        };
    }
}
