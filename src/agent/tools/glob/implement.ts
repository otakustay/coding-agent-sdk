import path from 'node:path';
import fs from 'node:fs/promises';
import {globby} from 'globby';
import type {GlobToolParameters} from './definition.js';
import type {ToolImplementation} from '../interface.js';

const MAX_FILES = 100;

export async function createGlobImplement(): Promise<ToolImplementation<GlobToolParameters>> {
    return async (parameters): Promise<string> => {
        const {pattern, target_directory: targetDirectory} = parameters;

        const searchDir = path.resolve(targetDirectory ?? '.');

        try {
            await fs.access(searchDir);
        }
        catch {
            throw new Error(`Directory not found: ${searchDir}`);
        }

        const stat = await fs.stat(searchDir);
        if (!stat.isDirectory()) {
            throw new Error(`Directory not found: ${searchDir}`);
        }

        const normalizedPattern = pattern.startsWith('**/') ? pattern : `**/${pattern}`;

        const files = await globby(normalizedPattern, {cwd: searchDir, absolute: true});

        if (files.length === 0) {
            return 'No files found';
        }

        const filesWithMtime = await Promise.all(
            files.map(async filePath => {
                const fileStat = await fs.stat(filePath).catch(() => null);
                return {filePath, mtime: fileStat?.mtimeMs ?? 0};
            })
        );

        filesWithMtime.sort((a, b) => b.mtime - a.mtime);

        const sortedPaths = filesWithMtime.map(f => f.filePath);
        const truncated = sortedPaths.length > MAX_FILES;
        const output = truncated ? sortedPaths.slice(0, MAX_FILES) : sortedPaths;

        const result = output.join('\n');
        if (truncated) {
            return `${result}\n\n(Results are truncated. Consider using a more specific pattern.)`;
        }

        return result;
    };
}
