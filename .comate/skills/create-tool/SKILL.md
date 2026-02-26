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

const {toolName}ToolInputSchema = z.object({
    param1: z.string().describe('Description for LLM'),
    param2: z.number().optional().describe('Optional parameter'),
});

export type {ToolName}ToolParameters = z.inferfer<typeof {toolName}ToolInputSchema>;

export async function define{ToolName}Tool() {
    return {
        name: '{toolName}' as const,
        description: 'Clear description of what this tool does',
        inputSchema: {toolName}ToolInputSchema,
    };
}
```

**Key points:**

- Export `define{ToolName}Tool()` as an async factory function
- Use `z.object()` with `.describe()` on each field for LLM context
- Export the inferred type as `{ToolName}ToolParameters`
- Return `name` with `as const` assertion

### 3. Write implement.ts

```typescript
import type {{ToolName}ToolParameters} from './definition.js';
import type {ToolImplementation} from '../interface.js';

export async function create{ToolName}Implement(): Promise<ToolImplementation<{ToolName}ToolParameters>> {
    return async (parameters, context): Promise<string> => {
        // Tool logic here
        // Return a string result
        return 'result';
    };
}
```

**Key points:**

- Return `ToolImplementation<T>` which is `(params, context) => Promise<string>`
- First param is the tool parameters (typed)
- Second param is `ToolExecutionContext` (optional `id`)
- Must return a string (tool output sent back to LLM)
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

Reference the existing `read` tool at `src/agent/tools/read/`:

**definition.ts:**

- Schema: `{file: z.string()}`
- Describes reading file contents from filesystem

**implement.ts:**

- Uses `node:fs/promises.readFile`
- Returns file content as string

## Interface Reference

See `src/agent/tools/interface.ts`:

```typescript
interface ToolExecutionContext {
    id?: string;
}

interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: z.ZodObject<any>;
}

type ToolImplementation<T> = (parameters: T, context: ToolExecutionContext) => Promise<string>;
```

## Resources

This skill creates project-specific tools. No bundled resources required - delete the example directories if not needed.
