import {readdir, stat} from 'node:fs/promises';
import {join} from 'node:path';

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

/**
 * List directory structure recursively
 * @param options - List options
 * @returns Promise that resolves to directory entry with children
 */
export async function list({uri, depth = 1}: ListInput): Promise<ListEntry> {
    const stats = await stat(uri);
    const name = uri.split('/').pop() || uri;

    if (!stats.isDirectory() || depth === 0) {
        return {name};
    }

    const entries = await readdir(uri);
    const children = await Promise.all(
        entries.map(async entry => {
            const fullPath = join(uri, entry);
            return await list({uri: fullPath, depth: depth - 1});
        })
    );

    return {name, children};
}
