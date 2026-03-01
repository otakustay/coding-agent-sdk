import fs from 'node:fs/promises';
import path from 'node:path';
import {globby} from 'globby';
import {directories as defaultIgnoreDirectories} from 'ignore-by-default';
import {isErrorWithCode} from '../../../utils/error.js';
import type {ListToolParameters} from './definition.js';
import type {ToolImplementation} from '../interface.js';

const MAX_ITEMS = 2000;

export async function createListImplement(): Promise<ToolImplementation<ListToolParameters>> {
    return async (parameters): Promise<string> => {
        const {target_directory: targetDirectory, ignore_globs: ignoreGlobs, depth} = parameters;

        try {
            const stat = await fs.stat(targetDirectory);
            if (!stat.isDirectory()) {
                throw new Error('NotADirectoryError');
            }
        }
        catch (ex) {
            if (isErrorWithCode(ex, 'ENOENT')) {
                throw new Error('DirectoryNotFoundError', {cause: ex});
            }

            if (isErrorWithCode(ex, 'EACCES') || isErrorWithCode(ex, 'EPERM')) {
                throw new Error('PermissionError', {cause: ex});
            }

            throw ex;
        }

        const defaultIgnore = defaultIgnoreDirectories().map(dir => `**/${dir}`);
        const entries = await globby(
            ['**/*'],
            {
                cwd: targetDirectory,
                dot: false,
                onlyFiles: false,
                ignore: [...defaultIgnore, ...(ignoreGlobs ?? [])],
                deep: depth ?? Infinity,
                markDirectories: true,
                gitignore: true,
            }
        );

        if (entries.length === 0) {
            return 'The directory is empty';
        }

        const truncated = entries.length > MAX_ITEMS;
        const visibleEntries = truncated ? entries.slice(0, MAX_ITEMS) : entries;

        const dirName = path.basename(targetDirectory);
        const lines: string[] = [`${dirName}/`];

        for (const entry of visibleEntries) {
            const isDirectory = entry.endsWith('/');
            const cleanEntry = isDirectory ? entry.slice(0, -1) : entry;
            const parts = cleanEntry.split('/');
            const entryDepth = parts.length - 1;
            const name = parts[parts.length - 1] + (isDirectory ? '/' : '');
            const indent = '  '.repeat(entryDepth + 1);
            lines.push(`${indent}- ${name}`);
        }

        if (truncated) {
            lines.push(
                '',
                '',
                `total ${entries.length.toLocaleString()} files and directories.\n\nThe list tool supports up to 2,000 files and directories. Results exceeding this limit have been truncated`
            );
        }

        return lines.join('\n');
    };
}
