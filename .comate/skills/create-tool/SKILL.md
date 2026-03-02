---
name: create-tool
description: >-
  Apply whenever working with tools in this SDK — creating new tools, modifying or extending existing
  tools, updating tool definitions or parameters, optimizing tool logic, debugging tool behavior,
  reading or reviewing tool-related code. Covers any files under src/agent/tools/, including
  definition.yml, definition.ts, implement.ts, index.ts, utils.ts, and interface.ts.
  Tools follow a standard four-file structure: definition.yml (name + description + JSON Schema),
  definition.ts (TypeScript interface + factory), implement.ts (async runtime function),
  index.ts (barrel export), plus registration in src/run/index.ts.
---

# Tool Development

## Structure

```
src/agent/tools/
├── interface.ts          # ToolDefinition, ToolImplementation, ToolExecutionContext
├── utils.ts              # loadDefinitionFromYaml / loadDefinitionFromYamlRelative
├── index.ts              # Barrel export for all tools
└── {toolName}/
    ├── definition.yml    # name, description, JSON Schema parameters
    ├── definition.ts     # TypeScript parameter interface + define{Tool}Tool() factory
    ├── implement.ts      # create{Tool}Implement() factory
    └── index.ts          # Barrel re-export
```

## Coding Standards

### implement.ts

- Always destructure `parameters` into local constants; rename `snake_case` to `camelCase` (e.g. `target_file` → `targetFile`)
- Throw `Error` directly — the agent loop catches and formats it. Do not catch errors and return strings unless custom formatting is needed
- Use `dedent` for multiline string content; do not concatenate `\n` manually

### definition.ts

- Use `interface` (not `type alias`) for the Parameters type
- **ALWAYS** keep `parameters` in `definition.yml` and the TypeScript interface in `definition.ts` in sync — update both together whenever a parameter is added, removed, or changed
- No Zod in `definition.ts`; runtime validation is handled in the agent loop via `z.fromJSONSchema`

## Creating a New Tool

### 1. Write definition.yml

```yaml
name: {toolName}

description: |
  Clear description of what this tool does and when the LLM should use it.
  Use {{placeholderKey}} for any dynamic content replaced at definition time.

parameters:
  type: object
  properties:
    param1:
      type: string
      description: Description for LLM.
    param2:
      type: number
      description: Optional parameter.
  required:
    - param1
```

- `description` uses YAML literal block (`|`) — no escaping needed for backticks, quotes, etc.
- `parameters` is plain JSON Schema — `type`, `properties`, `required`, `enum`, `items`, etc.
- Omitting a property from `required` makes it optional

### 2. Write definition.ts

```typescript
import type {ToolDefinition} from '../interface.js';
import {loadDefinitionFromYamlRelative} from '../utils.js';

export interface {ToolName}ToolParameters {
    param1: string;
    param2?: number;
}

export async function define{ToolName}Tool(): Promise<ToolDefinition> {
    return loadDefinitionFromYamlRelative(import.meta.url);
}
```

For tools with **dynamic description content**, replace placeholders inline after loading:

```typescript
export async function define{ToolName}Tool(dynamicValue: string): Promise<ToolDefinition> {
    const definition = await loadDefinitionFromYamlRelative(import.meta.url);
    return {
        ...definition,
        description: definition.description.replace(/\{\{placeholder\}\}/g, dynamicValue),
    };
}
```

### 3. Write implement.ts

```typescript
import type {{ToolName}ToolParameters} from './definition.js';
import type {ToolImplementation} from '../interface.js';

export async function create{ToolName}Implement(): Promise<ToolImplementation<{ToolName}ToolParameters>> {
    return async (parameters): Promise<string> => {
        const {param1, param2} = parameters;
        // Return a string — this is what the LLM receives
        return 'result';
    };
}
```

The outer factory is async to allow setup (config loading, etc.) without changing call sites. `ToolExecutionContext` provides `historyItems`, `respondingModel`, `workingAgentLoop`, etc. when needed.

### 4. Write index.ts

```typescript
export {define{ToolName}Tool} from './definition.js';
export type {{ToolName}ToolParameters} from './definition.js';
export {create{ToolName}Implement} from './implement.js';
```

### 5. Update tools/index.ts

```typescript
export {define{ToolName}Tool, create{ToolName}Implement} from './{toolName}/index.js';
export type {{ToolName}ToolParameters} from './{toolName}/index.js';
```

### 6. Register in src/run/index.ts

```typescript
const {toolName}Definition = await define{ToolName}Tool();
const {toolName}Implement = await create{ToolName}Implement();
agentLoop.registerTool({toolName}Definition, {toolName}Implement);
```

This step is **required** — the tool is not available to the agent until registered here.

## Reference

- `src/agent/tools/read/` — canonical reference implementation (all four files)
- `src/agent/tools/interface.ts` — `ToolDefinition`, `ToolImplementation`, `ToolExecutionContext`
- `src/agent/tools/utils.ts` — `loadDefinitionFromYaml`, `loadDefinitionFromYamlRelative`
