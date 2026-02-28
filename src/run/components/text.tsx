import {Box, Text} from 'ink';
import type {AgentWorkItem} from '../../agent/loop/interface.js';
import {Markdown} from './markdown.js';

export function TextOutput({item}: {item: Extract<AgentWorkItem, {type: 'output.text'}>}) {
    return (
        <Box flexDirection="column">
            <Markdown content={item.content} />
            {item.status === 'open' && <Text dimColor>{'▋'}</Text>}
        </Box>
    );
}
