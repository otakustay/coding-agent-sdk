/**
 * Use it in default case in switch statement to ensure no possible type is missing from the union,
 * always use it with generic argument like `assertNever<{type: string}>(...)`.
 *
 * @param value - The value to assert never.
 * @param stringify - A function to convert the value to a string for the error message.
 * @returns Never.
 * @example
 * assertNever<{type: string}>(chunk, c => `Unknown chunk type: ${c.type}`);
 */
export function assertNever<T = unknown>(value: never, stringify: (value: T) => string): never {
    throw new Error(stringify(value));
}

/**
 * Converts an error to a string message.
 *
 * @param error - The error to stringify.
 * @returns The error message if it's an Error instance, otherwise the string representation.
 */
export function stringifyError(error: unknown) {
    return error instanceof Error ? error.message : `${error}`;
}

interface ErrorWithCode extends Error {
    code: string;
}

/**
 * Checks whether an error has a specific `code` property value.
 *
 * @param error - The value to check.
 * @param code - The expected error code.
 * @returns `true` if `error` is an `Error` instance with the given `code`.
 */
export function isErrorWithCode(error: unknown, code: string): error is ErrorWithCode {
    return error instanceof Error && 'code' in error && error.code === code;
}
