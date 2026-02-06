import type {AgentWorkItem, WorkItemStreamEvent, AgentWorkItemOutputBase} from './loop/interface.js';

type UpdateItem = (items: AgentWorkItem[]) => AgentWorkItem[];

type OutputItem = Extract<AgentWorkItem, AgentWorkItemOutputBase>;

type OutputItemType = OutputItem['type'];

interface ItemMatch<T extends OutputItemType> {
    id: string;
    type: T;
}

type ItemOf<T extends OutputItemType> = Extract<OutputItem, {type: T}>;

type Update<T extends OutputItemType> = (item: ItemOf<T>) => ItemOf<T>;

function updateItemAt<T extends OutputItemType>(items: AgentWorkItem[], match: ItemMatch<T>, updater: Update<T>) {
    const index = items.findIndex(i => i.type === match.type && i.id === match.id);
    if (index === -1) {
        return items;
    }
    const item = items[index] as ItemOf<T>;
    if (item.type !== match.type) {
        return items;
    }
    return [
        ...items.slice(0, index),
        updater(item),
        ...items.slice(index + 1),
    ];
}

export async function* toItemUpdateStream(response: AsyncIterable<WorkItemStreamEvent>): AsyncGenerator<UpdateItem> {
    for await (const event of response) {
        // Handle added events - create new items
        if (event.type === 'reasoning.added') {
            yield (items: AgentWorkItem[]) => [
                ...items,
                {
                    type: 'output.reasoning',
                    id: event.id,
                    status: 'open',
                    content: '',
                    summary: '',
                },
            ];
        }
        else if (event.type === 'text.added') {
            yield (items: AgentWorkItem[]) => [
                ...items,
                {
                    type: 'output.text',
                    id: event.id,
                    status: 'open',
                    content: '',
                },
            ];
        }
        else if (event.type === 'toolCall.added') {
            yield (items: AgentWorkItem[]) => [
                ...items,
                {
                    type: 'output.toolCall',
                    id: event.id,
                    status: 'open',
                    callId: event.callId,
                    name: event.name,
                    arguments: '',
                },
            ];
        }
        // Handle delta events - update items
        else if (event.type === 'reasoning.delta') {
            yield (items: AgentWorkItem[]) =>
                updateItemAt(
                    items,
                    {id: event.id, type: 'output.reasoning'},
                    item => {
                        return {
                            ...item,
                            content: item.content + (event.contentDelta || ''),
                            summary: item.summary + (event.summaryDelta || ''),
                        };
                    }
                );
        }
        else if (event.type === 'text.delta') {
            yield (items: AgentWorkItem[]) =>
                updateItemAt(
                    items,
                    {id: event.id, type: 'output.text'},
                    item => ({...item, content: item.content + event.contentDelta})
                );
        }
        else if (event.type === 'toolCall.delta') {
            yield (items: AgentWorkItem[]) =>
                updateItemAt(
                    items,
                    {id: event.id, type: 'output.toolCall'},
                    item => ({...item, arguments: item.arguments + event.argumentsDelta})
                );
        }
        // Handle done events - mark as completed
        else if (event.type === 'reasoning.done') {
            yield (items: AgentWorkItem[]) =>
                updateItemAt(
                    items,
                    {id: event.id, type: 'output.reasoning'},
                    item => ({...item, status: 'completed'})
                );
        }
        else if (event.type === 'text.done') {
            yield (items: AgentWorkItem[]) =>
                updateItemAt(
                    items,
                    {id: event.id, type: 'output.text'},
                    item => ({...item, status: 'completed'})
                );
        }
        else if (event.type === 'toolCall.done') {
            yield (items: AgentWorkItem[]) =>
                updateItemAt(
                    items,
                    {id: event.id, type: 'output.toolCall'},
                    item => ({...item, status: 'completed'})
                );
        }
    }
}
