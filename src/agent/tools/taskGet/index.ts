import type {Tool, ToolDefinition, ToolExecutionContext} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';
import {TaskGetToolExecution} from './execution.js';
import type {TaskGetToolParameters} from './execution.js';

export type {TaskGetToolParameters} from './execution.js';

export class TaskGetTool implements Tool<TaskGetToolParameters> {
    private readonly definition: ToolDefinition;

    private constructor(definition: ToolDefinition) {
        this.definition = definition;
    }

    static async create(): Promise<TaskGetTool> {
        const definition = await loadDefinitionFromYamlRelative(import.meta.url);
        return new TaskGetTool(definition);
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

    execute(parameters: TaskGetToolParameters, context: ToolExecutionContext): Promise<string> {
        return new TaskGetToolExecution(parameters, context).run();
    }
}
