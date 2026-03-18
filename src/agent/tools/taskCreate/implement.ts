import type {TaskCreateToolParameters} from './definition.js';
import type {ToolImplementation, TaskRecord} from '../interface.js';
import {createIncrementCounter} from '../../../utils/id.js';

const nextTaskId = createIncrementCounter(0);

function generateTaskId(): string {
    return nextTaskId().toString();
}

export async function createTaskCreateImplement(): Promise<ToolImplementation<TaskCreateToolParameters>> {
    return async (parameters, context): Promise<string> => {
        const {subject, description, metadata = {}} = parameters;
        const {tasks} = context;

        const id = generateTaskId();
        const task: TaskRecord = {
            id,
            subject,
            description,
            status: 'pending',
            blocks: [],
            blockedBy: [],
            metadata,
        };

        tasks.set(id, task);
        return `Task created successfully with ID: ${id}`;
    };
}
