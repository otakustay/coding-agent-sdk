import {Box, Text} from 'ink';
import type {AgentWorkItem} from '../../agent/loop/interface.js';
import {Markdown} from './markdown.js';

export function ReasoningOutput({item}: {item: Extract<AgentWorkItem, {type: 'output.reasoning'}>}) {
    return (
        <Box flexDirection="column" borderStyle="round" borderColor="gray">
            <Text dimColor bold>Thinking{item.status === 'open' ? '…' : ''}</Text>
            <Markdown content={item.content} dimColor />
        </Box>
    );
}

export function ReasoningSummaryOutput({item}: {item: Extract<AgentWorkItem, {type: 'output.reasoningSummary'}>}) {
    return (
        <Box>
            <Text dimColor>[Summary] {item.content}</Text>
        </Box>
    );
}
