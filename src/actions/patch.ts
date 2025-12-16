import fs from 'node:fs/promises';
import {diffLines} from 'diff';
import crypto from 'node:crypto';
import type {ActionStartMessage, ActionEndMessage, PatchMessageArgs, PatchMessageResult} from './interface.js';

/**
 * Apply a patch to a file by searching and replacing text patterns
 *
 * The search parameter can be either:
 *
 * 1. A string pattern to search for directly
 * 2. A function that transforms the entire file content to extract the exact text to replace
 *
 * Using a function for search is beneficial when:
 *
 * - The search block is large and transcribing it manually is error-prone
 * - You need to dynamically locate the replacement target based on file structure
 * - The exact text position varies but can be computed from the full content
 *
 * To use a function as search parameter, it's important to strictly align with these:
 *
 * 1. You MUST have fully read the file section you intend to replace before writing the search function
 * 2. Ensure you know the exact content to be replaced, including all whitespace and formatting
 * 3. The replace text MUST match the indentation structure of source code, especially the first line
 *
 * @example
 * // Direct string search
 * await patch({
 *     uri: 'path/to/file.ts',
 *     search: 'old text',
 *     replace: 'new text'
 * });
 *
 * @example
 * // Function-based search, be aware of indentation on replace string
 * await patch({
 *     uri: 'path/to/file.ts',
 *     search: (content) => {
 *         // Extract the exact text block you want to replace
 *         const match = content.match(/function foo\(\) \{[\s\S]*?\n\}/);
 *         return match ? match[0] : '';
 *     },
 *     replace: '    function foo() {\n    // new implementation\n}'
 * });
 *
 * @param uri - File path to patch
 * @param search - The text pattern to search for, or a function that extracts the target text from file content
 * @param replace - The text to replace the search pattern with
 * @returns Promise that resolves when the patch is applied
 */
export async function patch({
    uri,
    search,
    replace,
}: {
    uri: string;
    search: string | ((content: string) => string);
    replace: string;
}): Promise<void> {
    const uuid = crypto.randomUUID();

    const startMessage: ActionStartMessage<PatchMessageArgs> = {
        type: 'actionStart',
        uuid,
        name: 'patch',
        args: {
            uri,
        },
    };
    process.send?.(startMessage);

    try {
        const content = await fs.readFile(uri, 'utf8');
        const searchPattern = typeof search === 'function' ? search(content) : search;
        const diff = diffLines(searchPattern, replace);
        const state = {added: 0, deleted: 0};

        for (const part of diff) {
            if (part.added) {
                state.added += part.count || 0;
            }
            else if (part.removed) {
                state.deleted += part.count || 0;
            }
        }

        const newContent = content.replace(searchPattern, replace);
        await fs.writeFile(uri, newContent, 'utf8');

        const endMessage: ActionEndMessage<PatchMessageResult> = {
            type: 'actionEnd',
            uuid,
            result: 'success',
            data: {
                addedLineCount: state.added,
                deletedLineCount: state.deleted,
            },
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
