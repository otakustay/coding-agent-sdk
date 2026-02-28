import {z} from 'zod';
import type {ToolDefinition} from '../interface.js';
import type {AgentLoop} from '../../loop/index.js';
import dedent from 'dedent';

export interface AgentConfig {
    name: string;
    description: string;
    setup: (agentLoop: AgentLoop) => Promise<void>;
}

const taskToolParameters = {
    description: z.string().describe('A short (3-5 word) description of the task'),
    query: z.string().describe('The task for the agent to perform'),
    agent_type: z.string().describe('The type of specialized agent to use for this task'),
    resume: z.string().optional().describe(
        'Optional agent_id to resume from. If provided, the agent will continue from the previous execution transcript.'
    ),
};

const taskToolInputSchema = z.object(taskToolParameters);

export type TaskToolParameters = z.infer<typeof taskToolInputSchema>;

function buildAgentTypeList(agentTypes: AgentConfig[]): string {
    return agentTypes.map(type => `- ${type.name}: ${type.description}`).join('\n');
}

export async function defineTaskTool(agentTypes: AgentConfig[]): Promise<ToolDefinition<TaskToolParameters>> {
    const agentTypeNames = agentTypes.map(type => type.name);
    const agentTypeEnum = z.enum(agentTypeNames as [string, ...string[]]);

    const dynamicInputSchema = z.object({
        description: z.string().describe('A short (3-5 word) description of the task'),
        query: z.string().describe('The task for the agent to perform'),
        agent_type: agentTypeEnum.describe(
            `The type of specialized agent to use for this task. Available agent types:\n${
                buildAgentTypeList(agentTypes)
            }`
        ),
        resume: z.string().optional().describe(
            'Optional agent_id to resume from. If provided, the agent will continue from the previous execution transcript.'
        ),
    });

    return {
        name: 'task',
        description: dedent`
            Use \`task\` to launch specialized agents that autonomously handle **complex, multi-step tasks**.
            Each agent runs independently and returns **one final result message** when finished.

            When using the task tool, you must specify an agent_type parameter to select which agent type with specific capabilities to use.
            Available agent types:
            ${buildAgentTypeList(agentTypes)}

            When NOT to use the task tool:
            - Simple or single-step tasks
            - Opening a single known file path, where read_file or glob_path is preferable

            Usage notes:
            - Always include a short description (3-5 words) summarizing what the agent will do
            - Launch multiple agents concurrently whenever possible, to maximize performance; to do that, use a single message with multiple tool uses
            - Agents can be resumed using the \`resume\` parameter by passing the agent_id from a previous invocation. When resumed, the agent continues with its full previous context preserved. When NOT resuming, each invocation starts fresh and you should provide a detailed task description with all necessary context.
            - Provide clear, detailed query so the agent can work autonomously and return exactly the information you need.
            - Clearly tell the agent whether you expect it to write code or just to do research (search, file reads, web fetches, etc.), since it is not aware of the user's intent
            - If the agent description mentions that it should be used proactively, then you should try your best to use it without the user having to ask for it first. Use your judgement.
            - If the user specifies that they want you to run agents "in parallel", you MUST send a single message with multiple task tool use content blocks. For example, if you need to launch both a code-reviewer agent and a test-runner agent in parallel, send a single message with both tool calls.
        `,
        inputSchema: dynamicInputSchema,
    };
}
