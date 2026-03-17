import type {
    ResponsesOutputMessage,
    ResponsesOutputItemReasoning,
    ResponsesOutputItemFunctionCall,
    OpenResponsesStreamEvent,
} from '@openrouter/sdk/models';
import type {TimelineEntry, TimelineInputItem} from './interface.js';

type FoldedOutputItem = ResponsesOutputMessage | ResponsesOutputItemReasoning | ResponsesOutputItemFunctionCall;

export interface CoalescedErrorItem {
    type: 'error';
    message: string;
}

export type CoalescedItem = TimelineInputItem | FoldedOutputItem | CoalescedErrorItem;

type AddedOutputItem = Extract<OpenResponsesStreamEvent, {type: 'response.output_item.added'}>['item'];
type DoneOutputItem = Extract<OpenResponsesStreamEvent, {type: 'response.output_item.done'}>['item'];

export class TimelineCoalescer {
    private readonly outputItemIndexes = new Map<string, number>();
    private readonly coalesced: CoalescedItem[] = [];

    consumeTimelineEntry(entry: TimelineEntry): void {
        switch (entry.source) {
            case 'input':
                this.coalesced.push(entry.item);
                break;
            case 'output':
                this.applyOutputEvent(entry.event);
                break;
            default:
                break;
        }
    }

    getCoalescedTimeline(): CoalescedItem[] {
        return this.coalesced;
    }

    private applyOutputEvent(event: OpenResponsesStreamEvent): void {
        if (event.type === 'response.output_item.added') {
            this.applyOutputItemAdded(event.item);
        }
        else if (event.type === 'response.output_item.done') {
            this.applyOutputItemDone(event.item);
        }
        else if (event.type === 'error') {
            this.coalesced.push({type: 'error', message: event.message ?? 'Unknown error'});
        }
        else if (event.type === 'response.failed') {
            this.coalesced.push({type: 'error', message: event.response.error?.message ?? 'Response failed'});
        }
    }

    private applyOutputItemAdded(item: AddedOutputItem): void {
        if (item.type === 'message' && item.role === 'assistant') {
            const key = `message:${item.id}`;
            if (!this.outputItemIndexes.has(key)) {
                this.outputItemIndexes.set(key, this.coalesced.length);
                this.coalesced.push(item);
            }
        }
        else if (item.type === 'reasoning') {
            const key = `reasoning:${item.id}`;
            if (!this.outputItemIndexes.has(key)) {
                this.outputItemIndexes.set(key, this.coalesced.length);
                this.coalesced.push(item);
            }
        }
        else if (item.type === 'function_call') {
            const existingIndex = this.outputItemIndexes.get(`toolCall:${item.id}`)
                ?? this.outputItemIndexes.get(`toolCall:${item.callId}`);
            if (existingIndex === undefined) {
                const index = this.coalesced.length;
                if (item.id) {
                    this.outputItemIndexes.set(`toolCall:${item.id}`, index);
                }
                if (item.callId) {
                    this.outputItemIndexes.set(`toolCall:${item.callId}`, index);
                }
                this.coalesced.push(item);
            }
        }
    }

    private applyOutputItemDone(item: DoneOutputItem): void {
        if (item.type === 'message' && item.role === 'assistant') {
            const index = this.outputItemIndexes.get(`message:${item.id}`);
            if (index !== undefined) {
                this.coalesced[index] = item;
            }
        }
        else if (item.type === 'reasoning') {
            const index = this.outputItemIndexes.get(`reasoning:${item.id}`);
            if (index !== undefined) {
                this.coalesced[index] = item;
            }
        }
        else if (item.type === 'function_call') {
            const index = this.outputItemIndexes.get(`toolCall:${item.id}`)
                ?? this.outputItemIndexes.get(`toolCall:${item.callId}`);
            if (index !== undefined) {
                this.coalesced[index] = item;
            }
        }
    }
}
