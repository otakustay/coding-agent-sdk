import type {OpenResponsesInput} from '@openrouter/sdk/models';
import type {AgentWorkItem, TimelineEntry} from './interface.js';
import {TimelineCoalescer} from './coalescer.js';
import type {CoalescedItem} from './coalescer.js';
import {error} from './utils/prompt.js';

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

    if (item.type === 'error') {
        return null;
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

function flushPendingUnmatched(result: CoalescedItem[], callIds: string[]): void {
    for (const callId of callIds) {
        const callOutput = {
            type: 'function_call_output' as const,
            callId,
            output: error('Tool was not executed due to an unexpected error'),
        };
        result.push(callOutput);
    }
}

/**
 * Convert a coalesced timeline into canonical OpenRouter input, injecting synthetic items
 * to recover from error states:
 *   - error items become user messages describing the error
 *   - tool calls with no corresponding result get a synthetic error result
 */
export function transformCoalescedToInput(coalesced: CoalescedItem[]): OpenResponsesInput {
    const existingResultCallIds = new Set<string>();
    for (const item of coalesced) {
        if (item.type === 'function_call_output') {
            existingResultCallIds.add(item.callId);
        }
    }

    const result: CoalescedItem[] = [];
    const pendingUnmatchedCallIds: string[] = [];

    for (const item of coalesced) {
        if (item.type === 'error') {
            flushPendingUnmatched(result, pendingUnmatchedCallIds);
            pendingUnmatchedCallIds.length = 0;
            result.push({
                type: 'message',
                role: 'user',
                content: [{type: 'input_text', text: `An unexpected error occurred: ${item.message}`}],
            });
            continue;
        }

        if (item.type === 'function_call') {
            if (!existingResultCallIds.has(item.callId ?? '')) {
                pendingUnmatchedCallIds.push(item.callId ?? '');
            }
            result.push(item);
            continue;
        }

        if (pendingUnmatchedCallIds.length > 0) {
            flushPendingUnmatched(result, pendingUnmatchedCallIds);
            pendingUnmatchedCallIds.length = 0;
        }

        result.push(item);
    }

    if (pendingUnmatchedCallIds.length > 0) {
        flushPendingUnmatched(result, pendingUnmatchedCallIds);
    }

    return result as OpenResponsesInput;
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
 * Applies error recovery corrections via transformCoalescedToInput.
 */
export function transformTimelineToInput(timeline: TimelineEntry[]): OpenResponsesInput {
    return transformCoalescedToInput(coalesceTimeline(timeline));
}
