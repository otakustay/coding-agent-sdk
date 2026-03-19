import {markdownTable} from 'markdown-table';
import type {ToolExecutionContext} from '../interface.js';
import {sortByBlocker} from './sort.js';

export type TaskListToolParameters = Record<string, never>;

export class TaskListToolExecution {
    private readonly context: ToolExecutionContext;

    constructor(context: ToolExecutionContext) {
        this.context = context;
    }

    run(): Promise<string> {
        const {tasks} = this.context;

        const allTasks = [...tasks.values()];

        if (allTasks.length === 0) {
            return Promise.resolve('No tasks exist');
        }

        const sortedTasks = sortByBlocker(allTasks);

        const rows: string[][] = [
            ['ID', 'Subject', 'Status', 'Blocked By'],
        ];
        for (const task of sortedTasks) {
            const blockedBy = task.blockedBy.length > 0 ? task.blockedBy.join(', ') : '-';
            rows.push([task.id, task.subject, task.status, blockedBy]);
        }

        return Promise.resolve(markdownTable(rows));
    }
}
