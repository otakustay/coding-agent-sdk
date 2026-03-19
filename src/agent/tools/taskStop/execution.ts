import timers from 'node:timers/promises';
import type {ToolExecutionContext} from '../interface.js';
import {getOrThrow} from '../../../utils/map.js';

const BASH_STOP_TIMEOUT_MS = 10_000;

const AGENT_STOP_TIMEOUT_MS = 60_000;

export interface TaskStopToolParameters {
    task_id: string;
}

export class TaskStopToolExecution {
    private readonly parameters: TaskStopToolParameters;
    private readonly context: ToolExecutionContext;

    constructor(parameters: TaskStopToolParameters, context: ToolExecutionContext) {
        this.parameters = parameters;
        this.context = context;
    }

    async run(): Promise<string> {
        const {task_id: taskId} = this.parameters;
        const {processes, subagents} = this.context;

        if (taskId.startsWith('agent_')) {
            if (!subagents.get(taskId)) {
                const availableIds = [...subagents.keys()].join(', ');
                if (availableIds) {
                    throw new Error(`task_id \`${taskId}\` not found, available task IDs: \`${availableIds}\``);
                }
                throw new Error('no background tasks exist');
            }
            return this.stopSubagent(taskId);
        }

        if (!processes.get(taskId)) {
            const availableIds = [...processes.keys()].join(', ');
            if (availableIds) {
                throw new Error(`task_id \`${taskId}\` not found, available task IDs: \`${availableIds}\``);
            }
            throw new Error('no background tasks exist');
        }
        return this.stopProcess(taskId);
    }

    private async abortSubagent(taskId: string): Promise<'done' | 'fail'> {
        const record = getOrThrow(this.context.subagents, taskId);
        try {
            await record.agent.abort();
            this.context.subagents.set(taskId, {...record, status: 'idle', finishReason: 'stop'});
            return 'done';
        }
        catch {
            return 'fail';
        }
    }

    private async stopSubagent(taskId: string): Promise<string> {
        const record = getOrThrow(this.context.subagents, taskId);
        if (record.status === 'idle') {
            return `Task \`${taskId}\` is already completed, nothing to stop.`;
        }

        const tasks = [
            this.abortSubagent(taskId),
            timers.setTimeout(AGENT_STOP_TIMEOUT_MS, 'timeout' as const, {ref: false}),
        ] as const;
        const winner = await Promise.race(tasks);

        if (winner === 'timeout') {
            return [
                `Stop signal sent to task \`${taskId}\`.`,
                `It has not exited within ${AGENT_STOP_TIMEOUT_MS / 1000}s — termination is still in progress.`,
                'Do not call taskStop again.',
            ]
                .join(' ');
        }

        if (winner === 'fail') {
            return [
                `Failed to abort task \`${taskId}\` due to an unexpected error.`,
                'This is not expected and further stop attempts are unlikely to succeed.',
                'You may still read the task output via taskOutput, but do not call taskStop again.',
            ]
                .join(' ');
        }

        return `Task \`${taskId}\` has been stopped.`;
    }

    private async stopProcess(taskId: string): Promise<string> {
        const record = getOrThrow(this.context.processes, taskId);
        if (record.status === 'finished') {
            return `Task \`${taskId}\` is already completed, nothing to stop.`;
        }

        this.context.processes.set(taskId, {...record, status: 'finished', finishReason: 'stop'});

        record.subprocess.kill();
        const tasks = [
            record.subprocess.then(() => 'done' as const, () => 'done' as const),
            timers.setTimeout(BASH_STOP_TIMEOUT_MS, 'timeout' as const, {ref: false}),
        ] as const;
        const winner = await Promise.race(tasks);

        if (winner === 'timeout') {
            const output = [
                `Stop signal sent to task \`${taskId}\`.`,
                `It has not exited within ${BASH_STOP_TIMEOUT_MS / 1000}s — termination is still in progress.`,
                'Do not call taskStop again.',
            ];
            return output.join(' ');
        }
        return `Task \`${taskId}\` has been stopped.`;
    }
}
