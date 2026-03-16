import OpenAI from 'openai';
import type {OpenResponsesStreamEvent} from '@openrouter/sdk/models';
import type {ModelClient, ModelClientRequest} from '../loop/modelClient.js';
import {convertInputToMessages, convertTools} from './requestConvert.js';
import {convertStreamEvents} from './responseConvert.js';

export interface OpenAIModelClientOptions {
    apiKey: string;
    baseURL?: string;
}

export class OpenAIModelClient implements ModelClient {
    private client: OpenAI;

    constructor(options: OpenAIModelClientOptions) {
        this.client = new OpenAI({
            apiKey: options.apiKey,
            baseURL: options.baseURL,
        });
    }

    async *sendStream(request: ModelClientRequest): AsyncIterable<OpenResponsesStreamEvent> {
        const messages = convertInputToMessages(request.input);
        const tools = convertTools(request.tools);

        const stream = await this.client.chat.completions.create({
            model: request.model,
            messages,
            stream: true,
            ...(tools.length > 0 ? {tools} : {}),
        });

        yield* convertStreamEvents(stream);
    }
}
