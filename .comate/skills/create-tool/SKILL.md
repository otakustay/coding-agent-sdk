---
name: create-tool
description: Create new tools for the coding-agent-sdk agent. Use when adding a new capability to the agent that requires external actions (file operations, command execution, API calls, etc.). Tools follow a standard structure with definition (Zod schema), implementation (async function), and registration (AgentLoop).
---

# Create Tool

## Overview

Create new tools that extend the agent's capabilities. Each tool consists of a **definition** (schema and metadata), an **implementation** (the actual logic), and **registration** with AgentLoop.

Tools are stored in `src/agent/tools/{toolName}/` with three files: `definition.ts`, `implement.ts`, and `index.ts`.

## Tool Structure

```
src/agent/tools/
├── interface.ts          # Core types (ToolDefinition, ToolImplementation)
├── index.ts              # Barrel export
└── {toolName}/
    ├── definition.ts     # Zod schema + define{Tool}Tool() factory
    ├── implement.ts      # create{Tool}Implement() factory
    └── index.ts          # Barrel re-export
```

## Creating a New Tool

### 1. Create the Tool Directory

Create `src/agent/tools/{toolName}/` with three files.

### 2. Write definition.ts

```typescript
import {z} from 'zod';
import type {ToolDefinition} from '../interface.js';
import dedent from 'dedent';

const {toolName}ToolParameters = {
    param1: z.string().describe('Description for LLM'),
    param2: z.number().optional().describe('Optional parameter'),
};
const {toolName}ToolInputSchema = z.object({toolName}ToolParameters);

export type {ToolName}ToolParameters = z.infer<typeof {toolName}ToolInputSchema>;

export async function define{ToolName}Tool(): Promise<ToolDefinition<{ToolName}ToolParameters>> {
    return {
        name: '{toolName}',
        description: dedent`
            Clear description of what this tool does.
            Use dedent for multiline descriptions to avoid indentation issues.
        `,
        inputSchema: {toolName}ToolInputSchema,
    };
}
```

**Key points:**

- Import `type {ToolDefinition}` from `'../interface.js'` and annotate return type explicitly
- Define parameters as a plain object first, then wrap with `z.object()` — this is the project convention
- Use `.describe()` on every field to give the LLM context about each parameter
- Export the inferred type as `{ToolName}ToolParameters`
- Use `dedent` (from the `dedent` package) for multiline description strings
- Do **not** use `as const` on `name` — the explicit return type annotation handles typing

### 3. Write implement.ts

```typescript
import type {{ToolName}ToolParameters} from './definition.js';
import type {ToolImplementation} from '../interface.js';

export async function create{ToolName}Implement(): Promise<ToolImplementation<{ToolName}ToolParameters>> {
    return async (parameters): Promise<string> => {
        // Tool logic here
        // Return a string result — this is what the LLM receives
        return 'result';
    };
}
```

**Key points:**

- The outer factory `create{ToolName}Implement()` is async to allow setup (e.g. config loading, sandboxing) without changing call sites
- The inner function signature is `(parameters, context)` — omit `context` if unused (as in the `read` tool)
- `ToolExecutionContext` provides `historyItems: AgentWorkItem[]` and `respondingModel: string` when needed
- Must always return a `string` — errors should be caught and returned as strings so the model always gets a response
- Use `node:fs/promises`, `child_process`, or other Node APIs as needed

### 4. Write index.ts

```typescript
export {define{ToolName}Tool} from './definition.js';
export type {{ToolName}ToolParameters} from './definition.js';
export {create{ToolName}Implement} from './implement.js';
```

### 5. Update tools/index.ts Barrel

Add exports to `src/agent/tools/index.ts`:

```typescript
export {define{ToolName}Tool, create{ToolName}Implement} from './{toolName}/index.js';
export type {{ToolName}ToolParameters} from './{toolName}/index.js';
```

### 6. Register with AgentLoop

```typescript
import {AgentLoop} from './agent/loop/index.js';
import {define{ToolName}Tool, create{ToolName}Implement} from './agent/tools/index.js';

const loop = new AgentLoop(apiKey, model);
const definition = await define{ToolName}Tool();
const implement = await create{ToolName}Implement();
loop.registerTool(definition, implement);
```

## Example: read Tool

The `read` tool at `src/agent/tools/read/` is the canonical reference.

**definition.ts pattern:**

```typescript
const readToolParameters = {
    target_file: z.string().describe('The absolute path to the file to read.'),
    offset: z.number().optional().describe('...'),
    limit: z.number().optional().describe('...'),
};
const readToolInputSchema = z.object(readToolParameters);

export type ReadToolParameters = z.infer<typeof readToolInputSchema>;

export async function defineReadTool(): Promise<ToolDefinition<ReadToolParameters>> {
    return {
        name: 'read',
        description: dedent`...`,
        inputSchema: readToolInputSchema,
    };
}
```

**implement.ts pattern:**

- Factory returns an async function; inner function only declares `parameters` (context unused)
- Errors from `readFile` surface as thrown exceptions — caught by `AgentLoop.executeToolCall` and returned as error strings

## Interface Reference

See `src/agent/tools/interface.ts`:

```typescript
interface ToolExecutionContext {
    historyItems: AgentWorkItem[]; // full conversation history at time of call
    respondingModel: string; // the model that issued this tool call
}

interface ToolDefinition<P = unknown> {
    name: string;
    description: string;
    inputSchema: z.ZodType<P>; // ZodType, not ZodObject — allows any Zod schema
}

type ToolImplementation<T = any> = (parameters: T, context: ToolExecutionContext) => Promise<string>;
```
