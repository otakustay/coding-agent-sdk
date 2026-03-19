interface DiscardOptions {
    silentError?: boolean;
}

export async function discard(input: AsyncIterable<unknown>, options?: DiscardOptions) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const discard of input) {
            // drain
        }
    }
    catch (ex) {
        if (!options?.silentError) {
            throw ex;
        }
    }
}
