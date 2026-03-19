import type {Tool, ToolDefinition, ToolExecutionContext} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';
import {GrepToolExecution} from './execution.js';
import type {GrepToolParameters} from './execution.js';

export type {GrepToolParameters} from './execution.js';

export class GrepTool implements Tool<GrepToolParameters> {
    private readonly definition: ToolDefinition;

    private constructor(definition: ToolDefinition) {
        this.definition = definition;
    }

    static async create(): Promise<GrepTool> {
        const definition = await loadDefinitionFromYamlRelative(import.meta.url);
        return new GrepTool(definition);
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

    execute(parameters: GrepToolParameters, _context: ToolExecutionContext): Promise<string> {
        return new GrepToolExecution(parameters).run();
    }
}
