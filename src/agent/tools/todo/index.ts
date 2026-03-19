import type {Tool, ToolDefinition, ToolExecutionContext} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';
import {TodoWriteToolExecution} from './execution.js';
import type {TodoItemStatus, TodoToolParameters} from './execution.js';

export type {TodoItemStatus, TodoToolParameters} from './execution.js';

export class TodoWriteTool implements Tool<TodoToolParameters> {
    private readonly definition: ToolDefinition;

    private constructor(definition: ToolDefinition) {
        this.definition = definition;
    }

    static async create(): Promise<TodoWriteTool> {
        const definition = await loadDefinitionFromYamlRelative(import.meta.url);
        return new TodoWriteTool(definition);
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

    execute(parameters: TodoToolParameters, _context: ToolExecutionContext): Promise<string> {
        return new TodoWriteToolExecution(parameters).run();
    }
}
