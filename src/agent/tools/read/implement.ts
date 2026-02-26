import {readFile} from 'node:fs/promises';
import type {ReadToolParameters} from './definition.js';
import type {ToolExecutionContext} from '../interface.js';

export async function createReadImplement() {
    return async (parameters: ReadToolParameters, _context: ToolExecutionContext): Promise<string> => {
        const content = await readFile(parameters.file, 'utf8');
        return content;
    };
}