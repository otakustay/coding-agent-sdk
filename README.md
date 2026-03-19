# coding-agent-sdk

A TypeScript SDK for building LLM-powered coding agents with tool execution, multi-turn conversation management, and a terminal user interface (TUI).

## Prerequisites

- Node.js 24+
- An API key for at least one supported LLM provider (OpenRouter, OpenAI, or Anthropic)

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` from the provided example:

```bash
cp .env.example .env
```

`.env.example` contains three provider blocks — OpenRouter, OpenAI, and Anthropic. Exactly one block should be active (uncommented). Fill in `MODEL_API_KEY` for that block and comment out the other two:

```bash
# ── OpenRouter ──────────────────────────────────────
MODEL_PROVIDER=OpenRouter
MODEL_API_KEY=your-openrouter-api-key
MODEL_API_ENDPOINT=https://openrouter.ai/api/v1

# ── OpenAI ───────────────────────────────────────────
# MODEL_PROVIDER=OpenAI
# MODEL_API_KEY=your-openai-api-key
# MODEL_API_ENDPOINT=https://api.openai.com/v1

# ── Anthropic ────────────────────────────────────────
# MODEL_PROVIDER=Anthropic
# MODEL_API_KEY=your-anthropic-api-key
# MODEL_API_ENDPOINT=https://api.anthropic.com
```

To switch providers, comment out the active block and uncomment another.

3. Run the interactive TUI:

```bash
npm run tui
```

## Architecture

```
src/
  agent/          # Core SDK
    client/       # LLM provider adapters (OpenRouter, OpenAI, Anthropic)
    context/      # Query context providers
    loop/         # AgentLoop engine
    tools/        # Built-in tool implementations
    stream.ts     # Stream conversion utilities
    index.ts      # Public API exports
  tui/            # Interactive terminal UI (React/Ink)
  testing/        # Non-interactive CLI test runner
  utils/          # Shared utilities
```

### AgentLoop

`AgentLoop` is the central orchestrator. It manages the multi-turn conversation lifecycle:

1. Collects context via `QueryContextProvider` instances
2. Sends the conversation timeline to the LLM
3. Receives streamed responses and executes tool calls
4. Loops until the model produces no more tool calls

```ts
import {AgentLoop, createClient, ReadTool, WriteTool} from './src/agent/index.js';

const client = createClient({
    provider: process.env.MODEL_PROVIDER as ModelProvider,
    apiKey: process.env.MODEL_API_KEY,
    baseURL: process.env.MODEL_API_ENDPOINT,
});
const loop = new AgentLoop(client, 'anthropic/claude-opus-4-5');

loop.setSystemPrompt('You are a helpful coding assistant.');
loop.registerTool(new ReadTool());
loop.registerTool(new WriteTool());

for await (const chunk of loop.submitUserQuery('Refactor this function...')) {
    // chunk: StreamChunk — reasoning, text, toolCall, toolResult, usage
}
```

### ModelClient

Three LLM backends are provided, all implementing the same `ModelClient` interface. The `createClient()` factory reads from environment variables:

```ts
interface ModelClient {
    sendStream(request: ModelClientRequest): AsyncIterable<OpenResponsesStreamEvent>;
}
```

| Class                   | Provider   | `MODEL_PROVIDER` value |
| ----------------------- | ---------- | ---------------------- |
| `OpenRouterModelClient` | OpenRouter | `OpenRouter` (default) |
| `OpenAIModelClient`     | OpenAI     | `OpenAI`               |
| `AnthropicModelClient`  | Anthropic  | `Anthropic`            |

```ts
import {createClient} from './src/agent/index.js';

const client = createClient({
    provider: process.env.MODEL_PROVIDER as ModelProvider,
    apiKey: process.env.MODEL_API_KEY,
    baseURL: process.env.MODEL_API_ENDPOINT,
});
```

### Tools

Each tool is a class implementing the `Tool<T>` interface:

```ts
interface Tool<T = unknown> {
    getName(): string;
    getDescription(): string;
    getInputSchema(): Record<string, unknown>; // JSON Schema
    execute(parameters: T, context: ToolExecutionContext): Promise<string>;
}
```

Tool definitions (name, description, JSON Schema parameters) are stored in co-located `definition.yml` files.

**Built-in tools:**

| Tool          | Class            | Description                                        |
| ------------- | ---------------- | -------------------------------------------------- |
| `read`        | `ReadTool`       | Read file contents with optional line offset/limit |
| `write`       | `WriteTool`      | Write file contents                                |
| `edit`        | `EditTool`       | Exact string replacement in files                  |
| `list`        | `ListTool`       | List directory contents                            |
| `glob`        | `GlobTool`       | Find files by glob pattern                         |
| `grep`        | `GrepTool`       | Search file contents by regex                      |
| `bash`        | `BashTool`       | Execute shell commands (foreground or background)  |
| `todo_write`  | `TodoWriteTool`  | Manage structured todo lists                       |
| `agent`       | `AgentTool`      | Spawn sub-agents with isolated loops               |
| `skill`       | `SkillTool`      | Load skill documents into context                  |
| `task_create` | `TaskCreateTool` | Create background task records                     |
| `task_get`    | `TaskGetTool`    | Get task status                                    |
| `task_update` | `TaskUpdateTool` | Update task state                                  |
| `task_list`   | `TaskListTool`   | List all tasks                                     |
| `task_output` | `TaskOutputTool` | Read background task output                        |
| `task_stop`   | `TaskStopTool`   | Stop a background task                             |

### Query Context Providers

Context providers inject additional information into each user message before it is sent to the LLM:

```ts
interface QueryContextProvider {
    provide(state: QueryState): string | Promise<string>;
}
```

**Built-in providers:**

| Class                  | Injected Content                                                |
| ---------------------- | --------------------------------------------------------------- |
| `UserQueryProvider`    | Wraps the raw user query in `<user-query>` tags (always active) |
| `WorkspaceEnvProvider` | OS, current date, shell, and working directory                  |
| `GitStatusProvider`    | Current branch, git status, and recent commits                  |
| `AgentsMdProvider`     | Contents of `AGENTS.md` if present in the working directory     |

Register custom providers with `loop.registerQueryContextProvider(provider)`.

### Stream Output

`submitUserQuery()` is an async generator yielding typed `StreamChunk` values:

| Type               | Description                            |
| ------------------ | -------------------------------------- |
| `output.text`      | LLM text response delta                |
| `output.reasoning` | LLM reasoning/thinking delta           |
| `output.toolCall`  | Tool call delta (name + arguments)     |
| `input.toolResult` | Result returned from a tool execution  |
| `usage`            | Token usage for the completed response |

All chunks carry an `id` and `status` (`'open'` while streaming, `'completed'` when done). Use `toItemUpdateStream()` to merge deltas into full items:

```ts
import {toItemUpdateStream} from './src/agent/index.js';

for await (const item of toItemUpdateStream(loop.submitUserQuery(query))) {
    if (item.type === 'output.text' && item.status === 'completed') {
        console.log(item.content);
    }
}
```

## Development

```bash
npm run tui         # Run interactive TUI
npm run play        # Run non-interactive test runner
npm run lint        # Lint with oxlint
npm run type-check  # TypeScript type check
npm run test        # Run unit tests with vitest
npm run build       # Build project
```

### Writing a Custom Tool

1. Create a directory under `src/agent/tools/<toolname>/`
2. Add a `definition.yml` with `name`, `description`, and `parameters` (JSON Schema)
3. Implement `execution.ts` with the tool logic
4. Implement `index.ts` exporting the tool class
5. Register it on the `AgentLoop` instance

### Writing a Custom Context Provider

```ts
import type {QueryContextProvider, QueryState} from './src/agent/index.js';

class MyProvider implements QueryContextProvider {
    provide(state: QueryState): string {
        return `<my-context>Current model: ${state.model}</my-context>`;
    }
}

loop.registerQueryContextProvider(new MyProvider());
```
