import {writeFile} from 'node:fs/promises';

/**
 * Input parameters for the write function
 */
export interface WriteInput {
    /** File path to write */
    uri: string;
    /** Content to write to the file */
    content: string;
}

/**
 * Write content to the specified file URI
 * @param options - Write options
 * @returns Promise that resolves when write is complete
 */
export async function write({uri, content}: WriteInput): Promise<void> {
    await writeFile(uri, content, 'utf8');
}
