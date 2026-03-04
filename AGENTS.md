## Coding Style

Always use default import for NodeJS built-in modules, except `existsSync`:

```ts
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
```

## Validation

Run validation after completing tasks unless the task is trivial and certain.

### Commands

Run these commands **in parallel**:

- npm run lint
- npm run type-check

### When to Run

On code modification milestones, use it frequently to ensure code correctness on every phase of task.

### Exceptions

Skip validation only for trivial changes (e.g., typo fixes, comment updates) where correctness is obvious.

## Unit Test

Unit tests are NOT mandatory, ONLY write tests for essential functions.

### Test File Convention

Test file is located in `__test__` folder next to the source file, with the same name as the source file but with a `.test.ts` extension.

```
/src
  /utils
    string.ts
    /__tests__
      string.test.ts
```
