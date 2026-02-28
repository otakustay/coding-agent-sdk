import {execa} from 'execa';

const MAX_LINE_LENGTH = 2000;

interface RgMatchData {
    path: {text: string};
    lines: {text: string};
    line_number: number;
}

interface RgJsonLine {
    type: string;
    data: RgMatchData;
}

interface FileMatchEntry {
    lineNumber: number;
    text: string;
}

function truncateLine(line: string): string {
    return line.length > MAX_LINE_LENGTH ? line.slice(0, MAX_LINE_LENGTH) + '...' : line;
}

function applySlice(lines: string[], offset: number, headLimit: number | undefined): string[] {
    const sliced = offset > 0 ? lines.slice(offset) : lines;
    return typeof headLimit === 'number' && headLimit > 0 ? sliced.slice(0, headLimit) : sliced;
}

interface FormatContentOptions {
    headLimit: number | undefined;
    offset: number;
    showLineNumbers: boolean;
}

function formatContentOutput(stdout: string, options: FormatContentOptions): string {
    const {headLimit, offset, showLineNumbers} = options;
    const jsonLines = stdout.split('\n').filter(l => l.trim());

    const fileOrder: string[] = [];
    const fileMatches = new Map<string, FileMatchEntry[]>();
    const state = {totalMatches: 0};

    for (const jsonLine of jsonLines) {
        try {
            const parsed: RgJsonLine = JSON.parse(jsonLine);

            if (parsed.type !== 'match' && parsed.type !== 'context') {
                continue;
            }

            const {path, lines, line_number} = parsed.data;
            const filePath = path.text;

            if (!fileMatches.has(filePath)) {
                fileMatches.set(filePath, []);
                fileOrder.push(filePath);
            }

            const fileEntry = fileMatches.get(filePath) ?? [];
            fileMatches.set(filePath, fileEntry);
            fileEntry.push({lineNumber: line_number, text: lines.text.replace(/\n$/, '')});

            if (parsed.type === 'match') {
                state.totalMatches++;
            }
        }
        catch {
            continue;
        }
    }

    if (fileOrder.length === 0) {
        return 'No matches found';
    }

    const outputLines: string[] = [];
    for (const filePath of fileOrder) {
        outputLines.push(`${filePath}:`);
        for (const match of fileMatches.get(filePath) ?? []) {
            const linePrefix = showLineNumbers ? `Line ${match.lineNumber}: ` : '';
            outputLines.push(`  ${linePrefix}${truncateLine(match.text)}`);
        }
        outputLines.push('');
    }

    const sliced = applySlice(outputLines, offset, headLimit);
    return `Found ${state.totalMatches} matches\n\n${sliced.join('\n')}`;
}

function formatLinesOutput(stdout: string, headLimit: number | undefined, offset: number, outputMode: string): string {
    if (!stdout.trim()) {
        return 'No matches found';
    }

    const outputLines = stdout.split('\n').filter(l => l.trim());
    const lines = outputMode === 'count'
        ? outputLines.map(v => v.replace(/:(\d+)$/, ': $1')) // rg --count outputs "path:N", reformat to "path: N"
        : outputLines;
    const sliced = applySlice(lines, offset, headLimit);
    return sliced.join('\n');
}

export interface RgCommandOptions {
    args: string[];
    outputMode: string;
    headLimit: number | undefined;
    offset: number;
    showLineNumbers: boolean;
}

export async function runRgCommand(options: RgCommandOptions): Promise<string> {
    const {args, outputMode, headLimit, offset, showLineNumbers} = options;
    const result = await execa('rg', args, {reject: false, all: true});
    const exitCode = result.exitCode ?? 2;

    if (exitCode === 2) {
        throw new Error(result.stderr || 'Search failed');
    }

    if (exitCode === 1 || !result.stdout?.trim()) {
        return 'No matches found';
    }

    if (outputMode === 'content') {
        return formatContentOutput(result.stdout, {headLimit, offset, showLineNumbers});
    }

    return formatLinesOutput(result.stdout, headLimit, offset, outputMode);
}
