import {assertNever} from '../../utils/error.js';
import {OpenRouterModelClient} from './openrouter/index.js';
import {OpenAIModelClient} from './openai/index.js';
import {AnthropicModelClient} from './anthropic/index.js';
import type {ModelClient} from './interface.js';

export type ModelProvider = 'OpenAI' | 'Anthropic' | 'OpenRouter';

export interface CreateClientOptions {
    provider?: ModelProvider | undefined;
    apiKey?: string | undefined;
    baseURL?: string | undefined;
}

export function createClient(options: CreateClientOptions): ModelClient {
    const {provider = 'OpenRouter', apiKey, baseURL} = options;

    if (!apiKey) {
        throw new Error('apiKey is required to create a model client');
    }

    switch (provider) {
        case 'OpenAI':
            return new OpenAIModelClient({apiKey, ...(baseURL ? {baseURL} : {})});
        case 'Anthropic':
            return new AnthropicModelClient({apiKey, ...(baseURL ? {baseURL} : {})});
        case 'OpenRouter':
            return new OpenRouterModelClient({apiKey});
        default:
            assertNever<{provider: string}>(provider, v => `Unknown provider: ${v.provider}`);
    }
}
