import {z} from 'zod';
import {OpenRouter} from '@openrouter/sdk';
import type {OpenResponsesRequestToolFunction} from '@openrouter/sdk/models';
import type {AgentWorkItem, StreamChunk} from './interface.js';
import {transformWorkItemsToInput} from './transform.js';
import type {ToolDefinition, ToolImplementation} from '../tools/interface.js';

interface RegisteredTool {
    definition: ToolDefinition;
    implement: ToolImplementation;
}

export class AgentLoop {
    private client: OpenRouter;
    private model: string;
    private items: AgentWorkItem[] = [];
    private tools = new Map<string, RegisteredTool>();

    constructor(apiKey: string, model: string) {
        this.client = new OpenRouter({apiKey});
        this.model = model;
    }

    registerTool(definition: ToolDefinition, implement: ToolImplementation): void {
        this.tools.set(definition.name, {definition, implement});
    }

    private buildToolDefinitions(): OpenResponsesRequestToolFunction[] {
        const tools: OpenResponsesRequestToolFunction[] = [];
        for (const {definition} of this.tools.values()) {
            const jsonSchema = z.toJSONSchema(definition.inputSchema);
            tools.push({
                type: 'function',
                name: definition.name,
                description: definition.description,
                parameters: jsonSchema as Record<string, unknown>,
            });
        }
        return tools;
    }

    /**
     * Submit a user query and stream chunks with status (open/completed).
     * Consumers can unify handling: find by id (create if not found), then merge fields.
     *
     * @param userQuery - The user's input query
     * @yields StreamChunk - Chunks with type, id, status, and optional fields to merge
     */
    async *submitUserQuery(userQuery: string): AsyncGenerator<StreamChunk, void, undefined> {
        // Add user message to items
        const userItem: AgentWorkItem = {
            type: 'input.user',
            content: [{type: 'text', content: userQuery}],
        };
        this.items.push(userItem);

        // Send request with streaming
        const toolDefinitions = this.buildToolDefinitions();
        const response = await this.client.beta.responses.send({
            stream: true,
            model: this.model,
            input: transformWorkItemsToInput(this.items),
            ...(toolDefinitions.length > 0 ? {tools: toolDefinitions} : {}),
        });

        // Stream events and yield chunks
        for await (const event of response) {
            // Handle error events
            if (event.type === 'error') {
                throw new Error(event.message ?? 'Unknown error occurred');
            }

            if (event.type === 'response.failed') {
                throw new Error(event.response.error?.message ?? 'Response failed');
            }

            // Handle output_item.added - create new item
            if (event.type === 'response.output_item.added') {
                const {item} = event;

                if (item.type === 'reasoning') {
                    this.items.push({
                        type: 'output.reasoning',
                        id: item.id,
                        status: 'open',
                        content: '',
                        summary: '',
                    });
                    yield {
                        type: 'output.reasoning',
                        id: item.id,
                        status: 'open',
                    };
                }
                else if (item.type === 'message') {
                    this.items.push({
                        type: 'output.text',
                        id: item.id,
                        status: 'open',
                        content: '',
                    });
                    yield {
                        type: 'output.text',
                        id: item.id,
                        status: 'open',
                    };
                }
                else if (item.type === 'function_call') {
                    const functionCallItem = item as Extract<typeof item, {type: 'function_call'}>;
                    this.items.push({
                        type: 'output.toolCall',
                        id: functionCallItem.id ?? '',
                        status: 'open',
                        callId: functionCallItem.callId ?? '',
                        name: functionCallItem.name ?? '',
                        arguments: '',
                    });
                    yield {
                        type: 'output.toolCall',
                        id: functionCallItem.id ?? '',
                        status: 'open',
                        callId: functionCallItem.callId ?? '',
                        name: functionCallItem.name ?? '',
                    };
                }

                continue;
            }

            // Handle content_part.added - prepare for content parts
            if (event.type === 'response.content_part.added') {
                continue;
            }

            // Handle delta events - yield content updates
            if (event.type === 'response.output_text.delta') {
                const item = this.items.findLast(i => i.type === 'output.text' && i.id === event.itemId);
                if (item && item.type === 'output.text') {
                    item.content += event.delta;
                }
                yield {
                    type: 'output.text',
                    id: event.itemId,
                    status: 'open',
                    content: event.delta,
                };
                continue;
            }

            if (event.type === 'response.reasoning_text.delta') {
                const item = this.items.findLast(i => i.type === 'output.reasoning' && i.id === event.itemId);
                if (item && item.type === 'output.reasoning') {
                    item.content += event.delta;
                }
                yield {
                    type: 'output.reasoning',
                    id: event.itemId,
                    status: 'open',
                    content: event.delta,
                };
                continue;
            }

            if (event.type === 'response.reasoning_summary_text.delta') {
                const item = this.items.findLast(i => i.type === 'output.reasoning' && i.id === event.itemId);
                if (item && item.type === 'output.reasoning') {
                    item.summary += event.delta;
                }
                yield {
                    type: 'output.reasoning',
                    id: event.itemId,
                    status: 'open',
                    summary: event.delta,
                };
                continue;
            }

            if (event.type === 'response.function_call_arguments.delta') {
                const item = this.items.findLast(i => i.type === 'output.toolCall' && i.id === event.itemId);
                if (item && item.type === 'output.toolCall') {
                    item.arguments += event.delta;
                }
                yield {
                    type: 'output.toolCall',
                    id: event.itemId,
                    status: 'open',
                    arguments: event.delta,
                };
                continue;
            }

            if (event.type === 'response.refusal.delta') {
                const item = this.items.findLast(i => i.type === 'output.text' && i.id === event.itemId);
                if (item && item.type === 'output.text') {
                    item.content += event.delta;
                }
                yield {
                    type: 'output.text',
                    id: event.itemId,
                    status: 'open',
                    content: event.delta,
                };
                continue;
            }

            // Handle done events - mark as completed
            if (event.type === 'response.output_item.done') {
                const matchId = event.item.type === 'function_call'
                    ? event.item.id ?? event.item.callId
                    : event.item.id;

                const item = this.items.findLast(
                    i => (i.type === 'output.reasoning'
                        || i.type === 'output.reasoningSummary'
                        || i.type === 'output.text'
                        || i.type === 'output.toolCall')
                        && i.id === matchId
                );

                if (item) {
                    if (
                        item.type === 'output.reasoning'
                        || item.type === 'output.reasoningSummary'
                        || item.type === 'output.text'
                        || item.type === 'output.toolCall'
                    ) {
                        item.status = 'completed';
                    }

                    if (item.type === 'output.reasoning') {
                        yield {type: 'output.reasoning', id: item.id, status: 'completed'};
                    }
                    else if (item.type === 'output.text') {
                        yield {type: 'output.text', id: item.id, status: 'completed'};
                    }
                    else if (item.type === 'output.toolCall') {
                        yield {type: 'output.toolCall', id: item.id, status: 'completed'};
                    }
                }
                continue;
            }
        }
    }
}
