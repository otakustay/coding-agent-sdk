import {createOpenRouter} from '@openrouter/ai-sdk-provider';
import {generateText, tool} from 'ai';
import type {Tool} from 'ai';
import dedent from 'dedent';
import {z} from 'zod';
import {evaluate} from '../tools/evaluate/index.js';
import type {EvaluateInput, EvaluateResult} from '../tools/evaluate/index.js';

export const PROMPT_TEMPLATE = dedent`
    You are a helpful coding agent, you write and run JavaScript to accomplish the task.
`;

const evaluateToolDescription: Tool<EvaluateInput, EvaluateResult> = {
    description: dedent`
        Evaluate JavaScript source code to explore the workspace, edit files, run commands and more.

        The JavaScript generated must match all these conditions:

        - It must be a ESM module, use \`import\` instead of \`require\`.
        - It runs in NodeJS context, you can access built-in modules like \`fs\`, \`path\`, etc..., use \`node:\` prefix for built-in modules.
        - It always runs in root of this workspace, \`process.cwd()\` points to workspace directory.
        - Native \`fetch\` function is available.
        - You will access stdout (as \`output\`) and stderr (as \`error\`) from this tool, use \`console\` to output text to stdio.

        In addition to all built-in and native modules, you have a special \`agent-tools\` module which export several functions you should utilized in higher priority than NodeJS's built-in ones.

        \`\`\`typescript
        /** Result of executing a command */
        export interface ExecResult {
            /** Exit code of the command */
            exitCode: number;
            /** Standard output of the command */
            output: string;
            /** Standard error of the command */
            error: string;
        }

        /** Input parameters for the exec function */
        export interface ExecInput {
            /** Working directory for the command (optional) */
            cwd?: string;
            /** Command to execute */
            command: string;
            /** Command arguments (optional) */
            args?: string[];
        }

        /** Execute a shell command */
        export function exec(input: ExecInput): Promise<ExecResult>;

        /** A grep result entry containing matched file information and content */
        export interface GrepEntry {
            /** File path URI */
            uri: string;
            /** Matched content */
            content: string;
            /** Starting line number (1-based) */
            lineStart: number;
            /** Ending line number (1-based) */
            lineEnd: number;
        }

        /** Input parameters for the grep function */
        export interface GrepInput {
            /** Working directory for the search (optional) */
            cwd?: string;
            /** Glob pattern to filter files (optional) */
            glob?: string;
            /** Regular expression to search for */
            regex: string;
        }

        /** Search for text patterns in files using grep */
        export function grep(input: GrepInput): Promise<GrepEntry[]>;

        /** A directory or file entry in the file system tree */
        export interface ListEntry {
            /** Name of the file or directory */
            name: string;
            /** Child entries if this is a directory */
            children?: ListEntry[];
        }

        /** Input parameters for the list function */
        export interface ListInput {
            /** Directory path to list */
            uri: string;
            /** Maximum depth to traverse (default: 1) */
            depth?: number;
        }

        /** List directory structure recursively */
        export function list(input: ListInput): Promise<ListEntry>;

        /** A patch entry that specifies a search pattern and its replacement */
        export interface Patch {
            /** The text pattern to search for */
            search: string;
            /** The text to replace the search pattern with */
            replace: string;
        }

        /** Input parameters for the patch function */
        export interface PatchInput {
            /** File path to patch */
            uri: string;
            /** Array of search-replace patch entries */
            patches: Patch[];
        }

        /** Apply multiple patches to a file by searching and replacing text patterns */
        export function patch(input: PatchInput): Promise<void>;

        /** Input parameters for the read function */
        export interface ReadInput {
            /** File path to read */
            uri: string;
        }

        /** Read file content from the specified URI */
        export function read(input: ReadInput): Promise<string>;

        /** Input parameters for the write function */
        export interface WriteInput {
            /** File path to write */
            uri: string;
            /** Content to write to the file */
            content: string;
        }

        /** Write content to the specified file URI */
        export function write(input: WriteInput): Promise<void>;
        \`\`\`
    `,
    inputSchema: z.object({
        name: z.string().describe('Name of the script'),
        code: z.string().describe('The code to be evaluated'),
        reusable: z.boolean().optional().describe('Whether the sandbox should be reusable'),
        dependencies: z.array(z.string()).optional().describe('NPM dependencies to install'),
    }) as any,
    outputSchema: z.union([
        z.object({
            exitCode: z.number().describe('The exit code of the code execution'),
            output: z.string().describe('The result of the code execution'),
            error: z.string().optional().describe('The error output of the code execution'),
        }),
        z.object({
            error: z.string().describe('The error message if evaluation failed'),
        }),
    ]),
    execute: async input => {
        return await evaluate(input);
    },
};

type GenerateTextOptions = Parameters<typeof generateText>[0];

export async function startAgentTask(content: string) {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY environment variable is required');
    }

    const openRouter = createOpenRouter({apiKey: process.env.OPENROUTER_API_KEY});
    const options: GenerateTextOptions = {
        model: openRouter.chat('anthropic/claude-sonnet-4.5') as any,
        system: PROMPT_TEMPLATE,
        prompt: content,
        tools: {
            evaluate: tool(evaluateToolDescription),
        },
        toolChoice: 'auto',
        onStepFinish: step => {
            for (const chunk of step.content) {
                switch (chunk.type) {
                    case 'text':
                        console.log(`<============= Text =============>`);
                        console.log(chunk.text);
                        break;
                    case 'tool-call':
                        console.log('<============= Run =============>');
                        console.log(`// Install: ${(chunk.input as any).dependencies?.join(', ') || '(none)'}`);
                        console.log((chunk.input as any).code.trim());
                        break;
                    case 'tool-result':
                        console.log('<============= Output =============>');
                        console.log((chunk.output as any).output.trim() || '(none)');
                        if ((chunk.output as any).error) {
                            console.log('<============= Error =============>');
                            console.log((chunk.output as any).error.trim());
                        }
                        break;
                    default:
                        throw new Error('Unknown');
                }
            }
        },
        stopWhen: () => false,
    };
    await generateText(options);
}
