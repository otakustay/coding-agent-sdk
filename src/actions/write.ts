import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import type {ActionStartMessage, ActionEndMessage, WriteMessageArgs, WriteMessageResult} from './interface.js';

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
    const uuid = crypto.randomUUID();

    const startMessage: ActionStartMessage<WriteMessageArgs> = {
        type: 'actionStart',
        uuid,
        name: 'write',
        args: {
            uri,
        },
    };
    process.send?.(startMessage);

    try {
        await fs.writeFile(uri, content, 'utf8');

        const endMessage: ActionEndMessage<WriteMessageResult> = {
            type: 'actionEnd',
            uuid,
            result: 'success',
            data: {
                contentLinesCount: content.split('\n').length,
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
