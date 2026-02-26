import {z} from 'zod';
import type {ToolDefinition} from '../interface.js';
import dedent from 'dedent';

const readToolParameters = {
    target_file: z.string().describe('The absolute path to the file to read.'),
    offset: z.number().optional().describe(
        'The line number to start reading from. Only provide if the file is too large to read at once.'
    ),
    limit: z.number().optional().describe(
        'The number of lines to read. Only provide if the file is too large to read at once.'
    ),
};
const readToolInputSchema = z.object(readToolParameters);

export type ReadToolParameters = z.infer<typeof readToolInputSchema>;

export async function defineReadTool(): Promise<ToolDefinition<ReadToolParameters>> {
    return {
        name: 'read',
        description: dedent`
            Reads a file from the local filesystem. You can access any file directly by using this tool.
            If the User provides a path to a file assume that path is valid. It is okay to read a file that does not exist; an error will be returned.

            By default, it reads up to 2000 lines starting from the beginning of the file.
            Any lines longer than 2000 characters will be truncated.
            Results are returned using cat -n format, with line numbers starting at 1.
        `,
        inputSchema: readToolInputSchema,
    };
}
