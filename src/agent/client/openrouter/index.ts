import {OpenRouter} from '@openrouter/sdk';
import type {OpenResponsesStreamEvent} from '@openrouter/sdk/models';
import type {ModelClient, ModelClientRequest} from '../interface.js';

export interface OpenRouterModelClientOptions {
    apiKey: string;
}

export class OpenRouterModelClient implements ModelClient {
    private client: OpenRouter;

    constructor(options: OpenRouterModelClientOptions) {
        this.client = new OpenRouter({
            apiKey: options.apiKey,
        });
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
