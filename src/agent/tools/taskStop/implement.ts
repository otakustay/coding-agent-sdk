import timers from 'node:timers/promises';
import type {ProcessRecord, SubagentRecord, ToolImplementation} from '../interface.js';
import type {TaskStopToolParameters} from './definition.js';

const BASH_STOP_TIMEOUT_MS = 10_000;

const AGENT_STOP_TIMEOUT_MS = 60_000;

async function stopSubagent(
    taskId: string,
    record: SubagentRecord,
    subagents: Map<string, SubagentRecord>,
): Promise<string> {
    if (record.status === 'idle') {
        return `Task \`${taskId}\` is already completed, nothing to stop.`;
    }

    subagents.set(taskId, {...record, status: 'idle', finishReason: 'stop'});

    const tasks = [
        record.agent.abort().then(() => 'done' as const),
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
    return `Task \`${taskId}\` has been stopped.`;
}

async function stopProcess(
    taskId: string,
    record: ProcessRecord,
    processes: Map<string, ProcessRecord>,
): Promise<string> {
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
            const record = subagents.get(taskId);
            if (!record) {
                const availableIds = [...subagents.keys()].join(', ');
                if (availableIds) {
                    throw new Error(`task_id \`${taskId}\` not found, available task IDs: \`${availableIds}\``);
                }
                throw new Error('no background tasks exist');
            }
            return stopSubagent(taskId, record, subagents);
        }

        const record = processes.get(taskId);
        if (!record) {
            const availableIds = [...processes.keys()].join(', ');
            if (availableIds) {
                throw new Error(`task_id \`${taskId}\` not found, available task IDs: \`${availableIds}\``);
            }
            throw new Error('no background tasks exist');
        }
        return stopProcess(taskId, record, processes);
    };
}
