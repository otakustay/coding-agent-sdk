import fs from 'node:fs/promises';
import {diffLines} from 'diff';
import crypto from 'node:crypto';
import type {ActionStartMessage, ActionEndMessage, PatchMessageArgs} from './interface.js';

/**
 * A patch entry that specifies a search pattern and its replacement
 */
export interface Patch {
    /** The text pattern to search for */
    search: string;
    /** The text to replace the search pattern with */
    replace: string;
}

/**
 * Input parameters for the patch function
 */
export interface PatchInput {
    /** File path to patch */
    uri: string;
    /** Search-replace patch entry */
    patch: Patch;
}

/**
 * Apply a patch to a file by searching and replacing text patterns
 * @param options - Patch options
 * @returns Promise that resolves when the patch is applied
 */
export async function patch({uri, patch}: PatchInput): Promise<void> {
    const uuid = crypto.randomUUID();
    const diff = diffLines(patch.search, patch.replace);
    const state = {added: 0, deleted: 0};

    for (const part of diff) {
        if (part.added) {
            state.added += part.count || 0;
        }
        else if (part.removed) {
            state.deleted += part.count || 0;
        }
    }

    const startMessage: ActionStartMessage<PatchMessageArgs> = {
        type: 'actionStart',
        uuid,
        name: 'patch',
        args: {
            uri,
            addedLineCount: state.added,
            deletedLineCount: state.deleted,
        },
    };
    process.send?.(startMessage);

    try {
        let content = await fs.readFile(uri, 'utf8');
        content = content.replace(patch.search, patch.replace);
        await fs.writeFile(uri, content, 'utf8');

        const endMessage: ActionEndMessage = {
            type: 'actionEnd',
            uuid,
            result: 'success',
        };
        process.send?.(endMessage);
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
