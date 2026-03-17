import type {TaskRecord} from '../interface.js';

export function sortByBlocker(tasks: TaskRecord[]): TaskRecord[] {
    const taskMap = new Map<string, TaskRecord>(tasks.map(t => [t.id, t]));

    // Count how many unresolved blockers each task has
    const inDegree = new Map<string, number>();
    for (const task of tasks) {
        // Only count blockers that exist in the provided task list
        const count = task.blockedBy.filter(id => taskMap.has(id)).length;
        inDegree.set(task.id, count);
    }

    const queue: TaskRecord[] = [];
    for (const task of tasks) {
        if (inDegree.get(task.id) === 0) {
            queue.push(task);
        }
    }

    const result: TaskRecord[] = [];
    while (queue.length > 0) {
        const task = queue.shift();
        if (!task) {
            break;
        }
        result.push(task);

        // Find tasks that are blocked by the current task and reduce their in-degree
        for (const dependent of tasks) {
            if (dependent.blockedBy.includes(task.id)) {
                const remaining = (inDegree.get(dependent.id) ?? 0) - 1;
                inDegree.set(dependent.id, remaining);
                if (remaining === 0) {
                    queue.push(dependent);
                }
            }
        }
    }

    // Append any tasks in a cycle (unreachable via normal traversal) at the end
    if (result.length < tasks.length) {
        for (const task of tasks) {
            if (!result.includes(task)) {
                result.push(task);
            }
        }
    }

    return result;
}
