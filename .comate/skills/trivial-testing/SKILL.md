---
name: trivial-testing
description: Guide for running local, quick, partial tests of the coding-agent-sdk project. MUST activate whenever `npm run play` is mentioned or about to be run — no exceptions. Also activate when the user mentions test or play with model, or wants to run the agent loop against a real model to verify behavior, or .env file is touched.
---

# Trivial Testing

## Running a Test

```bash
npm run play -- --query "<your query>" --model "<model-id>"
```

This runs `tsx --env-file=.env src/testing/run.ts` with the given query and model, then dumps all agent work items as JSON to stdout and token usage to stderr.

Example:

```bash
npm run play -- --query "list files in src/" --model "anthropic/claude-opus-4-5"
```

## Recommended Models

| Provider   | Fast (quick test)  | Quality (behavior focus)      |
| ---------- | ------------------ | ----------------------------- |
| Anthropic  | `claude-haiku-4-5` | `claude-sonnet-4-6`           |
| OpenAI     | `gpt-5.4-nano`     | `gpt-5.4`                     |
| OpenRouter | `z-ai/glm-5-turbo` | `anthropic/claude-sonnet-4.6` |

## Recommended Queries

- **Single-turn text** (no tools): `hello, introduce yourself`
- **Light tool use**: `read package.json and list all dependencies to me, no further investigation`
- **Multi-turn read-only**: `explore this repository and explain to me the architecture and usage`

Avoid queries with side effects (code modification, dependency installation, etc.) unless the user explicitly requests and approves them.

## Key Points

### 1. Switching Model Provider via `.env`

The `.env` has three provider sections. Only one should be active (uncommented) at a time.

Three provider values: `OpenAI` | `Anthropic` | `OpenRouter` (OpenRouter = Responses API)

When the user specifies a provider, edit `.env` so that provider's three lines are uncommented and the other two sections are commented out:

```dotenv
# OpenRouter
MODEL_PROVIDER=OpenRouter
MODEL_API_KEY=sk-or-v1-...
MODEL_API_ENDPOINT=https://openrouter.ai/api/v1

# OpenAI
# MODEL_PROVIDER=OpenAI
# MODEL_API_KEY=sk-proj-...
# MODEL_API_ENDPOINT=https://api.openai.com/v1

# Anthropic
# MODEL_PROVIDER=Anthropic
# MODEL_API_KEY=sk-ant-...
# MODEL_API_ENDPOINT=https://api.anthropic.com
```

`ZULU_PTOKEN` at the bottom is unrelated — leave it untouched.

### 2. Adding Temporary Debug Logs

To observe runtime behavior, add `console.log(...)` or `console.error(...)` calls in the loop implementation:

- Main loop: `src/agent/loop/index.ts`
- Event transform: `src/agent/loop/transform.ts`

Example — log each tool call before execution:

```ts
// in executeToolCall()
console.error('[debug] tool call:', toolCall.name, toolCall.input);
```

Use `console.error` so debug output goes to stderr and doesn't pollute the JSON stdout.

### 3. Cleanup After Testing (Mandatory)

After the test run is complete, **always** perform these two cleanup steps before finishing:

1. **Restore `.env`**: revert any provider switching — return the previously active provider's lines to uncommented and re-comment the ones that were commented before.
2. **Remove debug logs**: delete every temporary `console.log` / `console.error` statement added to loop files.

Do not consider the task done until both steps are complete.
