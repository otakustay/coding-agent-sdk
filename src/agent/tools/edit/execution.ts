import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';

export interface EditToolParameters {
    file_path: string;
    old_string: string;
    new_string: string;
    replace_all?: boolean;
}

export class EditToolExecution {
    private readonly parameters: EditToolParameters;

    constructor(parameters: EditToolParameters) {
        this.parameters = parameters;
    }

    async run(): Promise<string> {
        const {
            file_path: filePath,
            old_string: oldString,
            new_string: newString,
            replace_all: replaceAll,
        } = this.parameters;

        if (oldString === newString) {
            throw new Error('oldString and newString must be different.');
        }

        if (!existsSync(filePath)) {
            throw new Error(`File ${filePath} not found`);
        }

        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
            throw new Error(`Path is a directory, not a file: ${filePath}`);
        }

        const content = await fs.readFile(filePath, 'utf8');

        const occurrences = content.split(oldString).length - 1;

        if (occurrences === 0) {
            throw new Error(`oldString not found in file '${filePath}'.`);
        }

        if (occurrences > 1 && !replaceAll) {
            const segments = [
                `oldString found ${occurrences} times in '${filePath}'.`,
                'Aborting, as replaceAll is false.',
                'Please provide a more unique oldString or set replaceAll to true.',
            ];
            throw new Error(segments.join(' '));
        }

        // TODO： Should throw if multiple occurrences when `replaceAll` is `false`
        // It is ensured that only one occurrence will be replaced if `replaceAll` is `false`
        const newContent = content.replaceAll(oldString, newString);

        await fs.writeFile(filePath, newContent, 'utf8');

        return 'Edit applied successfully.';
    }
}
