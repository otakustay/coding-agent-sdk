import {z} from 'zod';
import type {ToolDefinition} from '../interface.js';
import dedent from 'dedent';

const bashToolParameters = {
    command: z.string().describe(
        'The shell command to execute from the user\'s current workspace. The command may include chaining and directory changes. Must be non-interactive and complete without user input. Must use valid syntax for the user\'s shell'
    ),
};
const bashToolInputSchema = z.object(bashToolParameters);

export type BashToolParameters = z.infer<typeof bashToolInputSchema>;

export async function defineBashTool(): Promise<ToolDefinition<BashToolParameters>> {
    return {
        name: 'bash',
        description: dedent`
            Executes a given terminal command in an instant shell session, ensuring proper handling and security measures.

            IMPORTANT: This tool is for terminal operations like git, npm, docker, etc. DO NOT use it for file operations (reading, writing, editing, searching, finding files and deleting files) - use the specialized tools for this instead.

            Before executing the command, please follow these steps:

            1. Directory Verification:
               - If the command will create new directories or files, first use \`ls\` to verify the parent directory exists and is the correct location
               - For example, before running "mkdir foo/bar", first use \`ls foo\` to check that "foo" exists and is the intended parent directory

            2. Command Execution:
               - Always quote file paths that contain spaces with double quotes (e.g., cd "path with spaces/file.txt")
               - After ensuring proper quoting, execute the command.
               - Capture the output of the command.

            Usage notes:
              - The command argument is required.
              - If the output exceeds 30000 characters, output will be truncated before being returned to you.
              - Avoid using bash with the \`find\`, \`grep\`, \`cat\`, \`head\`, \`tail\`, \`sed\`, \`awk\`, or \`echo\` commands, unless explicitly instructed or when these commands are truly necessary for the task. Instead, always prefer using the dedicated tools for these commands.
        `,
        inputSchema: bashToolInputSchema,
    };
}
