import {z} from 'zod';
import type {ToolDefinition} from '../interface.js';
import dedent from 'dedent';

const globToolParameters = {
    pattern: z.string().describe(
        'The pattern to match files against.\nPatterns not starting with \'**/\' are automatically prepended with \'**/\'.'
    ),
    target_directory: z.string().optional().describe(
        'The directory to search in. If not specified, the current working directory will be used. IMPORTANT: Omit this field to use the default directory. DO NOT enter "undefined" or "null" - simply omit it for the default behavior. Must be a valid directory path if provided.'
    ),
};
const globToolInputSchema = z.object(globToolParameters);

export type GlobToolParameters = z.infer<typeof globToolInputSchema>;

export async function defineGlobTool(): Promise<ToolDefinition<GlobToolParameters>> {
    return {
        name: 'glob',
        description: dedent`
            Tool to search for files matching a glob pattern

            - Works fast with codebases of any size
            - Returns matching file paths sorted by modification time
            - Use this tool when you need to find files by name patterns
            - When you are doing an open ended search that may require multiple rounds of globbing and grepping, use the delegate_subtask tool instead
            - You have the capability to call multiple tools in a single response. It is always better to speculatively perform multiple searches that are potentially useful as a batch.
        `,
        inputSchema: globToolInputSchema,
    };
}
