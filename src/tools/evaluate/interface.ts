export interface EvaluateInput {
    name: string;
    reusable?: boolean;
    dependencies?: string[];
    code: string;
}

export interface ExecuteResult {
    exitCode: number;
    output: string;
    error?: string | undefined;
}

export interface ErrorResult {
    error: string;
}

export type EvaluateResult = ExecuteResult | ErrorResult;
