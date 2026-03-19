import type {Tool, ToolDefinition, ToolExecutionContext} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';
import {createIncrementCounter} from '../../../utils/id.js';
import {TaskCreateToolExecution} from './execution.js';
import type {TaskCreateToolParameters} from './execution.js';

export type {TaskCreateToolParameters} from './execution.js';

export class TaskCreateTool implements Tool<TaskCreateToolParameters> {
    private readonly nextTaskId = createIncrementCounter(0);
    private readonly definition: ToolDefinition;

    private constructor(definition: ToolDefinition) {
        this.definition = definition;
    }

    static async create(): Promise<TaskCreateTool> {
        const definition = await loadDefinitionFromYamlRelative(import.meta.url);
        return new TaskCreateTool(definition);
    }

    getName(): string {
        return this.definition.name;
    }

    getDescription(): string {
        return this.definition.description;
    }

    getInputSchema(): Record<string, unknown> {
        return this.definition.inputSchema;
    }

    execute(parameters: TaskCreateToolParameters, context: ToolExecutionContext): Promise<string> {
        const taskId = this.nextTaskId().toString();
        return new TaskCreateToolExecution(parameters, context, taskId).run();
    }
}
