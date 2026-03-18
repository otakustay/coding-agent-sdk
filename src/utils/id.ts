export function createIdGenerator(prefix?: string) {
    const state = {current: 1};
    return () => `${prefix ?? ''}${state.current++}`;
}

export function createIncrementCounter(start = 0) {
    const state = {current: start};
    return () => state.current++;
}
