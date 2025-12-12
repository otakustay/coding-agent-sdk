/**
 * Message types for action function calls
 */

export interface ActionStartMessage<A> {
    type: 'actionStart';
    uuid: string;
    name: string;
    args: A;
}

export interface ActionEndMessage {
    type: 'actionEnd';
    uuid: string;
    result: 'success' | 'error';
}

export interface ExecMessageArgs {
    cwd?: string;
    command: string;
    argsCount: number;
}

export interface GrepMessageArgs {
    cwd: string;
    glob?: string;
    regex: string;
}

export interface ListMessageArgs {
    uri: string;
    depth: number;
}

export interface PatchMessageArgs {
    uri: string;
    addedLineCount: number;
    deletedLineCount: number;
}

export interface ReadMessageArgs {
    uri: string;
}

export interface WriteMessageArgs {
    uri: string;
    contentLineCount: number;
}
