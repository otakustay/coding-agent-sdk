import {describe, it, expect} from 'vitest';
import type {CoalescedItem} from '../coalescer.js';
import {transformCoalescedToInput} from '../transform.js';
import {error} from '../utils/prompt.js';

const TOOL_NOT_EXECUTED = error('Tool was not executed due to an unexpected error');

function makeUserMsg(text: string): CoalescedItem {
    return {
        type: 'message',
        role: 'user',
        content: [{type: 'input_text', text}],
    } as CoalescedItem;
}

function makeToolCall(callId: string, name = 'some_tool'): CoalescedItem {
    return {
        type: 'function_call',
        callId,
        name,
        arguments: '{}',
    } as CoalescedItem;
}

function makeToolResult(callId: string, output = 'ok'): CoalescedItem {
    return {
        type: 'function_call_output',
        callId,
        output,
    } as CoalescedItem;
}

function makeErrorItem(message: string): CoalescedItem {
    return {type: 'error', message};
}

function toItems(result: unknown): CoalescedItem[] {
    return result as CoalescedItem[];
}

describe('transformCoalescedToInput', () => {
    // Scenario A: error after text output
    it('converts error item to user message appended after existing items', () => {
        const input: CoalescedItem[] = [
            makeUserMsg('hello'),
            makeErrorItem('rate limit exceeded'),
        ];

        const result = toItems(transformCoalescedToInput(input));

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
            type: 'message',
            role: 'user',
            content: [{type: 'input_text', text: 'hello'}],
        });
        expect(result[1]).toMatchObject({
            type: 'message',
            role: 'user',
            content: [{type: 'input_text', text: 'An unexpected error occurred: rate limit exceeded'}],
        });
    });

    // Scenario B: error after tool calls with no results
    it('inserts synthetic tool results for all unmatched calls before the error message', () => {
        const input: CoalescedItem[] = [
            makeUserMsg('run tools'),
            makeToolCall('call_1', 'read_file'),
            makeToolCall('call_2', 'write_file'),
            makeErrorItem('server error'),
        ];

        const result = toItems(transformCoalescedToInput(input));

        expect(result).toHaveLength(6);
        expect(result[0]).toMatchObject({type: 'message', role: 'user'});
        expect(result[1]).toMatchObject({type: 'function_call', callId: 'call_1'});
        expect(result[2]).toMatchObject({type: 'function_call', callId: 'call_2'});
        expect(result[3]).toMatchObject({type: 'function_call_output', callId: 'call_1', output: TOOL_NOT_EXECUTED});
        expect(result[4]).toMatchObject({type: 'function_call_output', callId: 'call_2', output: TOOL_NOT_EXECUTED});
        expect(result[5]).toMatchObject({
            type: 'message',
            role: 'user',
            content: [{type: 'input_text', text: 'An unexpected error occurred: server error'}],
        });
    });

    // Scenario C: some tool calls have results, some do not
    it('only inserts synthetic results for tool calls that have no existing result', () => {
        const input: CoalescedItem[] = [
            makeUserMsg('run tools'),
            makeToolCall('call_1', 'read_file'),
            makeToolResult('call_1', 'file contents'),
            makeToolCall('call_2', 'write_file'),
            makeErrorItem('timeout'),
        ];

        const result = toItems(transformCoalescedToInput(input));

        expect(result).toHaveLength(6);
        expect(result[0]).toMatchObject({type: 'message', role: 'user'});
        expect(result[1]).toMatchObject({type: 'function_call', callId: 'call_1'});
        expect(result[2]).toMatchObject({type: 'function_call_output', callId: 'call_1', output: 'file contents'});
        expect(result[3]).toMatchObject({type: 'function_call', callId: 'call_2'});
        expect(result[4]).toMatchObject({type: 'function_call_output', callId: 'call_2', output: TOOL_NOT_EXECUTED});
        expect(result[5]).toMatchObject({
            type: 'message',
            role: 'user',
            content: [{type: 'input_text', text: 'An unexpected error occurred: timeout'}],
        });
    });

    // Scenario D: no errors, pass-through unchanged
    it('returns items unchanged when there are no error items or unmatched tool calls', () => {
        const input: CoalescedItem[] = [
            makeUserMsg('hello'),
            makeToolCall('call_1', 'read_file'),
            makeToolResult('call_1', 'file contents'),
        ];

        const result = toItems(transformCoalescedToInput(input));

        expect(result).toHaveLength(3);
        expect(result[0]).toMatchObject({
            type: 'message',
            role: 'user',
            content: [{type: 'input_text', text: 'hello'}],
        });
        expect(result[1]).toMatchObject({type: 'function_call', callId: 'call_1'});
        expect(result[2]).toMatchObject({type: 'function_call_output', callId: 'call_1', output: 'file contents'});
    });

    // Scenario E: interleaved results — call_1, call_2, call_3, result_1, error
    it('correctly identifies unmatched calls when a real result appears after the call block', () => {
        const input: CoalescedItem[] = [
            makeUserMsg('run tools'),
            makeToolCall('call_1', 'read_file'),
            makeToolCall('call_2', 'write_file'),
            makeToolCall('call_3', 'list_dir'),
            makeToolResult('call_1', 'file contents'),
            makeErrorItem('connection reset'),
        ];

        const result = toItems(transformCoalescedToInput(input));

        // [user, call_1, call_2, call_3, result_2(synthetic), result_3(synthetic), result_1(real), error msg]
        expect(result).toHaveLength(8);
        expect(result[0]).toMatchObject({type: 'message', role: 'user'});
        expect(result[1]).toMatchObject({type: 'function_call', callId: 'call_1'});
        expect(result[2]).toMatchObject({type: 'function_call', callId: 'call_2'});
        expect(result[3]).toMatchObject({type: 'function_call', callId: 'call_3'});
        expect(result[4]).toMatchObject({type: 'function_call_output', callId: 'call_2', output: TOOL_NOT_EXECUTED});
        expect(result[5]).toMatchObject({type: 'function_call_output', callId: 'call_3', output: TOOL_NOT_EXECUTED});
        expect(result[6]).toMatchObject({type: 'function_call_output', callId: 'call_1', output: 'file contents'});
        expect(result[7]).toMatchObject({
            type: 'message',
            role: 'user',
            content: [{type: 'input_text', text: 'An unexpected error occurred: connection reset'}],
        });
    });

    // Edge case: unmatched tool calls at end with no error
    it('flushes unmatched tool calls at the end even without an error item', () => {
        const input: CoalescedItem[] = [
            makeUserMsg('run'),
            makeToolCall('call_1', 'read_file'),
        ];

        const result = toItems(transformCoalescedToInput(input));

        expect(result).toHaveLength(3);
        expect(result[0]).toMatchObject({type: 'message', role: 'user'});
        expect(result[1]).toMatchObject({type: 'function_call', callId: 'call_1'});
        expect(result[2]).toMatchObject({type: 'function_call_output', callId: 'call_1', output: TOOL_NOT_EXECUTED});
    });
});
