import type {ToolExecutionContext} from '../interface.js';

export interface TaskUpdateToolParameters {
    task_id: string;
    subject?: string;
    description?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'deleted';
    add_blocks?: string[];
    add_blocked_by?: string[];
    metadata?: Record<string, unknown | null>;
}

export class TaskUpdateToolExecution {
    constructor(
        private readonly parameters: TaskUpdateToolParameters,
        private readonly context: ToolExecutionContext,
    ) {}

    run(): Promise<string> {
        const {
            task_id: taskId,
            subject,
            description,
            status,
            add_blocks: addBlocks,
            add_blocked_by: addBlockedBy,
            metadata,
        } = this.parameters;
        const {tasks} = this.context;

        const task = tasks.get(taskId);
        if (!task) {
            const availableIds = [...tasks.keys()].join(', ');
            if (availableIds) {
                throw new Error(`Task ID "${taskId}" not found, available task IDs: ${availableIds}`);
            }
            throw new Error('No tasks exist');
        }

        if (status === 'deleted') {
            tasks.delete(taskId);
            return Promise.resolve(`Task ${taskId} has been deleted`);
        }

        if (subject !== undefined) {
            task.subject = subject;
        }
        if (description !== undefined) {
            task.description = description;
        }
        if (status !== undefined) {
            task.status = status;
        }

        if (addBlocks !== undefined) {
            task.blocks = [...new Set([...task.blocks, ...addBlocks])];
        }
        if (addBlockedBy !== undefined) {
            task.blockedBy = [...new Set([...task.blockedBy, ...addBlockedBy])];
        }

        if (metadata !== undefined) {
            for (const [key, value] of Object.entries(metadata)) {
                if (value === null) {
                    delete task.metadata[key];
                }
                else {
                    task.metadata[key] = value;
                }
            }
        }

        return Promise.resolve(`Task ${taskId} has been updated successfully`);
    }
}
