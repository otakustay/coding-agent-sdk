import type {Tool, ToolDefinition, ToolExecutionContext} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';
import {TaskUpdateToolExecution} from './execution.js';
import type {TaskUpdateToolParameters} from './execution.js';

export type {TaskUpdateToolParameters} from './execution.js';

export class TaskUpdateTool implements Tool<TaskUpdateToolParameters> {
    private readonly definition: ToolDefinition;

    private constructor(definition: ToolDefinition) {
        this.definition = definition;
    }

    static async create(): Promise<TaskUpdateTool> {
        const definition = await loadDefinitionFromYamlRelative(import.meta.url);
        return new TaskUpdateTool(definition);
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

    execute(parameters: TaskUpdateToolParameters, context: ToolExecutionContext): Promise<string> {
        return new TaskUpdateToolExecution(parameters, context).run();
    }
}
