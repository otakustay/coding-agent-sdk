import {OpenRouterModelClient} from './openrouter/index.js';
import {OpenAIModelClient} from './openai/index.js';
import {AnthropicModelClient} from './anthropic/index.js';
import type {ModelClient} from './interface.js';

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

    return new OpenRouterModelClient({apiKey});
}
