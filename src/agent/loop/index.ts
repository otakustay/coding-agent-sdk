import {OpenRouter} from '@openrouter/sdk';
import type {AgentWorkItem, WorkItemStreamEvent} from './interface.js';
import {transformWorkItemsToInput} from './transform.js';

export class AgentLoop {
    private client: OpenRouter;
    private model: string;
    private items: AgentWorkItem[] = [];

    constructor(apiKey: string, model: string) {
        this.client = new OpenRouter({apiKey});
        this.model = model;
    }

    /**
     * Submit a user query and stream work item events (added, delta, done) as they arrive.
     * Items are updated in real-time with each delta to ensure maximum data preservation.
     *
     * @param userQuery - The user's input query
     * @yields WorkItemStreamEvent - Stream events in the format of type.action (e.g., text.delta, reasoning.added)
     */
    async *submitUserQuery(userQuery: string): AsyncGenerator<WorkItemStreamEvent, void, undefined> {
        // Add user message to items
        const userItem: AgentWorkItem = {
            type: 'input.user',
            content: [{type: 'text', content: userQuery}],
        };
        this.items.push(userItem);

        // Send request with streaming
        const response = await this.client.beta.responses.send({
            stream: true,
            model: this.model,
            input: transformWorkItemsToInput(this.items),
        });

        // Stream events and yield items
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
                    yield {type: 'reasoning.added', id: item.id};
                }
                else if (item.type === 'message') {
                    this.items.push({
                        type: 'output.text',
                        id: item.id,
                        status: 'open',
                        content: '',
                    });
                    yield {type: 'text.added', id: item.id};
                }
                else if (item.type === 'function_call') {
                    // Type narrowing for function_call
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
                        type: 'toolCall.added',
                        id: functionCallItem.id ?? '',
                        callId: functionCallItem.callId ?? '',
                        name: functionCallItem.name ?? '',
                    };
                }

                continue;
            }

            // Handle content_part.added - prepare for content parts
            if (event.type === 'response.content_part.added') {
                // No need to yield, already handled in output_item.added
                continue;
            }

            // Handle delta events - accumulate content
            if (event.type === 'response.output_text.delta') {
                const item = this.items.findLast(i => i.type === 'output.text' && i.id === event.itemId);
                if (item && item.type === 'output.text') {
                    item.content += event.delta;
                }
                yield {type: 'text.delta', id: event.itemId, contentDelta: event.delta};
                continue;
            }

            if (event.type === 'response.reasoning_text.delta') {
                const item = this.items.findLast(i => i.type === 'output.reasoning' && i.id === event.itemId);
                if (item && item.type === 'output.reasoning') {
                    item.content += event.delta;
                }
                yield {type: 'reasoning.delta', id: event.itemId, contentDelta: event.delta};
                continue;
            }

            if (event.type === 'response.reasoning_summary_text.delta') {
                const item = this.items.findLast(i => i.type === 'output.reasoning' && i.id === event.itemId);
                if (item && item.type === 'output.reasoning') {
                    item.summary += event.delta;
                }
                yield {type: 'reasoning.delta', id: event.itemId, summaryDelta: event.delta};
                continue;
            }

            if (event.type === 'response.function_call_arguments.delta') {
                const item = this.items.findLast(i => i.type === 'output.toolCall' && i.id === event.itemId);
                if (item && item.type === 'output.toolCall') {
                    item.arguments += event.delta;
                }
                yield {type: 'toolCall.delta', id: event.itemId, argumentsDelta: event.delta};
                continue;
            }

            if (event.type === 'response.refusal.delta') {
                const item = this.items.findLast(i => i.type === 'output.text' && i.id === event.itemId);
                if (item && item.type === 'output.text') {
                    item.content += event.delta;
                }
                yield {type: 'text.delta', id: event.itemId, contentDelta: event.delta};
                continue;
            }

            // Handle done events - update status
            if (event.type === 'response.output_item.done') {
                const item = this.items.findLast(
                    i => (i.type === 'output.reasoning'
                        || i.type === 'output.reasoningSummary'
                        || i.type === 'output.text'
                        || i.type === 'output.toolCall')
                        && i.id === event.item.id
                );
                if (item) {
                    // Type guard to ensure item has status property
                    if (
                        item.type === 'output.reasoning'
                        || item.type === 'output.reasoningSummary'
                        || item.type === 'output.text'
                        || item.type === 'output.toolCall'
                    ) {
                        item.status = 'completed';
                    }

                    if (item.type === 'output.reasoning') {
                        yield {type: 'reasoning.done', id: item.id};
                    }
                    else if (item.type === 'output.text') {
                        yield {type: 'text.done', id: item.id};
                    }
                    else if (item.type === 'output.toolCall') {
                        yield {type: 'toolCall.done', id: item.id};
                    }
                }
                continue;
            }
        }
    }
}
