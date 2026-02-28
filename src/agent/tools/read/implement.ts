import fs from 'node:fs/promises';
import {truncateLine} from '../../../utils/string.js';
import type {ToolImplementation} from '../interface.js';
import type {ReadToolParameters} from './definition.js';

const MAX_LINE_LENGTH = 2000;

const MAX_LINES = 2000;

export async function createReadImplement(): Promise<ToolImplementation<ReadToolParameters>> {
    return async (parameters): Promise<string> => {
        const {target_file: targetFile} = parameters;
        const content = await fs.readFile(targetFile, 'utf8');
        const lines = content.split('\n');

        const startLine = parameters.offset ? Math.max(0, parameters.offset - 1) : 0;
        const maxLines = parameters.limit ?? MAX_LINES;
        const endLine = Math.min(startLine + maxLines, lines.length);
        const slicedLines = lines.slice(startLine, endLine);

        // Format with line numbers (cat -n style) and truncate long lines
        const formatLine = (line: string, index: number): string => {
            const lineNumber = startLine + index + 1;
            const truncatedLine = truncateLine(line, MAX_LINE_LENGTH);
            return `${lineNumber.toString().padStart(6, ' ')}\t${truncatedLine}`;
        };
        const output = slicedLines.map(formatLine);

        // Add truncation notice if needed
        if (lines.length > MAX_LINES && !parameters.limit) {
            output.push(
                '',
                '',
                `(File has a total of ${lines.length} lines. Use 'offset' parameter to read beyond line ${MAX_LINES}.)`
            );
        }

        return output.join('\n');
    };
}
