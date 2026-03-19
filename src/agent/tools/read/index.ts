import type {Tool, ToolDefinition, ToolExecutionContext} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';
import {ReadToolExecution} from './execution.js';
import type {ReadToolParameters} from './execution.js';

export type {ReadToolParameters} from './execution.js';

export class ReadTool implements Tool<ReadToolParameters> {
    private readonly definition: ToolDefinition;

    private constructor(definition: ToolDefinition) {
        this.definition = definition;
    }

    static async create(): Promise<ReadTool> {
        const definition = await loadDefinitionFromYamlRelative(import.meta.url);
        return new ReadTool(definition);
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

    execute(parameters: ReadToolParameters, _context: ToolExecutionContext): Promise<string> {
        return new ReadToolExecution(parameters).run();
    }
}
