import dedent from 'dedent';
import type {AgentLoop} from '../../loop/index.js';
import type {FinishReason} from '../interface.js';

export interface AgentConfig {
    name: string;
    description: string;
    setup: (agentLoop: AgentLoop) => Promise<void>;
}

export function buildAgentTypeList(agentTypes: AgentConfig[]): string {
    return agentTypes.map(type => `- ${type.name}: ${type.description}`).join('\n');
}

export function formatAgentBackgroundNotification(agentId: string, finishReason: Exclude<FinishReason, 'stop'>) {
    if (finishReason === 'success') {
        return dedent`
            Background agent \`${agentId}\` has completed successfully.
            Use the \`taskOutput\` tool with agent ID \`${agentId}\` to read the result.
        `;
    }
    return dedent`
        Background agent \`${agentId}\` has terminated unexpectedly.
        Use the \`taskOutput\` tool with agent ID \`${agentId}\` to read the output and check what went wrong.
    `;
}

export async function waitAgentTask(agent: AgentLoop, query: string): Promise<Exclude<FinishReason, 'stop'>> {
    try {
        await agent.submitUserQueryForFinalMessageText(query);
        return 'success';
    }
    catch {
        return 'exception';
    }
}
