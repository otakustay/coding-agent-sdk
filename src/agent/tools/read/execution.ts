import fs from 'node:fs/promises';
import {truncateLine} from '../../../utils/string.js';

export interface ReadToolParameters {
    target_file: string;
    offset?: number;
    limit?: number;
}

export class ReadToolExecution {
    private static readonly MAX_LINE_LENGTH = 2000;
    private static readonly MAX_LINES = 2000;
    private readonly parameters: ReadToolParameters;

    constructor(parameters: ReadToolParameters) {
        this.parameters = parameters;
    }

    async run(): Promise<string> {
        const {target_file: targetFile} = this.parameters;
        const content = await fs.readFile(targetFile, 'utf8');
        const lines = content.split('\n');

        const startLine = this.parameters.offset ? Math.max(0, this.parameters.offset - 1) : 0;
        const maxLines = this.parameters.limit ?? ReadToolExecution.MAX_LINES;
        const endLine = Math.min(startLine + maxLines, lines.length);
        const slicedLines = lines.slice(startLine, endLine);

        // Format with line numbers (cat -n style) and truncate long lines
        const output = slicedLines.map((line, index) => this.formatLine(line, index, startLine));

        // limit: 0 is treated as "no limit" (same as omitting the parameter)
        if (lines.length > ReadToolExecution.MAX_LINES && !this.parameters.limit) {
            output.push(
                '',
                '',
                `(File has a total of ${lines.length} lines. Use 'offset' parameter to read beyond line ${ReadToolExecution.MAX_LINES}.)`
            );
        }

        return output.join('\n');
    }

    private formatLine(line: string, index: number, startLine: number): string {
        const lineNumber = startLine + index + 1;
        const truncated = truncateLine(line, ReadToolExecution.MAX_LINE_LENGTH);
        return `${lineNumber.toString().padStart(6, ' ')}\t${truncated}`;
    }
}
