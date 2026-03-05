import type {TaskGetToolParameters} from './definition.js';
import type {ToolImplementation} from '../interface.js';

export async function createTaskGetImplement(): Promise<ToolImplementation<TaskGetToolParameters>> {
    return async (parameters, context): Promise<string> => {
        const {task_id: taskId} = parameters;
        const {tasks} = context;

        const task = tasks.get(taskId);
        if (!task) {
            const availableIds = [...tasks.keys()].join(', ');
            if (availableIds) {
                throw new Error(`Task ID "${taskId}" not found, available task IDs: ${availableIds}`);
            }
            throw new Error('No tasks exist');
        }

        const blocks = task.blocks.length > 0 ? `Blocks: ${task.blocks.join(', ')}` : '';
        const blockedBy = task.blockedBy.length > 0 ? `Blocked by: ${task.blockedBy.join(', ')}` : '';
        const metadata = Object.keys(task.metadata).length > 0
            ? `Metadata: ${JSON.stringify(task.metadata)}`
            : '';

        const lines = [
            `ID: ${task.id}`,
            `Subject: ${task.subject}`,
            `Description: ${task.description}`,
            `Status: ${task.status}`,
            blocks,
            blockedBy,
            metadata,
        ];
        return lines.filter(v => !!v).join('\n');
    };
}
