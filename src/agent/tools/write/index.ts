import type {Tool, ToolDefinition, ToolExecutionContext} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';
import {WriteToolExecution} from './execution.js';
import type {WriteToolParameters} from './execution.js';

export type {WriteToolParameters} from './execution.js';

export class WriteTool implements Tool<WriteToolParameters> {
    private readonly definition: ToolDefinition;

    private constructor(definition: ToolDefinition) {
        this.definition = definition;
    }

    static async create(): Promise<WriteTool> {
        const definition = await loadDefinitionFromYamlRelative(import.meta.url);
        return new WriteTool(definition);
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

    execute(parameters: WriteToolParameters, _context: ToolExecutionContext): Promise<string> {
        return new WriteToolExecution(parameters).run();
    }
}
