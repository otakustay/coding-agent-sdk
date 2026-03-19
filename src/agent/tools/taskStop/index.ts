import type {Tool, ToolDefinition, ToolExecutionContext} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';
import {TaskStopToolExecution} from './execution.js';
import type {TaskStopToolParameters} from './execution.js';

export type {TaskStopToolParameters} from './execution.js';

export class TaskStopTool implements Tool<TaskStopToolParameters> {
    private readonly definition: ToolDefinition;

    private constructor(definition: ToolDefinition) {
        this.definition = definition;
    }

    static async create(): Promise<TaskStopTool> {
        const definition = await loadDefinitionFromYamlRelative(import.meta.url);
        return new TaskStopTool(definition);
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

    execute(parameters: TaskStopToolParameters, context: ToolExecutionContext): Promise<string> {
        return new TaskStopToolExecution(parameters, context).run();
    }
}
