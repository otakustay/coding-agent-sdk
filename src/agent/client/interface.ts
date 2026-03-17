import type {
    OpenResponsesInput,
    OpenResponsesRequestToolFunction,
    OpenResponsesStreamEvent,
} from '@openrouter/sdk/models';

export interface ModelClientRequest {
    model: string;
    input: OpenResponsesInput;
    tools: OpenResponsesRequestToolFunction[];
}

export interface ModelClient {
    sendStream(request: ModelClientRequest): AsyncIterable<OpenResponsesStreamEvent>;
}
