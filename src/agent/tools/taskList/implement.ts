import {markdownTable} from 'markdown-table';
import {toposortReverse as sortReverse} from '@n1ru4l/toposort';
import type {TaskListToolParameters} from './definition.js';
import type {ToolImplementation, TaskRecord} from '../interface.js';

export async function createTaskListImplement(): Promise<ToolImplementation<TaskListToolParameters>> {
    return async (_parameters, context): Promise<string> => {
        const {tasks} = context;

        const allTasks = [...tasks.values()];

        if (allTasks.length === 0) {
            return 'No tasks exist';
        }

        const dependencyGraph = new Map<string, Iterable<string>>();
        const taskMap = new Map<string, TaskRecord>();
        for (const task of allTasks) {
            dependencyGraph.set(task.id, task.blockedBy);
            taskMap.set(task.id, task);
        }

        const sortedBatches = sortReverse(dependencyGraph);
        const sortedTasks = sortedBatches.flatMap(v => [...v]).map(v => taskMap.get(v)).filter(v => !!v);

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
