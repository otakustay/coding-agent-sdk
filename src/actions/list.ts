import crypto from 'node:crypto';
import {globby} from 'globby';
import type {ActionStartMessage, ActionEndMessage, ListMessageArgs} from './interface.js';

/**
 * Input parameters for the list function
 */
export interface ListInput {
    /** Directory path to list */
    uri: string;
    /** Maximum depth to traverse (default: 1) */
    depth?: number;
}

/**
 * List directory structure recursively
 *
 * Returns a formatted string representation of the directory contents where:
 *
 * - Each line represents one file or directory within the specified path
 * - Indentation (2 spaces per level) indicates nesting depth relative to the target directory
 * - Directories end with a trailing slash (/)
 * - Files do not have a trailing slash
 * - The target directory itself is not included in the output
 *
 * Example output for listing 'src/':
 *
 * ```
 * actions/
 *   exec.ts
 *   grep.ts
 * run.ts
 * ```
 *
 * @param input - List options including uri (directory path) and depth (traversal depth, default: 1)
 * @returns Promise that resolves to a formatted string of the directory structure
 */
export async function list(input: ListInput): Promise<string> {
    const uuid = crypto.randomUUID();

    const startMessage: ActionStartMessage<ListMessageArgs> = {
        type: 'actionStart',
        uuid,
        name: 'list',
        args: {
            uri: input.uri,
            depth: input.depth ?? 1,
        },
    };
    process.send?.(startMessage);

    try {
        const depth = input.depth ?? 1;

        const files = await globby(
            '**',
            {
                cwd: input.uri,
                gitignore: true,
                onlyFiles: false,
                markDirectories: true,
                deep: depth === 0 ? 0 : depth + 1,
                dot: true,
                ignore: ['.git'],
            }
        );

        const lines: string[] = [];

        const sortedFiles = files.toSorted();
        for (const file of sortedFiles) {
            const isDirectory = file.endsWith('/');
            const cleanPath = isDirectory ? file.slice(0, -1) : file;
            const parts = cleanPath.split('/');
            const name = parts[parts.length - 1] + (isDirectory ? '/' : '');
            const depthLevel = parts.length - 1;
            const indent = '  '.repeat(depthLevel);
            lines.push(`${indent}${name}`);
        }

        const result = lines.join('\n');

        const endMessage: ActionEndMessage = {
            type: 'actionEnd',
            uuid,
            result: 'success',
        };
        process.send?.(endMessage);

        return result;
    }
    catch (ex) {
        const endMessage: ActionEndMessage = {
            type: 'actionEnd',
            uuid,
            result: 'error',
        };
        process.send?.(endMessage);

        throw ex;
    }
}
