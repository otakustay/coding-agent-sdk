import {Box, Text} from 'ink';
import type {AgentWorkItem} from '../../agent/loop/interface.js';

function ArgumentBlock({argKey, argValue}: {argKey: string, argValue: unknown}) {
    const valueDisplay = typeof argValue === 'string' ? argValue : JSON.stringify(argValue, null, 2);
    return (
        <Box flexDirection="column" marginLeft={2}>
            <Text dimColor>{argKey}</Text>
            <Box marginLeft={2}>
                <Text dimColor>{valueDisplay}</Text>
            </Box>
        </Box>
    );
}

interface ParsedArguments {
    parsedArgs: Record<string, unknown> | null;
    rawArgsDisplay: string | null;
}

function parseArguments(args: string): ParsedArguments {
    try {
        const parsed = JSON.parse(args) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return {parsedArgs: parsed as Record<string, unknown>, rawArgsDisplay: null};
        }
        return {parsedArgs: null, rawArgsDisplay: JSON.stringify(parsed, null, 2)};
    }
    catch {
        return {parsedArgs: null, rawArgsDisplay: args || null};
    }
}

export function ToolCallOutput({item}: {item: Extract<AgentWorkItem, {type: 'output.toolCall'}>}) {
    const {parsedArgs, rawArgsDisplay} = parseArguments(item.arguments);
    return (
        <Box flexDirection="column">
            <Box>
                <Text color="yellow">{'⚙ '}</Text>
                <Text color="yellow" bold>{item.name}</Text>
                {item.status === 'open'
                    ? <Text dimColor>{' (running…)'}</Text>
                    : <Text color="green">{' ✓'}</Text>}
            </Box>
            {parsedArgs && Object.keys(parsedArgs).length > 0 && (
                <Box flexDirection="column">
                    {Object.entries(parsedArgs).map(([key, value]) => (
                        <ArgumentBlock key={key} argKey={key} argValue={value} />
                    ))}
                </Box>
            )}
            {rawArgsDisplay && (
                <Box marginLeft={2}>
                    <Text dimColor>{rawArgsDisplay}</Text>
                </Box>
            )}
        </Box>
    );
}

export function ToolResultInput({item}: {item: Extract<AgentWorkItem, {type: 'input.toolResult'}>}) {
    return (
        <Box flexDirection="column">
            <Text dimColor>{'↳ result'}</Text>
            <Box marginLeft={2}>
                <Text dimColor>{item.content}</Text>
            </Box>
        </Box>
    );
}
