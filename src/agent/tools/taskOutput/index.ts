import type {Tool, ToolDefinition, ToolExecutionContext} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';
import {TaskOutputToolExecution} from './execution.js';
import type {TaskOutputToolParameters} from './execution.js';

export type {TaskOutputToolParameters} from './execution.js';

export class TaskOutputTool implements Tool<TaskOutputToolParameters> {
    private readonly definition: ToolDefinition;

    private constructor(definition: ToolDefinition) {
        this.definition = definition;
    }

    static async create(): Promise<TaskOutputTool> {
        const definition = await loadDefinitionFromYamlRelative(import.meta.url);
        return new TaskOutputTool(definition);
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

    execute(parameters: TaskOutputToolParameters, context: ToolExecutionContext): Promise<string> {
        return new TaskOutputToolExecution(parameters, context).run();
    }
}
