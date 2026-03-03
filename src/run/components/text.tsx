import {Box, Text} from 'ink';
import type {AgentWorkItem} from '../../agent/loop/interface.js';
import {Markdown} from './markdown.js';

export function TextOutput({item}: {item: Extract<AgentWorkItem, {type: 'output.text'}>}) {
    const text = item.content.map(p => p.type === 'output_text' ? p.text : p.refusal).join('');

    return (
        <Box flexDirection="column">
            <Markdown content={text} />
            {item.status === 'open' && <Text dimColor>{'▋'}</Text>}
        </Box>
    );
}
