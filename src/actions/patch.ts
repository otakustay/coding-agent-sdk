import {readFile, writeFile} from 'node:fs/promises';

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
    /** Array of search-replace patch entries */
    patches: Patch[];
}

/**
 * Apply multiple patches to a file by searching and replacing text patterns
 * @param options - Patch options
 * @returns Promise that resolves when all patches are applied
 */
export async function patch({uri, patches}: PatchInput): Promise<void> {
    let content = await readFile(uri, 'utf8');

    for (const {search, replace} of patches) {
        content = content.replace(search, replace);
    }

    await writeFile(uri, content, 'utf8');
}
