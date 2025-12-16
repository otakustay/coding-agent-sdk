import type {ActionStartMessage, ActionEndMessage} from '../../actions/index.js';

export type ActionMessage = ActionStartMessage<any> | ActionEndMessage;
export interface EvaluateInput {
    name: string;
    code?: string;
    reusable?: boolean;
    description?: string;
    dependencies?: string[];
}

export interface ExecuteResult {
    exitCode: number;
    output: string;
    error?: string | undefined;
    actions: ActionMessage[];
}

export interface ErrorResult {
    error: string;
    actions: ActionMessage[];
}

export type EvaluateResult = ExecuteResult | ErrorResult;
