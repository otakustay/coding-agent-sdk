import type {Tool, ToolDefinition, ToolExecutionContext} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';
import {EditToolExecution} from './execution.js';
import type {EditToolParameters} from './execution.js';

export type {EditToolParameters} from './execution.js';

export class EditTool implements Tool<EditToolParameters> {
    private readonly definition: ToolDefinition;

    private constructor(definition: ToolDefinition) {
        this.definition = definition;
    }

    static async create(): Promise<EditTool> {
        const definition = await loadDefinitionFromYamlRelative(import.meta.url);
        return new EditTool(definition);
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

    execute(parameters: EditToolParameters, _context: ToolExecutionContext): Promise<string> {
        return new EditToolExecution(parameters).run();
    }
}
