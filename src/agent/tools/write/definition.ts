import {z} from 'zod';
import type {ToolDefinition} from '../interface.js';
import dedent from 'dedent';

const writeToolParameters = {
    file_path: z.string().describe('The absolute path to the file to write.'),
    content: z.string().describe('The complete content to be written to the file.'),
};
const writeToolInputSchema = z.object(writeToolParameters);

export type WriteToolParameters = z.infer<typeof writeToolInputSchema>;

export async function defineWriteTool(): Promise<ToolDefinition<WriteToolParameters>> {
    return {
        name: 'write',
        description: dedent`
            Writes a file to the local filesystem.

            Usage:
            - This tool will overwrite the existing file if there is one at the provided path.
            - If this is an existing file, you MUST have verified its contents, otherwise, an error will be thrown.
            - ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
            - NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
            - Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.
        `,
        inputSchema: writeToolInputSchema,
    };
}
