import {Box} from 'ink';
import {Badge} from '@inkjs/ui';
import type {TokenUsage} from '../../agent/index.js';

interface Props {
    usage: TokenUsage;
}

export function UsageBar({usage}: Props) {
    const {inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens} = usage;

    if (inputTokens === 0 && outputTokens === 0 && cacheReadTokens === 0 && cacheWriteTokens === 0) {
        return null;
    }

    return (
        <Box justifyContent="flex-end" gap={1}>
            {inputTokens > 0 && <Badge color="blue">{`I/${inputTokens}`}</Badge>}
            {outputTokens > 0 && <Badge color="green">{`O/${outputTokens}`}</Badge>}
            {cacheReadTokens > 0 && <Badge color="yellow">{`R/${cacheReadTokens}`}</Badge>}
            {cacheWriteTokens > 0 && <Badge color="magenta">{`W/${cacheWriteTokens}`}</Badge>}
        </Box>
    );
}
