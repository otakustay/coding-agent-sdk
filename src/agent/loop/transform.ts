import type {OpenResponsesInput} from '@openrouter/sdk/models';
import type {AgentWorkItem, TimelineEntry} from './interface.js';
import {TimelineCoalescer} from './coalescer.js';
import type {CoalescedItem} from './coalescer.js';

function normalizeStatus(status: unknown): 'open' | 'completed' {
    return status === 'completed' ? 'completed' : 'open';
}

function coalesceTimeline(timeline: TimelineEntry[]): CoalescedItem[] {
    const coalescer = new TimelineCoalescer();
    for (const entry of timeline) {
        coalescer.consumeTimelineEntry(entry);
    }
    return coalescer.getCoalescedTimeline();
}

function transformTimelineItemToWorkItem(item: CoalescedItem): AgentWorkItem | null {
    if (item.type === 'message' && item.role === 'system') {
        return {
            type: 'input.system',
            content: item.content.filter(v => v.type === 'input_text').map(v => v.text).join(''),
        };
    }

    if (item.type === 'message' && item.role === 'user') {
        return {
            type: 'input.user',
            content: item.content,
        };
    }

    if (item.type === 'function_call_output') {
        return {
            type: 'input.toolResult',
            callId: item.callId,
            content: item.output,
        };
    }

    if (item.type === 'message' && item.role === 'assistant') {
        return {
            type: 'output.text',
            id: item.id,
            status: normalizeStatus(item.status),
            content: item.content,
        };
    }

    if (item.type === 'reasoning') {
        return {
            type: 'output.reasoning',
            id: item.id,
            status: normalizeStatus(item.status),
            content: item.content,
            summary: item.summary,
        };
    }

    if (item.type === 'function_call') {
        return {
            type: 'output.toolCall',
            id: item.id ?? item.callId ?? '',
            status: normalizeStatus(item.status),
            callId: item.callId ?? '',
            name: item.name ?? '',
            arguments: item.arguments ?? '',
        };
    }

    return null;
}

function isMeaningfulOutputItem(item: AgentWorkItem): boolean {
    switch (item.type) {
        case 'output.text':
            return item.content.length > 0;
        case 'output.reasoning':
            return (item.content?.length ?? 0) > 0 || item.summary.length > 0;
        case 'output.toolCall':
            return item.callId.length > 0 || item.name.length > 0 || item.arguments.length > 0;
        default:
            return true;
    }
}

/**
 * Materialize timeline entries into AgentWorkItems by coalescing output events.
 */
export function materializeTimeline(timeline: TimelineEntry[]): AgentWorkItem[] {
    const materialized: AgentWorkItem[] = [];
    const coalescedTimeline = coalesceTimeline(timeline);

    for (const item of coalescedTimeline) {
        const workItem = transformTimelineItemToWorkItem(item);

        if (!workItem) {
            continue;
        }

        if (!isMeaningfulOutputItem(workItem)) {
            continue;
        }

        materialized.push(workItem);
    }

    return materialized;
}

/**
 * Convert append-only timeline into canonical OpenRouter input items.
 */
export function transformTimelineToInput(timeline: TimelineEntry[]): OpenResponsesInput {
    return coalesceTimeline(timeline);
}
