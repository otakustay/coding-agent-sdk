import {Box, Text} from 'ink';
import type {AgentWorkItem} from '../../agent/loop/interface.js';

export function UserQuery({item}: {item: Extract<AgentWorkItem, {type: 'input.user'}>}) {
    const text = item.content.filter(p => p.type === 'input_text').map(p => p.text).join('');

    return (
        <Box>
            <Text bold color="cyan">{'❯ '}</Text>
            <Text bold>{text}</Text>
        </Box>
    );
}
