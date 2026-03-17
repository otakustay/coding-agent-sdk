import AnthropicClient from '@anthropic-ai/sdk';
import type {OpenResponsesStreamEvent} from '@openrouter/sdk/models';
import type {ModelClient, ModelClientRequest} from '../interface.js';
import {convertInputToAnthropicParams, convertAnthropicTools} from './request.js';
import {convertAnthropicStreamEvents} from './response.js';

export interface AnthropicModelClientOptions {
    apiKey: string;
    baseURL?: string;
    maxTokens?: number;
}

const DEFAULT_MAX_TOKENS = 16_384;

export class AnthropicModelClient implements ModelClient {
    private client: AnthropicClient;
    private maxTokens: number;

    constructor(options: AnthropicModelClientOptions) {
        this.client = new AnthropicClient({
            apiKey: options.apiKey,
            ...(options.baseURL ? {baseURL: options.baseURL} : {}),
        });
        this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    }

    async *sendStream(request: ModelClientRequest): AsyncIterable<OpenResponsesStreamEvent> {
        const {system, messages} = convertInputToAnthropicParams(request.input);
        const tools = convertAnthropicTools(request.tools);

        const stream = await this.client.messages.create({
            model: request.model,
            max_tokens: this.maxTokens,
            messages,
            stream: true,
            ...(system ? {system} : {}),
            ...(tools.length > 0 ? {tools} : {}),
        });

        yield* convertAnthropicStreamEvents(stream);
    }
}
