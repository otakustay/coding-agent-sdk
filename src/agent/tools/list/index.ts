import type {Tool, ToolDefinition, ToolExecutionContext} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';
import {ListToolExecution} from './execution.js';
import type {ListToolParameters} from './execution.js';

export type {ListToolParameters} from './execution.js';

export class ListTool implements Tool<ListToolParameters> {
    private readonly definition: ToolDefinition;

    private constructor(definition: ToolDefinition) {
        this.definition = definition;
    }

    static async create(): Promise<ListTool> {
        const definition = await loadDefinitionFromYamlRelative(import.meta.url);
        return new ListTool(definition);
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

    execute(parameters: ListToolParameters, _context: ToolExecutionContext): Promise<string> {
        return new ListToolExecution(parameters).run();
    }
}
