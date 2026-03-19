import {execa} from 'execa';
import dedent from 'dedent';
import stripAnsi from 'strip-ansi';
import {truncateText} from '../../../utils/string.js';
import type {FinishReason, ToolExecutionContext} from '../interface.js';
import {formatBashBackgroundNotification} from './utils.js';

export interface BashToolParameters {
    description: string;
    command: string;
    background?: boolean;
}

export class BashToolExecution {
    private static readonly MAX_LINE_LENGTH = 2000;
    private static readonly MAX_OUTPUT_LINES = 500;
    private readonly parameters: BashToolParameters;
    private readonly context: ToolExecutionContext;

    constructor(parameters: BashToolParameters, context: ToolExecutionContext) {
        this.parameters = parameters;
        this.context = context;
    }

    async run(): Promise<string> {
        const {command, background} = this.parameters;

        if (background) {
            const subprocess = execa(command, {shell: true, reject: false, all: true});
            const {pid} = subprocess;

            if (!pid) {
                throw new Error('Failed to start background process: PID unavailable');
            }

            subprocess.unref();

            const taskId = `bash_${pid}`;
            this.context.processes.set(
                taskId,
                {
                    status: 'running',
                    owner: this.context.workingAgentLoop,
                    output: '',
                    subprocess: subprocess as Promise<unknown> & {kill: () => void},
                }
            );

            subprocess.all?.on(
                'data',
                (chunk: Buffer) => {
                    const record = this.context.processes.get(taskId);
                    if (record) {
                        record.output += stripAnsi(chunk.toString());
                    }
                }
            );

            this.watchBackground(taskId, subprocess);

            return dedent`
                Command is running in the background.
                Task ID: ${taskId}

                Use the \`taskOutput\` tool with task ID to read the output at any time.
                Use the \`taskStop\` tool with task ID to stop the process. Do NOT use shell kill commands.
            `;
        }

        const result = await execa(command, {shell: true, reject: false, all: true});
        const {exitCode, all} = result;

        if (!all) {
            return dedent`
                Command executed successfully with no output.
                Exit code: ${exitCode}
            `;
        }

        const output = truncateText(
            stripAnsi(all),
            {
                maxCharactersPerLine: BashToolExecution.MAX_LINE_LENGTH,
                maxLines: BashToolExecution.MAX_OUTPUT_LINES,
                keep: 'tail',
                onTruncate: truncated =>
                    `(Output truncated, showing last ${truncated.split('\n').length} lines.)\n` + truncated,
            }
        );

        return dedent`
            Command executed successfully.
            Exit code: ${exitCode}
            Output:
            ${output}
        `;
    }

    private watchBackground(taskId: string, subprocess: Promise<{exitCode?: number | null}>): void {
        (async () => {
            try {
                const result = await subprocess;
                const record = this.context.processes.get(taskId);
                if (!record || record.status === 'finished') {
                    return;
                }
                const finishReason: FinishReason = result.exitCode === 0 ? 'success' : 'exception';
                const exitCode = result.exitCode ?? record.exitCode;
                this.context.processes.set(
                    taskId,
                    {
                        ...record,
                        status: 'finished',
                        finishReason,
                        ...(exitCode === undefined ? {} : {exitCode}),
                    }
                );
                record.owner.submitNotificationIfIdle(formatBashBackgroundNotification(taskId, finishReason));
            }
            catch {
                const record = this.context.processes.get(taskId);
                if (!record || record.status === 'finished') {
                    return;
                }
                this.context.processes.set(taskId, {...record, status: 'finished', finishReason: 'exception'});
                record.owner.submitNotificationIfIdle(formatBashBackgroundNotification(taskId, 'exception'));
            }
        })();
    }
}
