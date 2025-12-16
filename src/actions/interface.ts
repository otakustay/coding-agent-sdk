/**
 * Message types for action function calls
 */

export interface ActionStartMessage<A> {
    type: 'actionStart';
    uuid: string;
    name: string;
    args: A;
}

export interface ActionEndMessage<R = undefined> {
    type: 'actionEnd';
    uuid: string;
    result: 'success' | 'error';
    data?: R;
}

export interface ExecMessageArgs {
    cwd?: string;
    command: string;
    argsCount: number;
}

export interface ExecMessageResult {
    exitCode: number;
}

export interface GrepMessageArgs {
    cwd: string;
    glob?: string;
    regex: string;
}

export interface GrepMessageResult {
    matchesCount: number;
}

export interface ListMessageArgs {
    uri: string;
    depth: number;
}

export interface PatchMessageArgs {
    uri: string;
}

export interface PatchMessageResult {
    addedLineCount: number;
    deletedLineCount: number;
}

export interface ReadMessageArgs {
    uri: string;
}

export interface WriteMessageArgs {
    uri: string;
}

export interface WriteMessageResult {
    contentLinesCount: number;
}
