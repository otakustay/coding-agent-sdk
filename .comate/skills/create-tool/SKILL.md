---
name: create-tool
description: >-
  Create new tools for the coding-agent-sdk agent. Use when:
  (1) Implementing a named tool (e.g. "implement a grep tool", "实现 grep 工具", "新增一个 bash 工具");
  (2) Creating a tool based on a spec or doc (e.g. "按 tool_doc.md 里的定义实现工具", "参考文档实现工具");
  (3) Adding any new tool capability that requires command execution, file I/O, API calls, or other external actions.
  Tools follow a standard structure: definition (Zod schema in definition.ts), implementation (async function in implement.ts), barrel export (index.ts), and registration in src/run/index.ts.
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
        const {param1: localName, param2} = parameters;
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
- Always destructure `parameters` into local constants; rename `snake_case` params to `camelCase` (e.g. `target_file` → `targetFile`)
- Errors are thrown as exceptions — `AgentLoop.executeToolCall` catches them and returns error strings to the model. Do **not** catch errors and return strings yourself unless you need custom formatting
- Use `stringifyError` from `'../../../utils/error.js'` when you need to format an error message into a string
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

### 6. Register in src/run/index.ts

Register the new tool in `src/run/index.ts` following the same pattern as existing tools:

```typescript
import {
    // ... existing imports ...
    define{ToolName}Tool,
    create{ToolName}Implement,
} from '../agent/tools/index.js';

const {toolName}Definition = await define{ToolName}Tool();
const {toolName}Implement = await create{ToolName}Implement();
agentLoop.registerTool({toolName}Definition, {toolName}Implement);
```

This step is **required** — the tool is not available to the agent until it is registered here.

## Example: read Tool

The `read` tool is the canonical reference implementation. Read these files before creating a new tool:

- `src/agent/tools/read/definition.ts`
- `src/agent/tools/read/implement.ts`
- `src/agent/tools/read/index.ts`

## Interface Reference

Read `src/agent/tools/interface.ts` for the full type definitions (`ToolDefinition`, `ToolImplementation`, `ToolExecutionContext`).
