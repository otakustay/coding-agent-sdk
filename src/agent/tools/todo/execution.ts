export type TodoItemStatus = 'pending' | 'in_progress' | 'completed';

export interface TodoToolParameters {
    todos: Array<{
        content: string;
        status: TodoItemStatus;
    }>;
}

export class TodoWriteToolExecution {
    private readonly parameters: TodoToolParameters;

    constructor(parameters: TodoToolParameters) {
        this.parameters = parameters;
    }

    run(): Promise<string> {
        const {todos} = this.parameters;

        const completedCount = todos.filter(t => t.status === 'completed').length;
        const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
        const pendingCount = todos.filter(t => t.status === 'pending').length;

        return Promise.resolve(
            `Todos have been modified successfully. Current Todo States:${completedCount} complete, ${inProgressCount} in_progress, ${pendingCount} pending\nEnsure that you continue to use the todo list to track your progress. Please proceed with the current tasks if applicable`
        );
    }
}
