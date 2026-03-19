import type {Tool, ToolDefinition, ToolExecutionContext} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';
import {AgentToolExecution} from './execution.js';
import type {AgentConfig} from './utils.js';
import {buildAgentTypeList} from './utils.js';
import type {AgentToolParameters} from './execution.js';

export type {AgentConfig} from './utils.js';
export type {AgentToolParameters} from './execution.js';

export class AgentTool implements Tool<AgentToolParameters> {
    private readonly definition: ToolDefinition;
    private readonly agentTypes: AgentConfig[];

    private constructor(definition: ToolDefinition, agentTypes: AgentConfig[]) {
        this.definition = definition;
        this.agentTypes = agentTypes;
    }

    static async create(agentTypes: AgentConfig[]): Promise<AgentTool> {
        const agentTypeList = buildAgentTypeList(agentTypes);
        const definition = await loadDefinitionFromYamlRelative(import.meta.url);
        return new AgentTool(
            {...definition, description: definition.description.replaceAll('{{agentTypeList}}', agentTypeList)},
            agentTypes
        );
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

    execute(parameters: AgentToolParameters, context: ToolExecutionContext): Promise<string> {
        return new AgentToolExecution(parameters, context, this.agentTypes).run();
    }
}
