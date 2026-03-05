import type {TaskUpdateToolParameters} from './definition.js';
import type {ToolImplementation} from '../interface.js';

export async function createTaskUpdateImplement(): Promise<ToolImplementation<TaskUpdateToolParameters>> {
    return async (parameters, context): Promise<string> => {
        const {
            task_id: taskId,
            subject,
            description,
            status,
            add_blocks: addBlocks,
            add_blocked_by: addBlockedBy,
            metadata,
        } = parameters;
        const {tasks} = context;

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
            return `Task ${taskId} has been deleted`;
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

        return `Task ${taskId} has been updated successfully`;
    };
}
