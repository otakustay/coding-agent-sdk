import timers from 'node:timers/promises';
import type {ProcessRecord, SubagentRecord, ToolImplementation} from '../interface.js';
import type {TaskStopToolParameters} from './definition.js';
import {getOrThrow} from '../../../utils/map.js';

const BASH_STOP_TIMEOUT_MS = 10_000;

const AGENT_STOP_TIMEOUT_MS = 60_000;

async function abortSubagent(taskId: string, subagents: Map<string, SubagentRecord>): Promise<'done' | 'fail'> {
    const record = getOrThrow(subagents, taskId);
    try {
        await record.agent.abort();
        subagents.set(taskId, {...record, status: 'idle', finishReason: 'stop'});
        return 'done';
    }
    catch {
        return 'fail';
    }
}

async function stopSubagent(taskId: string, subagents: Map<string, SubagentRecord>): Promise<string> {
    const record = getOrThrow(subagents, taskId);
    if (record.status === 'idle') {
        return `Task \`${taskId}\` is already completed, nothing to stop.`;
    }

    const tasks = [
        abortSubagent(taskId, subagents),
        timers.setTimeout(AGENT_STOP_TIMEOUT_MS, 'timeout' as const, {ref: false}),
    ] as const;
    const winner = await Promise.race(tasks);

    if (winner === 'timeout') {
        const result = [
            `Stop signal sent to task \`${taskId}\`.`,
            `It has not exited within ${AGENT_STOP_TIMEOUT_MS / 1000}s — termination is still in progress.`,
            'Do not call taskStop again.',
        ];
        return result.join(' ');
    }

    if (winner === 'fail') {
        const result = [
            `Failed to abort task \`${taskId}\` due to an unexpected error.`,
            `This is not expected and further stop attempts are unlikely to succeed.`,
            `You may still read the task output via taskOutput, but do not call taskStop again.`,
        ];
        return result.join(' ');
    }

    return `Task \`${taskId}\` has been stopped.`;
}

async function stopProcess(taskId: string, processes: Map<string, ProcessRecord>): Promise<string> {
    const record = getOrThrow(processes, taskId);
    if (record.status === 'finished') {
        return `Task \`${taskId}\` is already completed, nothing to stop.`;
    }

    processes.set(taskId, {...record, status: 'finished', finishReason: 'stop'});

    record.subprocess.kill();
    const tasks = [
        record.subprocess.then(() => 'done' as const, () => 'done' as const),
        timers.setTimeout(BASH_STOP_TIMEOUT_MS, 'timeout' as const, {ref: false}),
    ] as const;
    const winner = await Promise.race(tasks);

    if (winner === 'timeout') {
        const result = [
            `Stop signal sent to task \`${taskId}\`.`,
            `It has not exited within ${BASH_STOP_TIMEOUT_MS / 1000}s — termination is still in progress.`,
            'Do not call taskStop again.',
        ];
        return result.join(' ');
    }
    return `Task \`${taskId}\` has been stopped.`;
}

export async function createTaskStopImplement(): Promise<ToolImplementation<TaskStopToolParameters>> {
    return async (parameters, context): Promise<string> => {
        const {task_id: taskId} = parameters;
        const {processes, subagents} = context;

        if (taskId.startsWith('agent_')) {
            if (!subagents.get(taskId)) {
                const availableIds = [...subagents.keys()].join(', ');
                if (availableIds) {
                    throw new Error(`task_id \`${taskId}\` not found, available task IDs: \`${availableIds}\``);
                }
                throw new Error('no background tasks exist');
            }
            return stopSubagent(taskId, subagents);
        }

        if (!processes.get(taskId)) {
            const availableIds = [...processes.keys()].join(', ');
            if (availableIds) {
                throw new Error(`task_id \`${taskId}\` not found, available task IDs: \`${availableIds}\``);
            }
            throw new Error('no background tasks exist');
        }
        return stopProcess(taskId, processes);
    };
}
