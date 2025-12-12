import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import type {ActionStartMessage, ActionEndMessage, ReadMessageArgs} from './interface.js';

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
    const uuid = crypto.randomUUID();

    const startMessage: ActionStartMessage<ReadMessageArgs> = {
        type: 'actionStart',
        uuid,
        name: 'read',
        args: {
            uri,
        },
    };
    process.send?.(startMessage);

    try {
        const content = await fs.readFile(uri, 'utf8');

        const endMessage: ActionEndMessage = {
            type: 'actionEnd',
            uuid,
            result: 'success',
        };
        process.send?.(endMessage);

        return content;
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
