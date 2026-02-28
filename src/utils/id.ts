export function createIdGenerator(prefix?: string) {
    const state = {current: 1};
    return () => `${prefix ?? ''}${state.current++}`;
}
