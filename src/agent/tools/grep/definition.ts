import {z} from 'zod';
import type {ToolDefinition} from '../interface.js';
import dedent from 'dedent';

const grepToolParameters = {
    pattern: z.string().describe('The regular expression pattern to search for in file contents'),
    path: z.string().optional().describe(
        'File or directory to search in (rg PATH). Defaults to current working directory.'
    ),
    glob: z.string().optional().describe(
        'Glob pattern to filter files (e.g. "*.js", "*.{ts,tsx}") - maps to rg --glob'
    ),
    output_mode: z.enum(['content', 'files_with_matches', 'count']).optional().describe(
        'Output mode: "content" shows matching lines (supports -A/-B/-C context, -n line numbers, head_limit), "files_with_matches" shows file paths (supports head_limit), "count" shows match counts (supports head_limit). Defaults to "files_with_matches".'
    ),
    '-B': z.number().optional().describe(
        'Number of lines to show before each match (rg -B). Requires output_mode: "content", ignored otherwise.'
    ),
    '-A': z.number().optional().describe(
        'Number of lines to show after each match (rg -A). Requires output_mode: "content", ignored otherwise.'
    ),
    '-C': z.number().optional().describe(
        'Number of lines to show before and after each match (rg -C). Requires output_mode: "content", ignored otherwise.'
    ),
    '-n': z.boolean().optional().describe(
        'Show line numbers in output (rg -n). Requires output_mode: "content", ignored otherwise. Defaults to true.'
    ),
    '-i': z.boolean().optional().describe('Case insensitive search (rg -i)'),
    type: z.string().optional().describe(
        'File type to search (rg --type). Common types: js, py, rust, go, java, etc. More efficient than include for standard file types.'
    ),
    head_limit: z.number().optional().describe(
        'Limit output to first N lines/entries, equivalent to "| head -N". Works across all output modes: content (limits output lines), files_with_matches (limits file paths), count (limits count entries). Defaults based on "cap" experiment value: 0 (unlimited), 20, or 100.'
    ),
    offset: z.number().optional().describe(
        'Skip first N lines/entries before applying head_limit, equivalent to "| tail -n +N | head -N". Works across all output modes. Defaults to 0.'
    ),
    multiline: z.boolean().optional().describe(
        'Enable multiline mode where . matches newlines and patterns can span lines (rg -U --multiline-dotall). Default: false.'
    ),
};
const grepToolInputSchema = z.object(grepToolParameters);

export type GrepToolParameters = z.infer<typeof grepToolInputSchema>;

export async function defineGrepTool(): Promise<ToolDefinition<GrepToolParameters>> {
    return {
        name: 'grep',
        description: dedent`
            A powerful search tool built on ripgrep

            Usage:
            - Prefer grep for exact symbol/string searches. Whenever possible, use this instead of terminal grep/rg. The grep tool has been optimized for correct permissions and access.
            - Supports full regex syntax (e.g., "log.*Error", "function\\s+\\w+")
            - Filter files with glob parameter (e.g., "*.js", "**/*.tsx") or type parameter (e.g., "js", "py", "rust")
            - Output modes: "content" shows matching lines, "files_with_matches" shows only file paths (default), "count" shows match counts
            - Use agent tool for open-ended searches requiring multiple rounds
            - Pattern syntax: Uses ripgrep (not grep) - literal braces need escaping (use \`interface\\{\\}\` to find \`interface{}\` in Go code)
            - Multiline matching: By default patterns match within single lines only. For cross-line patterns like \`struct \\{[\\s\\S]*?field\`, use \`multiline: true\`

            ## When to Use This Tool
            Use \`grep\` when you need to:
            1. Find code by exact text or regex rather than by meaning
            2. Simple symbol lookups

            ## When NOT to Use
            Skip \`grep\` for:
            1. Reading known files (use \`read\`)
            2. Find file by name (use \`glob\`)
            3. Complex searching which need multiple steps (use \`agent\` if it exists)
        `,
        inputSchema: grepToolInputSchema,
    };
}
