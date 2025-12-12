import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type {ActionStartMessage, ActionEndMessage, ListMessageArgs} from './interface.js';

/**
 * A directory or file entry in the file system tree
 */
export interface ListEntry {
    /** Name of the file or directory */
    name: string;
    /** Child entries if this is a directory */
    children?: ListEntry[];
}

/**
 * Input parameters for the list function
 */
export interface ListInput {
    /** Directory path to list */
    uri: string;
    /** Maximum depth to traverse (default: 1) */
    depth?: number;
}

async function directory({uri, depth = 1}: ListInput): Promise<ListEntry> {
    const stats = await fs.stat(uri);
    const name = uri.split('/').pop() || uri;

    if (!stats.isDirectory() || depth === 0) {
        return {name};
    }

    const entries = await fs.readdir(uri);
    const children = await Promise.all(entries.map(v => directory({uri: path.join(uri, v), depth: depth - 1})));

    return {name, children};
}

/**
 * List directory structure recursively
 * @param options - List options
 * @returns Promise that resolves to directory entry with children
 */
export async function list(input: ListInput): Promise<ListEntry> {
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
        const result = await directory(input);

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
