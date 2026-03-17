import {assertNever} from '../utils/error.js';
import type {
    AgentWorkItem,
    AgentWorkItemUsage,
    ContentStreamChunk,
    StreamChunk,
    AgentWorkItemOutputBase,
} from './loop/interface.js';

type UpdateItem = (items: AgentWorkItem[]) => AgentWorkItem[];

type OutputItem = Extract<AgentWorkItem, AgentWorkItemOutputBase>;

function findItemIndex(items: AgentWorkItem[], id: string): number {
    return items.findIndex(i => 'id' in i && i.id === id);
}

function createItemFromChunk(chunk: ContentStreamChunk): AgentWorkItem {
    switch (chunk.type) {
        case 'output.reasoning':
            return {
                type: 'output.reasoning',
                id: chunk.id,
                status: chunk.status,
                content: chunk.content ? [{type: 'reasoning_text' as const, text: chunk.content}] : undefined,
                summary: chunk.summary ? [{type: 'summary_text' as const, text: chunk.summary}] : [],
            };
        case 'output.text':
            return {
                type: 'output.text',
                id: chunk.id,
                status: chunk.status,
                content: chunk.content ? [{type: 'output_text' as const, text: chunk.content}] : [],
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

function mergeChunkIntoItem(item: OutputItem, chunk: ContentStreamChunk): OutputItem {
    switch (chunk.type) {
        case 'output.reasoning': {
            if (item.type !== 'output.reasoning') {
                return item;
            }
            const prevContent = item.content?.[0]?.text ?? '';
            const prevSummary = item.summary[0]?.text ?? '';
            return {
                ...item,
                status: chunk.status,
                content: chunk.content === undefined
                    ? item.content
                    : [{type: 'reasoning_text' as const, text: prevContent + chunk.content}],
                summary: chunk.summary === undefined
                    ? item.summary
                    : [{type: 'summary_text' as const, text: prevSummary + chunk.summary}],
            };
        }
        case 'output.text': {
            if (item.type !== 'output.text') {
                return item;
            }
            const prev = item.content[0]?.type === 'output_text' ? item.content[0].text : '';
            return {
                ...item,
                status: chunk.status,
                content: [{type: 'output_text' as const, text: prev + (chunk.content ?? '')}],
            };
        }
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
        if (chunk.type === 'usage') {
            const usageItem: AgentWorkItemUsage = {type: 'usage', usage: chunk.usage};
            yield (items: AgentWorkItem[]) => {
                const index = items.findIndex(item => item.type === 'usage');
                return index >= 0
                    ? [...items.slice(0, index), usageItem, ...items.slice(index + 1)]
                    : [...items, usageItem];
            };
            continue;
        }

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
