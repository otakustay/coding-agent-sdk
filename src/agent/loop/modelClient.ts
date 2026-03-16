import type {OpenRouter} from '@openrouter/sdk';
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

export class OpenRouterModelClient implements ModelClient {
    private client: OpenRouter;

    constructor(client: OpenRouter) {
        this.client = client;
    }

    async *sendStream(request: ModelClientRequest): AsyncIterable<OpenResponsesStreamEvent> {
        const response = await this.client.beta.responses.send({
            stream: true,
            model: request.model,
            input: request.input,
            ...(request.tools.length > 0 ? {tools: request.tools} : {}),
        });
        yield* response;
    }
}
