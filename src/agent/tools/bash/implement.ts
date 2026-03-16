import {execa} from 'execa';
import dedent from 'dedent';
import stripAnsi from 'strip-ansi';
import {truncateText} from '../../../utils/string.js';
import type {FinishReason, ToolImplementation} from '../interface.js';
import type {BashToolParameters} from './definition.js';

const MAX_LINE_LENGTH = 2000;
const MAX_OUTPUT_LINES = 500;

function formatBashBackgroundNotification(taskId: string, finishReason: Exclude<FinishReason, 'stop'>): string {
    if (finishReason === 'success') {
        return dedent`
            Background task \`${taskId}\` has completed successfully.
            Use the \`taskOutput\` tool with task ID \`${taskId}\` to read the output.
        `;
    }
    return dedent`
        Background task \`${taskId}\` has terminated unexpectedly.
        Use the \`taskOutput\` tool with task ID \`${taskId}\` to read the output and check what went wrong.
    `;
}

export async function createBashImplement(): Promise<ToolImplementation<BashToolParameters>> {
    return async (parameters, context): Promise<string> => {
        const {command, background} = parameters;

        if (background) {
            const subprocess = execa(command, {shell: true, reject: false, all: true});
            const {pid} = subprocess;

            if (!pid) {
                throw new Error('Failed to start background process: PID unavailable');
            }

            subprocess.unref();

            const taskId = `bash_${pid}`;
            context.processes.set(
                taskId,
                {
                    status: 'running',
                    owner: context.workingAgentLoop,
                    output: '',
                    subprocess: subprocess as Promise<unknown> & {kill: () => void},
                }
            );

            subprocess.all?.on(
                'data',
                (chunk: Buffer) => {
                    const record = context.processes.get(taskId);
                    if (record) {
                        record.output += stripAnsi(chunk.toString());
                    }
                }
            );

            (async () => {
                try {
                    const result = await subprocess;
                    const record = context.processes.get(taskId);
                    if (!record || record.status === 'finished') {
                        return;
                    }
                    const finishReason: FinishReason = result.exitCode === 0 ? 'success' : 'exception';
                    const exitCode = result.exitCode ?? record.exitCode;
                    context.processes.set(
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
                    const record = context.processes.get(taskId);
                    if (!record || record.status === 'finished') {
                        return;
                    }
                    context.processes.set(taskId, {...record, status: 'finished', finishReason: 'exception'});
                    const notificationQuery = formatBashBackgroundNotification(taskId, 'exception');
                    record.owner.submitNotificationIfIdle(notificationQuery);
                }
            })();

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
                maxCharactersPerLine: MAX_LINE_LENGTH,
                maxLines: MAX_OUTPUT_LINES,
                from: 'tail',
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
    };
}
