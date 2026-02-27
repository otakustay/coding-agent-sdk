import {z} from 'zod';
import type {ToolDefinition} from '../interface.js';
import dedent from 'dedent';

const listToolParameters = {
    target_directory: z.string().describe('Path to directory to list contents of.'),
    ignore_globs: z.array(z.string()).optional().describe('Optional array of glob patterns to ignore.'),
    depth: z.number().optional().describe('Max depth of given path.'),
};
const listToolInputSchema = z.object(listToolParameters);

export type ListToolParameters = z.infer<typeof listToolInputSchema>;

export async function defineListTool(): Promise<ToolDefinition<ListToolParameters>> {
    return {
        name: 'list',
        description: dedent`
            Lists files and directories in a given path.
            The result does not display dot-files and dot-directories.
        `,
        inputSchema: listToolInputSchema,
    };
}
