import type {ToolExecutionContext} from '../interface.js';
import {formatOutput} from './utils.js';

export interface TaskOutputToolParameters {
    task_id: string;
    offset?: number;
    limit?: number;
}

export class TaskOutputToolExecution {
    private readonly parameters: TaskOutputToolParameters;
    private readonly context: ToolExecutionContext;

    constructor(parameters: TaskOutputToolParameters, context: ToolExecutionContext) {
        this.parameters = parameters;
        this.context = context;
    }

    run(): Promise<string> {
        const {task_id: taskId, offset, limit} = this.parameters;
        const {processes, subagents} = this.context;

        if (taskId.startsWith('agent_')) {
            const record = subagents.get(taskId);
            if (!record) {
                const availableIds = [...subagents.keys()].join(', ');
                if (availableIds) {
                    throw new Error(
                        `task_id \`${taskId}\` not found, available task IDs: \`${availableIds}\``
                    );
                }
                throw new Error('no background tasks exist');
            }

            const statusText = record.status === 'running'
                ? 'running'
                : `completed (${record.finishReason})`;
            return Promise.resolve(formatOutput(record.agent.getLastMessageText(), statusText, offset, limit));
        }

        const record = processes.get(taskId);
        if (!record) {
            const availableIds = [...processes.keys()].join(', ');
            if (availableIds) {
                throw new Error(
                    `task_id \`${taskId}\` not found, available task IDs: \`${availableIds}\``
                );
            }
            throw new Error('no background tasks exist');
        }

        const statusText = record.status === 'finished'
            ? `finished (${record.finishReason}), exit code: ${record.exitCode ?? 'unknown'}`
            : 'running';
        return Promise.resolve(formatOutput(record.output, statusText, offset, limit));
    }
}
