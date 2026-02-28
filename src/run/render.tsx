import {Fragment, useState, useEffect} from 'react';
import {render, Box, Text, useApp} from 'ink';
import type {AgentWorkItem, StreamChunk} from '../agent/loop/interface.js';
import {toItemUpdateStream} from '../agent/index.js';
import {UserQuery} from './components/query.js';
import {ReasoningOutput, ReasoningSummaryOutput} from './components/reasoning.js';
import {TextOutput} from './components/text.js';
import {ToolCallOutput, ToolResultInput} from './components/tool.js';

const SEPARATOR = '─'.repeat(60);

function WorkItem({item}: {item: AgentWorkItem}) {
    switch (item.type) {
        case 'input.user':
            return <UserQuery item={item} />;
        case 'output.reasoning':
            return <ReasoningOutput item={item} />;
        case 'output.reasoningSummary':
            return <ReasoningSummaryOutput item={item} />;
        case 'output.text':
            return <TextOutput item={item} />;
        case 'output.toolCall':
            return <ToolCallOutput item={item} />;
        case 'input.toolResult':
            return <ToolResultInput item={item} />;
        default:
            return null;
    }
}

const HIDDEN_TYPES = new Set<AgentWorkItem['type']>(['input.system']);

function getItemKey(item: AgentWorkItem, i: number): string {
    if ('id' in item) {
        return item.id;
    }

    if (item.type === 'input.toolResult') {
        return `toolResult-${item.callId}`;
    }

    return `${item.type}-${i}`;
}

function AgentOutput({items}: {items: AgentWorkItem[]}) {
    const visible = items.filter(item => !HIDDEN_TYPES.has(item.type));
    const renderItem = (item: AgentWorkItem, i: number) => (
        <Fragment key={getItemKey(item, i)}>
            {i > 0 && <Text dimColor>{SEPARATOR}</Text>}
            <WorkItem item={item} />
        </Fragment>
    );

    return (
        <Box flexDirection="column">
            {visible.map(renderItem)}
        </Box>
    );
}

function App({stream}: {stream: AsyncIterable<StreamChunk>}) {
    const {exit} = useApp();
    const [items, setItems] = useState<AgentWorkItem[]>([]);

    useEffect(
        () => {
            void (async () => {
                for await (const update of toItemUpdateStream(stream)) {
                    setItems(update);
                }
                exit();
            })();
        },
        [exit, stream]
    );

    return <AgentOutput items={items} />;
}

export async function renderAgentLoop(stream: AsyncIterable<StreamChunk>): Promise<void> {
    const {waitUntilExit} = render(<App stream={stream} />);
    await waitUntilExit();
}
