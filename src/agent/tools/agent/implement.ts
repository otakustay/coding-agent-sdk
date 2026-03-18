import type {AgentToolParameters, AgentConfig} from './definition.js';
import type {AgentLoop} from '../../loop/index.js';
import type {FinishReason, SubagentRecord, ToolImplementation} from '../interface.js';
import {truncateText} from '../../../utils/string.js';
import {createIdGenerator} from '../../../utils/id.js';
import dedent from 'dedent';

const generateAgentId = createIdGenerator('agent_');

interface AgentRunContext {
    agentId: string;
    query: string;
    subagents: Map<string, SubagentRecord>;
}

function formatAgentBackgroundNotification(agentId: string, finishReason: Exclude<FinishReason, 'stop'>): string {
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

async function waitAgentTask(agent: AgentLoop, query: string): Promise<Exclude<FinishReason, 'stop'>> {
    try {
        await agent.submitUserQueryForFinalMessageText(query);
        return 'success';
    }
    catch {
        return 'exception';
    }
}

async function resumeAgent({agentId, query, subagents}: AgentRunContext): Promise<string> {
    const record = subagents.get(agentId);
    if (!record) {
        const availableIds = [...subagents.keys()].join(',');
        if (availableIds) {
            throw new Error(
                `resume agent_id \`${agentId}\` not exist, you may refer to following agent_ids:\`${availableIds}\``
            );
        }
        throw new Error('no exist agent can be resume, launch new agent and omit `resume`');
    }

    const result = await record.agent.submitUserQueryForFinalMessageText(query);
    const truncatedResult = truncateText(
        result,
        {
            maxLines: 200,
            maxCharactersPerLine: 2000,
            onTruncate: truncated => truncated + `\n(Output truncated at ${truncated.length} characters.)`,
        }
    );
    const segments = [
        `<agent_id>${agentId}</agent_id>`,
        '<return>',
        truncatedResult,
        '</return>',
        '',
        `You can use agent_id:\`${agentId}\` to resume the agent later if needed for follow-up work.`,
        'The result returned by the agent is not visible to the user. If you want to show the user the result, you should send a text message back to the user, including all key conclusions and necessary details.',
    ];
    return segments.join('\n');
}

async function runBackgroundAgent({agentId, query, subagents}: AgentRunContext): Promise<void> {
    const initialRecord = subagents.get(agentId);
    if (!initialRecord) {
        return;
    }
    const finishReason = await waitAgentTask(initialRecord.agent, query);
    const record = subagents.get(agentId);
    if (!record || record.status === 'idle') {
        return;
    }
    subagents.set(agentId, {...record, status: 'idle', finishReason});
    record.owner.submitNotificationIfIdle(formatAgentBackgroundNotification(agentId, finishReason));
}

async function runForegroundAgent(agentId: string, subagent: AgentLoop, query: string): Promise<string> {
    const result = await subagent.submitUserQueryForFinalMessageText(query);
    const truncatedResult = truncateText(
        result,
        {
            maxLines: 200,
            maxCharactersPerLine: 2000,
            onTruncate: truncated =>
                `(Result truncated. Resume agent \`${agentId}\` for complete output.)\n${truncated}`,
        }
    );
    const segments = [
        `<agent_id>${agentId}</agent_id>`,
        '<return>',
        truncatedResult,
        '</return>',
        '',
        `You can use agent_id:\`${agentId}\` to resume the agent later if needed for follow-up work.`,
        'The result returned by the agent is not visible to the user. If you want to show the user the result, you must send a text message back to the user, including all key conclusions and necessary details.',
    ];
    return segments.join('\n');
}

export async function createAgentImplement(agents: AgentConfig[]): Promise<ToolImplementation<AgentToolParameters>> {
    return async (parameters, context): Promise<string> => {
        const {query, agent_type: agentType, resume, background} = parameters;
        const {workingAgentLoop, subagents} = context;

        if (resume) {
            return resumeAgent({agentId: resume, query, subagents});
        }

        const config = agents.find(t => t.name === agentType);
        if (!config) {
            const availableTypes = agents.map(t => t.name).join(',');
            throw new Error(`agent_type inavailable, you can choose:\`${availableTypes}\``);
        }

        const agentId = generateAgentId();
        const subagent = workingAgentLoop.fork();
        await config.setup(subagent);
        subagents.set(agentId, {status: 'running', owner: workingAgentLoop, agent: subagent});

        const runContext: AgentRunContext = {agentId, query, subagents};

        if (background) {
            void runBackgroundAgent(runContext);
            return dedent`
                Task is running in the background.
                Agent ID: ${agentId}

                Use the \`taskOutput\` tool with agent ID to read the output at any time.
            `;
        }

        return runForegroundAgent(agentId, subagent, query);
    };
}
