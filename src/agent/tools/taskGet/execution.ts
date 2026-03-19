import type {ToolExecutionContext} from '../interface.js';

export interface TaskGetToolParameters {
    task_id: string;
}

export class TaskGetToolExecution {
    constructor(private readonly parameters: TaskGetToolParameters, private readonly context: ToolExecutionContext) {}

    run(): Promise<string> {
        const {task_id: taskId} = this.parameters;
        const {tasks} = this.context;

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
        return Promise.resolve(lines.filter(v => !!v).join('\n'));
    }
}
