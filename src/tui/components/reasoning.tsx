import {Box, Text} from 'ink';
import {Spinner} from '@inkjs/ui';
import type {AgentWorkItem} from '../../agent/loop/interface.js';
import {Markdown} from './markdown.js';

export function ReasoningOutput({item}: {item: Extract<AgentWorkItem, {type: 'output.reasoning'}>}) {
    const text = item.content ? item.content.map(p => p.text).join('') : '';

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="gray">
            {item.status === 'open'
                ? <Spinner label="Thinking" />
                : <Text dimColor bold>Thinking</Text>}
            <Markdown content={text} dimColor />
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
