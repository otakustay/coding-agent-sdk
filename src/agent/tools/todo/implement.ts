import type {TodoToolParameters} from './definition.js';
import type {ToolImplementation} from '../interface.js';

export async function createTodoWriteImplement(): Promise<ToolImplementation<TodoToolParameters>> {
    return async (parameters): Promise<string> => {
        const {todos} = parameters;

        const completedCount = todos.filter(t => t.status === 'completed').length;
        const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
        const pendingCount = todos.filter(t => t.status === 'pending').length;

        return `Todos have been modified successfully. Current Todo States:${completedCount} complete, ${inProgressCount} in_progress, ${pendingCount} pending\nEnsure that you continue to use the todo list to track your progress. Please proceed with the current tasks if applicable`;
    };
}
