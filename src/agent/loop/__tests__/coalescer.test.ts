import {describe, it, expect} from 'vitest';
import type {OpenResponsesStreamEvent} from '@openrouter/sdk/models';
import {TimelineCoalescer} from '../coalescer.js';
import type {TimelineEntry} from '../interface.js';

function makeErrorEvent(message: string): OpenResponsesStreamEvent {
    return {
        type: 'error',
        code: null,
        message,
        param: null,
        sequenceNumber: 1,
    } as OpenResponsesStreamEvent;
}

function makeResponseFailedEvent(message: string): OpenResponsesStreamEvent {
    return {
        type: 'response.failed',
        sequenceNumber: 1,
        response: {
            error: {code: 'server_error', message},
        },
    } as unknown as OpenResponsesStreamEvent;
}

function makeOutputEntry(event: OpenResponsesStreamEvent): TimelineEntry {
    return {source: 'output', event};
}

describe('TimelineCoalescer error handling', () => {
    it('appends a CoalescedErrorItem when an error event is consumed', () => {
        const coalescer = new TimelineCoalescer();
        coalescer.consumeTimelineEntry(makeOutputEntry(makeErrorEvent('rate limit exceeded')));

        const result = coalescer.getCoalescedTimeline();
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({type: 'error', message: 'rate limit exceeded'});
    });

    it('uses "Unknown error" as fallback when error event has no message', () => {
        const coalescer = new TimelineCoalescer();
        const event = {
            type: 'error',
            code: null,
            param: null,
            sequenceNumber: 1,
        } as unknown as OpenResponsesStreamEvent;
        coalescer.consumeTimelineEntry(makeOutputEntry(event));

        const result = coalescer.getCoalescedTimeline();
        expect(result[0]).toEqual({type: 'error', message: 'Unknown error'});
    });

    it('appends a CoalescedErrorItem when a response.failed event is consumed', () => {
        const coalescer = new TimelineCoalescer();
        coalescer.consumeTimelineEntry(makeOutputEntry(makeResponseFailedEvent('internal server error')));

        const result = coalescer.getCoalescedTimeline();
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({type: 'error', message: 'internal server error'});
    });

    it('uses "Response failed" as fallback when response.failed has no error message', () => {
        const coalescer = new TimelineCoalescer();
        const event = {
            type: 'response.failed',
            sequenceNumber: 1,
            response: {error: null},
        } as unknown as OpenResponsesStreamEvent;
        coalescer.consumeTimelineEntry(makeOutputEntry(event));

        const result = coalescer.getCoalescedTimeline();
        expect(result[0]).toEqual({type: 'error', message: 'Response failed'});
    });

    it('error items appear in sequence among other coalesced items', () => {
        const coalescer = new TimelineCoalescer();
        coalescer.consumeTimelineEntry({
            source: 'input',
            item: {role: 'user', content: [{type: 'input_text', text: 'hello'}]},
        } as TimelineEntry);
        coalescer.consumeTimelineEntry(makeOutputEntry(makeErrorEvent('something went wrong')));

        const result = coalescer.getCoalescedTimeline();
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({role: 'user'});
        expect(result[1]).toEqual({type: 'error', message: 'something went wrong'});
    });
});
