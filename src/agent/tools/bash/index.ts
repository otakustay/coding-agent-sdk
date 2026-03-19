import type {Tool, ToolDefinition, ToolExecutionContext} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';
import {BashToolExecution} from './execution.js';
import type {BashToolParameters} from './execution.js';

export type {BashToolParameters} from './execution.js';

export class BashTool implements Tool<BashToolParameters> {
    private readonly definition: ToolDefinition;

    private constructor(definition: ToolDefinition) {
        this.definition = definition;
    }

    static async create(): Promise<BashTool> {
        const definition = await loadDefinitionFromYamlRelative(import.meta.url);
        return new BashTool(definition);
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

    execute(parameters: BashToolParameters, context: ToolExecutionContext): Promise<string> {
        return new BashToolExecution(parameters, context).run();
    }
}
