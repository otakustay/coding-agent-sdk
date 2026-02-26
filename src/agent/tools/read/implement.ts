import {readFile} from 'node:fs/promises';
import type {ReadToolParameters} from './definition.js';
import type {ToolImplementation} from '../interface.js';

export async function createReadImplement(): Promise<ToolImplementation<ReadToolParameters>> {
    return async (parameters): Promise<string> => {
        const content = await readFile(parameters.file, 'utf8');
        return content;
    };
}
