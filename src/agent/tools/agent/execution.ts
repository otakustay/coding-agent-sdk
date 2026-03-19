import type {AgentLoop} from '../../loop/index.js';
import type {SubagentRecord, ToolExecutionContext} from '../interface.js';
import {truncateText} from '../../../utils/string.js';
import {createIdGenerator} from '../../../utils/id.js';
import type {AgentConfig} from './utils.js';
import {
    formatAgentBackgroundNotification,
    waitAgentTask,
} from './utils.js';

const generateId = createIdGenerator('agent_');

export interface AgentToolParameters {
    description: string;
    query: string;
    agent_type: string;
    resume?: string;
    background?: boolean;
}

interface AgentRunContext {
    agentId: string;
    query: string;
    subagents: Map<string, SubagentRecord>;
}

export class AgentToolExecution {
    constructor(
        private readonly parameters: AgentToolParameters,
        private readonly context: ToolExecutionContext,
        private readonly agentTypes: AgentConfig[],
    ) {}

    async run(): Promise<string> {
        const {query, agent_type: agentType, resume, background} = this.parameters;
        const {workingAgentLoop, subagents} = this.context;

        if (resume) {
            return this.resumeAgent({agentId: resume, query, subagents});
        }

        const config = this.agentTypes.find(t => t.name === agentType);
        if (!config) {
            const availableTypes = this.agentTypes.map(t => t.name).join(',');
            throw new Error(`agent_type inavailable, you can choose:\`${availableTypes}\``);
        }

        const agentId = generateId();
        const subagent = workingAgentLoop.fork();
        await config.setup(subagent);
        subagents.set(agentId, {status: 'running', owner: workingAgentLoop, agent: subagent});

        if (background) {
            void this.runBackgroundAgent({agentId, query, subagents});
            return `Task is running in the background.\nAgent ID: ${agentId}\n\nUse the \`taskOutput\` tool with agent ID to read the output at any time.`;
        }

        return AgentToolExecution.runForegroundAgent(agentId, subagent, query);
    }

    private async resumeAgent({agentId, query, subagents}: AgentRunContext): Promise<string> {
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

    private async runBackgroundAgent({agentId, query, subagents}: AgentRunContext): Promise<void> {
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

    private static async runForegroundAgent(agentId: string, subagent: AgentLoop, query: string): Promise<string> {
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
}
