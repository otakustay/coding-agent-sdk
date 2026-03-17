import {OpenRouter} from '@openrouter/sdk';
import {OpenRouterModelClient} from './loop/modelClient.js';
import {OpenAIModelClient} from './adapter/openai.js';
import {AnthropicModelClient} from './adapter/anthropic.js';
import type {ModelClient} from './loop/modelClient.js';

export interface CreateClientOptions {
    provider?: string | undefined;
    apiKey?: string | undefined;
    baseURL?: string | undefined;
}

export function createClient(options: CreateClientOptions): ModelClient {
    const {provider = 'OpenRouter', apiKey, baseURL} = options;

    if (!apiKey) {
        throw new Error('apiKey is required to create a model client');
    }

    if (provider === 'OpenAI') {
        return new OpenAIModelClient({apiKey, ...(baseURL ? {baseURL} : {})});
    }

    if (provider === 'Anthropic') {
        return new AnthropicModelClient({apiKey, ...(baseURL ? {baseURL} : {})});
    }

    return new OpenRouterModelClient(new OpenRouter({apiKey, ...(baseURL ? {baseURL} : {})}));
}
