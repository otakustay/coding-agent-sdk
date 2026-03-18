---
name: no-let-declaration
description: Enforce const-only variable declarations in TypeScript. Activate whenever generating or modifying TypeScript code that contains or would contain `let` variable declarations. Convert every `let` to `const` using the appropriate pattern based on the scenario.
---

# No Let Declaration

Never use `let` to declare variables. Use `const` with the appropriate pattern for each scenario.

## Pattern 1: Incrementing Counter

```ts
// Bad
let seq = 0;
seq++;

// Good - use createIncrementCounter from src/utils/id.ts
const seq = createIncrementCounter();
seq(); // returns 0, 1, 2, ...
```

Also use for `nextOutputIndex`, `taskIdCounter`, or any auto-incrementing numeric variable.

## Pattern 2: try/catch Assignment

```ts
// Bad
let result = defaultValue;
try {
    result = doSomething();
}
catch {
    result = fallback;
}

// Good - extract to a function
function doSomethingSafe(): ResultType {
    try {
        return doSomething();
    }
    catch {
        return fallback;
    }
}
const result = doSomethingSafe();
```

Real examples in this codebase:

- `parseJsonSafe(text, fallback)` in `src/utils/string.ts`
- `waitAgentTask(agent, query)` in `src/agent/tools/agent/implement.ts`

## Pattern 3: Mutable Iteration State

For variables that accumulate or change across a loop/iteration:

```ts
// Bad
let pendingGroup: Group | null = null;
let system: string | undefined;

// Good - declare a typed interface and const state object
interface IterationState {
    pendingGroup: Group | null;
    system: string | undefined;
}
const state: IterationState = {pendingGroup: null, system: undefined};

// Mutate via state.pendingGroup = ..., state.system = ...
```

Group related mutable variables together. Always extract the interface as a named type, not inline on the `const` declaration.

## Pattern 4: Map getOrCreate

```ts
// Bad
let tracked = map.get(key);
if (!tracked) {
    tracked = createItem();
    map.set(key, tracked);
    yield addedEvent(tracked);
}

// Good - getOrCreate helper returning [item, isNew]
function getOrCreate<K, V>(map: Map<K, V>, key: K, factory: () => V): [V, boolean] {
    const existing = map.get(key);
    if (existing !== undefined) return [existing, false];
    const item = factory();
    map.set(key, item);
    return [item, true];
}

const [tracked, isNew] = getOrCreate(map, key, () => createItem());
if (isNew) { yield addedEvent(tracked); }
```

## Pattern 5: Deferred Conditional Value

For variables assigned inside if/else or try/catch and used after:

```ts
// Bad
let finishReason: FinishReason;
try {
    await agent.run(query);
    finishReason = 'success';
}
catch {
    finishReason = 'exception';
}

// Good - extract to a function that returns the value
async function waitAgentTask(agent: Agent, query: string): Promise<FinishReason> {
    try {
        await agent.run(query);
        return 'success';
    }
    catch {
        return 'exception';
    }
}
const finishReason = await waitAgentTask(agent, query);
```

## Decision Guide

| Scenario                                          | Pattern                                     |
| ------------------------------------------------- | ------------------------------------------- |
| Numeric counter incremented in loop               | Pattern 1: `createIncrementCounter`         |
| try/catch with fallback value                     | Pattern 2: extract function                 |
| Multiple variables mutated across loop iterations | Pattern 3: `state` object                   |
| Map lookup with lazy initialization               | Pattern 4: `getOrCreate`                    |
| Variable assigned in if/try, used after           | Pattern 5: extract function returning value |
