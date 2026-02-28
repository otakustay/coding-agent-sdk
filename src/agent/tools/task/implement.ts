import type {TaskToolParameters, AgentConfig} from './definition.js';
import type {ToolImplementation} from '../interface.js';
import {truncateText} from '../../../utils/string.js';
import {createIdGenerator} from '../../../utils/id.js';

const generateAgentId = createIdGenerator('agent_');

export async function createTaskImplement(agents: AgentConfig[]): Promise<ToolImplementation<TaskToolParameters>> {
    return async (parameters, context): Promise<string> => {
        const {query, agent_type: agentType, resume} = parameters;
        const {workingAgentLoop, subtasks} = context;

        if (resume) {
            const subagent = subtasks.get(resume);
            if (!subagent) {
                const availableIds = [...subtasks.keys()].join(',');
                if (availableIds) {
                    throw new Error(
                        `resume agent_id \`${resume}\` not exist, you may refer to following agent_ids:\`${availableIds}\``
                    );
                }
                throw new Error('no exist agent can be resume, launch new agent and omit `resume`');
            }

            const result = await subagent.submitUserQueryForFinalMessageText(query);
            const truncatedResult = truncateText(
                result,
                {
                    maxLines: 200,
                    maxCharactersPerLine: 2000,
                    onTruncate: truncated => truncated + `\n(Output truncated at ${truncated.length} characters.)`,
                }
            );

            const segments = [
                `<agent_id>${resume}</agent_id>`,
                '<return>',
                truncatedResult,
                '</return>',
                '',
                `You can use agent_id:\`${resume}\` to resume the agent later if needed for follow-up work.`,
                'The result returned by the agent is not visible to the user. If you want to show the user the result, you should send a text message back to the user, including all key conclusions and necessary details.',
            ];
            return segments.join('\n');
        }

        const config = agents.find(t => t.name === agentType);
        if (!config) {
            const availableTypes = agents.map(t => t.name).join(',');
            throw new Error(`agent_type inavailable, you can choose:\`${availableTypes}\``);
        }

        const agentId = generateAgentId();
        const subagent = workingAgentLoop.fork();

        await config.setup(subagent);
        subtasks.set(agentId, subagent);

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
            'The result returned by the agent is not visible to the user. If you want to show the user the result, you should send a text message back to the user, including all key conclusions and necessary details.',
        ];
        return segments.join('\n');
    };
}
