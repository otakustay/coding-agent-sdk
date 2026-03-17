import {markdownTable} from 'markdown-table';
import type {TaskListToolParameters} from './definition.js';
import type {ToolImplementation} from '../interface.js';
import {sortByBlocker} from './sort.js';

export async function createTaskListImplement(): Promise<ToolImplementation<TaskListToolParameters>> {
    return async (parameters, context): Promise<string> => {
        const {tasks} = context;

        const allTasks = [...tasks.values()];

        if (allTasks.length === 0) {
            return 'No tasks exist';
        }

        const sortedTasks = sortByBlocker(allTasks);

        const rows: string[][] = [
            ['ID', 'Subject', 'Status', 'Blocked By'],
        ];
        for (const task of sortedTasks) {
            const blockedBy = task.blockedBy.length > 0 ? task.blockedBy.join(', ') : '-';
            rows.push([task.id, task.subject, task.status, blockedBy]);
        }

        return markdownTable(rows);
    };
}
