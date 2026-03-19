import type {
    OpenResponsesInput,
    OpenResponsesRequestToolFunction,
    OpenResponsesStreamEvent,
} from '@openrouter/sdk/models';

export type OpenResponsesInputArray = Exclude<OpenResponsesInput, string>;

export interface ModelClientRequest {
    model: string;
    input: OpenResponsesInputArray;
    tools: OpenResponsesRequestToolFunction[];
}

export interface ModelClient {
    sendStream(request: ModelClientRequest): AsyncIterable<OpenResponsesStreamEvent>;
}
