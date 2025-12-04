import {readFile} from 'node:fs/promises';

/**
 * Input parameters for the read function
 */
export interface ReadInput {
    /** File path to read */
    uri: string;
}

/**
 * Read file content from the specified URI
 * @param options - Read options
 * @returns Promise that resolves to file content as string
 */
export async function read({uri}: ReadInput): Promise<string> {
    return await readFile(uri, 'utf8');
}
