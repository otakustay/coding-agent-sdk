import ora from 'ora';
import fs from 'node:fs/promises';
import path from 'node:path';
import {startAgentTask, AssistantMessageBuilder} from './llm/index.js';
import type {ChatChunk} from './llm/index.js';
import type {EvaluateResult} from './tools/evaluate/interface.js';

class AgentStateTracker {
    private messageBuilder: AssistantMessageBuilder;
    private currentSpinner: ReturnType<typeof ora> | null = null;
    private lastChunkType: 'text' | 'tool-call' | null;
    private accumulatedText: string;

    constructor() {
        this.messageBuilder = new AssistantMessageBuilder();
        this.lastChunkType = null;
        this.accumulatedText = '';
    }

    consume(chunk: ChatChunk): void {
        if (chunk.type !== 'tool-result') {
            this.messageBuilder.consume(chunk);
        }

        switch (chunk.type) {
            case 'text':
                this.lastChunkType = 'text';
                break;
            case 'tool-call-start':
            case 'tool-call':
                this.lastChunkType = 'tool-call';
                break;
            case 'tool-call-end':
            case 'tool-result':
            case 'done':
                this.lastChunkType = null;
                break;
            default:
                break;
        }
    }

    getToolCallAt(index: number): ReturnType<AssistantMessageBuilder['getToolCallAt']> {
        return this.messageBuilder.getToolCallAt(index);
    }

    getAccumulatedText(): string {
        return this.accumulatedText;
    }

    appendText(text: string): void {
        this.accumulatedText += text;
    }

    clearAccumulatedText(): void {
        this.accumulatedText = '';
    }

    getLastChunkType(): 'text' | 'tool-call' | null {
        return this.lastChunkType;
    }

    startSpinner(text: string): void {
        this.currentSpinner = ora(text).start();
    }

    updateSpinner(text: string): void {
        if (this.currentSpinner) {
            this.currentSpinner.text = text;
        }
    }

    startOrUpdateSpinner(text: string): void {
        if (this.currentSpinner) {
            this.currentSpinner.text = text;
        }
        else {
            this.currentSpinner = ora(text).start();
        }
    }

    endSpinner(succeed = true): void {
        if (this.currentSpinner) {
            if (succeed) {
                this.currentSpinner.succeed();
            }
            else {
                this.currentSpinner.fail();
            }
            this.currentSpinner = null;
        }
    }

    isSpinnerActive(): boolean {
        return this.currentSpinner !== null;
    }

    reset(): void {
        this.endSpinner();
        this.messageBuilder = new AssistantMessageBuilder();
        this.lastChunkType = null;
        this.accumulatedText = '';
    }
}

function formatEvaluateResultToMarkdown(result: EvaluateResult): string {
    const lines: string[] = [];

    if ('exitCode' in result) {
        lines.push(`Exit Code: ${result.exitCode}`);
        lines.push('');

        if (result.output) {
            lines.push('<!-- output -->');
            lines.push(result.output);
        }

        if (result.error) {
            if (result.output) {
                lines.push('');
            }
            lines.push('<!-- error -->');
            lines.push(result.error);
        }
    }
    else {
        lines.push('<!-- error -->');
        lines.push(result.error);
    }

    return lines.join('\n');
}

// Initialize store directory
const storeId = Date.now().toString();
const storeDirectory = path.join('./data', storeId);
await fs.mkdir(storeDirectory, {recursive: true});

// Show store directory with spinner
const storeSpinner = ora(`store: ${storeDirectory}`).start();
storeSpinner.succeed();

const tracker = new AgentStateTracker();
for await (const chunk of startAgentTask('分析一下我项目依赖的三方包，按名称+版本列给我，再判断一下这项目干啥的')) {
    tracker.consume(chunk);

    switch (chunk.type) {
        case 'text':
            tracker.appendText(chunk.content);
            tracker.startOrUpdateSpinner(tracker.getAccumulatedText());
            break;
        case 'tool-call-start':
            tracker.endSpinner();
            tracker.clearAccumulatedText();
            tracker.startSpinner('tooling...');
            break;
        case 'tool-call': {
            const toolCall = tracker.getToolCallAt(chunk.index);
            const toolName = toolCall.function.name || 'tooling...';
            tracker.updateSpinner(toolName);
            break;
        }
        case 'tool-call-end': {
            const toolCall = tracker.getToolCallAt(chunk.index);
            const args = JSON.parse(toolCall.function.arguments);
            const codeLength = args.code?.length ?? 0;
            const scriptFilename = `${args.name}-script.js`;

            // Save script to store
            if (args.code) {
                const scriptContent = `// ${args.name}\n${args.code}`;
                await fs.writeFile(path.join(storeDirectory, scriptFilename), scriptContent, 'utf8');
            }

            tracker.updateSpinner(`${args.name} (${codeLength} characters) > ${scriptFilename}`);
            tracker.endSpinner();
            break;
        }
        case 'tool-result': {
            const toolCall = tracker.getToolCallAt(chunk.index);
            const args = JSON.parse(toolCall.function.arguments);
            const evaluateResult = chunk.result as EvaluateResult;
            const markdownContent = formatEvaluateResultToMarkdown(evaluateResult);
            const outputFilename = `${args.name}-out.md`;

            // Save result to store
            await fs.writeFile(
                path.join(storeDirectory, outputFilename),
                markdownContent,
                'utf8'
            );

            const resultLength = markdownContent.length;
            tracker.startSpinner(`executed (${resultLength} characters) > ${outputFilename}`);
            tracker.endSpinner();
            break;
        }
        case 'done':
            tracker.reset();
            break;
        default:
            break;
    }
}
