import type {ToolDefinition} from '../interface.js';
import type {AgentLoop} from '../../loop/index.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';

export interface AgentConfig {
    name: string;
    description: string;
    setup: (agentLoop: AgentLoop) => Promise<void>;
}

export interface AgentToolParameters {
    description: string;
    query: string;
    agent_type: string;
    resume?: string;
    background?: boolean;
}

function buildAgentTypeList(agentTypes: AgentConfig[]): string {
    return agentTypes.map(type => `- ${type.name}: ${type.description}`).join('\n');
}

export async function defineAgentTool(agentTypes: AgentConfig[]): Promise<ToolDefinition> {
    const agentTypeList = buildAgentTypeList(agentTypes);
    const definition = await loadDefinitionFromYamlRelative(import.meta.url);
    return {
        ...definition,
        description: definition.description.replaceAll('{{agentTypeList}}', agentTypeList),
    };
}
