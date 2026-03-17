import {Fragment, useState, useCallback} from 'react';
import {render, Box, Text, useInput} from 'ink';
import {toItemUpdateStream} from '../agent/index.js';
import type {AgentWorkItem, AgentLoop} from '../agent/index.js';
import {UserQuery} from './components/query.js';
import {ReasoningOutput, ReasoningSummaryOutput} from './components/reasoning.js';
import {TextOutput} from './components/text.js';
import {ToolCallOutput, ToolResultInput} from './components/tool.js';
import {UsageBar} from './components/usage.js';

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

const HIDDEN_TYPES = new Set<AgentWorkItem['type']>(['input.system', 'usage']);

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

function InputPrompt({value}: {value: string}) {
    const placeholder = 'Ask anything and get luck';
    return (
        <Box>
            <Text bold color="green">{'❯ '}</Text>
            {value
                ? (
                    <>
                        <Text>{value}</Text>
                        <Text inverse>{' '}</Text>
                    </>
                )
                : <Text dimColor>{placeholder}</Text>}
        </Box>
    );
}

function App({agentLoop}: {agentLoop: AgentLoop}) {
    const [items, setItems] = useState<AgentWorkItem[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isRunning, setIsRunning] = useState(false);

    const submitQuery = useCallback(
        (query: string) => {
            if (!query.trim()) {
                return;
            }

            const userItem: AgentWorkItem = {
                type: 'input.user',
                content: [{type: 'input_text', text: query}],
            };
            setItems(prev => [...prev, userItem]);
            setIsRunning(true);

            void (async () => {
                const stream = agentLoop.submitUserQuery(query);
                for await (const update of toItemUpdateStream(stream)) {
                    setItems(update);
                }
                setIsRunning(false);
            })();
        },
        [agentLoop]
    );

    useInput(
        (input, key) => {
            if (isRunning) {
                return;
            }

            if (key.return) {
                submitQuery(inputValue);
                setInputValue('');
                return;
            }

            if (key.backspace || key.delete) {
                setInputValue(v => v.slice(0, -1));
                return;
            }

            if (input && !key.ctrl && !key.meta) {
                setInputValue(v => v + input);
            }
        }
    );

    const visible = items.filter(item => !HIDDEN_TYPES.has(item.type));
    const usageItem = items.findLast(item => item.type === 'usage');

    return (
        <Box flexDirection="column">
            <AgentOutput items={items} />
            {usageItem && usageItem.type === 'usage' && <UsageBar usage={usageItem.usage} />}
            {!isRunning && (
                <Box flexDirection="column">
                    {visible.length > 0 && <Text dimColor>{SEPARATOR}</Text>}
                    <InputPrompt value={inputValue} />
                </Box>
            )}
        </Box>
    );
}

export async function renderInteractiveLoop(agentLoop: AgentLoop): Promise<void> {
    console.clear();
    const {waitUntilExit} = render(<App agentLoop={agentLoop} />);
    await waitUntilExit();
}
