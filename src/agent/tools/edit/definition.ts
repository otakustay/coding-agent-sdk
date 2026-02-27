import {z} from 'zod';
import type {ToolDefinition} from '../interface.js';
import dedent from 'dedent';

const editToolParameters = {
    file_path: z.string().describe('The absolute or relative path to the file to modify.'),
    old_string: z.string().describe('The text to replace'),
    new_string: z.string().describe('The text to replace it with (must be different from old_string)'),
    replace_all: z.boolean().optional().describe('Replace all occurrences of old_string (default false)'),
};
const editToolInputSchema = z.object(editToolParameters);

export type EditToolParameters = z.infer<typeof editToolInputSchema>;

export async function defineEditTool(): Promise<ToolDefinition<EditToolParameters>> {
    return {
        name: 'edit',
        description: dedent`
            Performs exact string replacements in files.

            Usage:
            - Before editing a file, you must ensure you have verified its content, otherwise, an error will be thrown.
            - When editing text from read_file tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is like: \` 1802→\`. Everything after that \`→\` is the actual file content to match. Never include any part of the line number prefix in the old_string or new_string.
            - ALWAYS prefer editing existing files in the codebase. NEVER write new files.
            - Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.
            - The edit will FAIL if \`old_string\` is not found in the file with an error "old_string not found in content".
            - The edit will FAIL if \`old_string\` is found multiple times in the file with an error "old_string found multiple times and requires more code context to uniquely identify the intended match". Either provide a larger string with more surrounding context to make it unique or use \`replace_all\` to change every instance of \`old_string\`.
            - Use \`replace_all\` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.
        `,
        inputSchema: editToolInputSchema,
    };
}
