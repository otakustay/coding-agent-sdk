import type {Tool, ToolDefinition, ToolExecutionContext} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';
import {TaskListToolExecution} from './execution.js';
import type {TaskListToolParameters} from './execution.js';

export type {TaskListToolParameters} from './execution.js';

export class TaskListTool implements Tool<TaskListToolParameters> {
    private readonly definition: ToolDefinition;

    private constructor(definition: ToolDefinition) {
        this.definition = definition;
    }

    static async create(): Promise<TaskListTool> {
        const definition = await loadDefinitionFromYamlRelative(import.meta.url);
        return new TaskListTool(definition);
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

    execute(parameters: TaskListToolParameters, context: ToolExecutionContext): Promise<string> {
        return new TaskListToolExecution(context).run();
    }
}
