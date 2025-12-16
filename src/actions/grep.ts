import {execa} from 'execa';
import unixify from 'unixify';
import crypto from 'node:crypto';
import type {ActionStartMessage, ActionEndMessage, GrepMessageArgs, GrepMessageResult} from './interface.js';

/**
 * A grep result entry containing matched file information and content
 */
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

/**
 * Input parameters for the grep function
 */
export interface GrepInput {
    /** Working directory for the search (optional) */
    cwd?: string;
    /** Glob pattern to filter files (optional) */
    glob?: string;
    /** Regular expression to search for */
    regex: string;
}

// RipGrep JSON output types
interface Text {
    text: string;
}

interface RipGrepOutputPathData {
    path: Text;
}

interface RipGrepCommandOutputLineData {
    path: Text;
    lines: Text;
    line_number: number;
}

interface RipGrepOutputItemOf<T, D> {
    type: T;
    data: D;
}
type RipGrepOutputItem =
    | RipGrepOutputItemOf<'begin', RipGrepOutputPathData>
    | RipGrepOutputItemOf<'context', RipGrepCommandOutputLineData>
    | RipGrepOutputItemOf<'match', RipGrepCommandOutputLineData>
    | RipGrepOutputItemOf<'end', RipGrepOutputPathData>
    | RipGrepOutputItemOf<'summary', unknown>;

interface LineMatch {
    line: string;
    lineNumber: number;
}

interface GrepResult {
    file: string;
    contextBefore: LineMatch[];
    matches: LineMatch[];
    contextAfter: LineMatch[];
}

/**
 * Parse ripgrep JSON output line by line
 */
function parseRipGrepOutput(output: string): GrepResult[] {
    const lines = output.split('\n').filter(line => line.trim());
    const results: GrepResult[] = [];
    let current: GrepResult | null = null;

    for (const line of lines) {
        try {
            const item: RipGrepOutputItem = JSON.parse(line);

            if (item.type === 'begin') {
                current = {
                    file: item.data.path.text,
                    contextBefore: [],
                    matches: [],
                    contextAfter: [],
                };
                continue;
            }

            if (!current) {
                continue;
            }

            if (item.type === 'match') {
                current.matches.push({line: item.data.lines.text, lineNumber: item.data.line_number});
            }
            else if (item.type === 'context') {
                const container = current.matches.length
                    ? current.contextAfter
                    : current.contextBefore;
                container.push({line: item.data.lines.text, lineNumber: item.data.line_number});
            }
            else if (item.type === 'end') {
                results.push(current);
                current = null;
            }
        }
        catch {
            continue;
        }
    }

    return results;
}

/**
 * Convert GrepResult to GrepEntry format
 */
function resultToEntry(result: GrepResult): GrepEntry | [] {
    const allLines = [
        ...result.contextBefore,
        ...result.matches,
        ...result.contextAfter,
    ];

    if (allLines.length === 0) {
        return [];
    }

    const lineStart = allLines[0].lineNumber;
    const lineEnd = allLines[allLines.length - 1].lineNumber;
    const content = allLines.map(item => item.line.trimEnd()).join('\n');

    return {
        uri: unixify(result.file),
        content,
        lineStart,
        lineEnd,
    };
}
/**
 * Search for text patterns in files using grep
 * @param options - Grep options
 * @returns Promise that resolves to array of grep entries
 */
export async function grep({cwd = process.cwd(), glob, regex}: GrepInput): Promise<GrepEntry[]> {
    const uuid = crypto.randomUUID();

    const startMessage: ActionStartMessage<GrepMessageArgs> = {
        type: 'actionStart',
        uuid,
        name: 'grep',
        args: {
            cwd,
            glob,
            regex,
        },
    };
    process.send?.(startMessage);

    try {
        const binaryName = process.platform.startsWith('win') ? 'rg.exe' : 'rg';
        const commandLineArgs = [
            '-e',
            regex,
            '--context',
            '1',
            '--json',
            '.',
        ];

        if (glob) {
            commandLineArgs.push('--glob', glob);
        }

        const result = await execa(binaryName, commandLineArgs, {
            cwd,
            reject: false,
        });

        const grepResults = parseRipGrepOutput(result.stdout);
        const entries = grepResults.flatMap(resultToEntry);

        const endMessage: ActionEndMessage<GrepMessageResult> = {
            type: 'actionEnd',
            uuid,
            result: 'success',
            data: {
                matchesCount: entries.length,
            },
        };
        process.send?.(endMessage);

        return entries;
    }
    catch (ex) {
        const endMessage: ActionEndMessage = {
            type: 'actionEnd',
            uuid,
            result: 'error',
        };
        process.send?.(endMessage);

        throw ex;
    }
}
