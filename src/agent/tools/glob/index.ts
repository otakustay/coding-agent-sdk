import type {Tool, ToolDefinition, ToolExecutionContext} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';
import {GlobToolExecution} from './execution.js';
import type {GlobToolParameters} from './execution.js';

export type {GlobToolParameters} from './execution.js';

export class GlobTool implements Tool<GlobToolParameters> {
    private readonly definition: ToolDefinition;

    private constructor(definition: ToolDefinition) {
        this.definition = definition;
    }

    static async create(): Promise<GlobTool> {
        const definition = await loadDefinitionFromYamlRelative(import.meta.url);
        return new GlobTool(definition);
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

    execute(parameters: GlobToolParameters, _context: ToolExecutionContext): Promise<string> {
        return new GlobToolExecution(parameters).run();
    }
}
