import type {TaskRecord, ToolExecutionContext} from '../interface.js';

export interface TaskCreateToolParameters {
    subject: string;
    description: string;
    metadata?: Record<string, unknown>;
}

export class TaskCreateToolExecution {
    private readonly parameters: TaskCreateToolParameters;
    private readonly context: ToolExecutionContext;
    private readonly taskId: string;

    constructor(parameters: TaskCreateToolParameters, context: ToolExecutionContext, taskId: string) {
        this.parameters = parameters;
        this.context = context;
        this.taskId = taskId;
    }

    run(): Promise<string> {
        const {subject, description, metadata = {}} = this.parameters;
        const {tasks} = this.context;

        const task: TaskRecord = {
            id: this.taskId,
            subject,
            description,
            status: 'pending',
            blocks: [],
            blockedBy: [],
            metadata,
        };

        tasks.set(this.taskId, task);
        return Promise.resolve(`Task created successfully with ID: ${this.taskId}`);
    }
}
