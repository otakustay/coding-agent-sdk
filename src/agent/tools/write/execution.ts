import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {stringifyError} from '../../../utils/error.js';

export interface WriteToolParameters {
    file_path: string;
    content: string;
}

export class WriteToolExecution {
    private readonly parameters: WriteToolParameters;

    constructor(parameters: WriteToolParameters) {
        this.parameters = parameters;
    }

    async run(): Promise<string> {
        const {file_path: filePath, content} = this.parameters;

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
    }
}
