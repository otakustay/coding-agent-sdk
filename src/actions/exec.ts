import {execa} from 'execa';

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
    try {
        const options: any = {reject: false};
        if (cwd) {
            options.cwd = cwd;
        }
        const result = await execa(command, args, options);
        return {
            exitCode: result.exitCode ?? 0,
            output: result.stdout || '',
            error: result.stderr || '',
        };
    }
    catch (ex) {
        return {
            exitCode: 1,
            output: '',
            error: ex instanceof Error ? ex.message : String(ex),
        };
    }
}
