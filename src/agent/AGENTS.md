# Agent Module

This module implements an AI agent loop that communicates with LLMs via the OpenRouter SDK, abstracting streaming API responses into a domain-specific "work item" model.

## Architecture

```
User Query
    → AgentLoop.submitUserQuery(query)
        → transform.ts serializes items to OpenRouter input format
        → OpenRouter streaming API
        → Raw SDK events mapped to WorkItemStreamEvent
            → toItemUpdateStream() yields immutable state reducer functions
                → Consumer applies reducers to their own state
```

## File Structure

- `index.ts` — Barrel export for `AgentLoop` and `toItemUpdateStream`.
- `stream.ts` — Converts `WorkItemStreamEvent` stream into immutable state update (reducer) functions for external consumers.
- `loop/interface.ts` — All shared type definitions: `AgentWorkItem` (discriminated union of 7 input/output item types), `WorkItemStreamEvent` (9 stream event types following added/delta/done lifecycle).
- `loop/index.ts` — `AgentLoop` class. Stateful, maintains conversation history in a mutable `items[]` array. `submitUserQuery` is an async generator that yields domain stream events.
- `loop/transform.ts` — Serializes `AgentWorkItem[]` into `OpenResponsesInput` format for the OpenRouter SDK. Uses exhaustive switch with `never` check.

## Conventions

- **Discriminated unions** on the `type` field for both `AgentWorkItem` and `WorkItemStreamEvent`, with exhaustive switches.
- **Naming**: Items use `{direction}.{kind}` (e.g., `input.user`, `output.text`). Events use `{kind}.{stage}` (e.g., `text.delta`, `toolCall.done`).
- **Async generators** for streaming (not callbacks or observables).
- **Immutable external, mutable internal**: `AgentLoop` mutates its own state; `toItemUpdateStream` provides immutable reducers for consumers.
- **ESM imports** with `.js` extensions. Named exports only, no default exports.