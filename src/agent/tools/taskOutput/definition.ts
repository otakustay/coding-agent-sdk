import {z} from 'zod';
import type {ToolDefinition} from '../interface.js';
import dedent from 'dedent';

const taskOutputToolParameters = {
    task_id: z.string().describe(
        'The task ID of the background process to read output from (e.g. bash_12345 or agent_abc123).'
    ),
    offset: z.number().optional().describe(
        dedent`
            The line number to start reading from (1-based).
            Negative values count from the end of the output (e.g. -10 starts from the 10th-to-last line).
            Omit to start from the beginning.
        `
    ),
    limit: z.number().optional().describe(
        'The number of lines to read. Omit to read all available lines from the offset.'
    ),
};

const taskOutputToolInputSchema = z.object(taskOutputToolParameters);

export type TaskOutputToolParameters = z.infer<typeof taskOutputToolInputSchema>;

export async function defineTaskOutputTool(): Promise<ToolDefinition<TaskOutputToolParameters>> {
    return {
        name: 'taskOutput',
        description: dedent`
            Reads the output of a background process started with the bash or agent tool.
            Returns the process status and output lines.
            Supports pagination via offset and limit parameters.
        `,
        inputSchema: taskOutputToolInputSchema,
    };
}
