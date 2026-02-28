import {Box, Text} from 'ink';
import type {AgentWorkItem} from '../../agent/loop/interface.js';

export function UserQuery({item}: {item: Extract<AgentWorkItem, {type: 'input.user'}>}) {
    const text = item.content.map(p => p.content).join('');
    return (
        <Box>
            <Text bold color="cyan">{'❯ '}</Text>
            <Text bold>{text}</Text>
        </Box>
    );
}
