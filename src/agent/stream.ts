import {assertNever} from '../utils/error.js';
import type {AgentWorkItem, StreamChunk, AgentWorkItemOutputBase} from './loop/interface.js';

type UpdateItem = (items: AgentWorkItem[]) => AgentWorkItem[];

type OutputItem = Extract<AgentWorkItem, AgentWorkItemOutputBase>;

function findItemIndex(items: AgentWorkItem[], id: string): number {
    return items.findIndex(i => 'id' in i && i.id === id);
}

function createItemFromChunk(chunk: StreamChunk): AgentWorkItem {
    switch (chunk.type) {
        case 'output.reasoning':
            return {
                type: 'output.reasoning',
                id: chunk.id,
                status: chunk.status,
                content: chunk.content ?? '',
                summary: chunk.summary ?? '',
            };
        case 'output.text':
            return {
                type: 'output.text',
                id: chunk.id,
                status: chunk.status,
                content: chunk.content ?? '',
            };
        case 'output.toolCall':
            return {
                type: 'output.toolCall',
                id: chunk.id,
                status: chunk.status,
                callId: chunk.callId ?? '',
                name: chunk.name ?? '',
                arguments: chunk.arguments ?? '',
            };
        case 'input.toolResult':
            return {
                type: 'input.toolResult',
                callId: chunk.callId,
                content: chunk.content,
            };
        default:
            assertNever<{type: string}>(chunk, c => `Unknown chunk type: ${c.type}`);
    }
}

function mergeChunkIntoItem(item: OutputItem, chunk: StreamChunk): OutputItem {
    switch (chunk.type) {
        case 'output.reasoning':
            if (item.type !== 'output.reasoning') {
                return item;
            }
            return {
                ...item,
                status: chunk.status,
                content: item.content + (chunk.content ?? ''),
                summary: item.summary + (chunk.summary ?? ''),
            };
        case 'output.text':
            if (item.type !== 'output.text') {
                return item;
            }
            return {
                ...item,
                status: chunk.status,
                content: item.content + (chunk.content ?? ''),
            };
        case 'output.toolCall':
            if (item.type !== 'output.toolCall') {
                return item;
            }
            return {
                ...item,
                status: chunk.status,
                callId: chunk.callId ?? item.callId,
                name: chunk.name ?? item.name,
                arguments: item.arguments + (chunk.arguments ?? ''),
            };
        case 'input.toolResult':
            return item;
        default:
            assertNever<{type: string}>(chunk, c => `Unknown chunk type: ${c.type}`);
    }
}

export async function* toItemUpdateStream(response: AsyncIterable<StreamChunk>): AsyncGenerator<UpdateItem> {
    for await (const chunk of response) {
        yield (items: AgentWorkItem[]) => {
            const index = findItemIndex(items, chunk.id);

            if (index === -1) {
                return [...items, createItemFromChunk(chunk)];
            }

            const existing = items[index];
            return 'status' in existing
                ? [
                    ...items.slice(0, index),
                    mergeChunkIntoItem(existing, chunk),
                    ...items.slice(index + 1),
                ]
                : items;
        };
    }
}
