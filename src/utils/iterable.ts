export async function discard(input: AsyncIterable<unknown>) {
    const iterator = input[Symbol.asyncIterator]();
    while (true) {
        const {done} = await iterator.next();
        if (done) {
            break;
        }
    }
}
