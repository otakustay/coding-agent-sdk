import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import type {WriteToolParameters} from './definition.js';
import type {ToolImplementation} from '../interface.js';
import {stringifyError} from '../../../utils/error.js';

export async function createWriteImplement(): Promise<ToolImplementation<WriteToolParameters>> {
    return async (parameters): Promise<string> => {
        const {file_path: filePath, content} = parameters;

        if (existsSync(filePath)) {
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) {
                throw new Error(`Path is a directory, not a file: ${filePath}`);
            }
        }

        try {
            await fs.mkdir(path.dirname(filePath), {recursive: true});
            await fs.writeFile(filePath, content, 'utf8');
        }
        catch (ex) {
            const message = stringifyError(ex);
            if (message.includes('EACCES') || message.includes('EPERM')) {
                throw new Error(`Permission denied: Cannot write to ${filePath}`, {cause: ex});
            }

            throw ex;
        }

        return 'Write file success';
    };
}
