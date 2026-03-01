# Tool Implement

## Coding Standard For Tool Implementation

Always destructure `parameters` argument into local constants, convert all `snake_case` prameter to `camelCase` naming.

throw `Error` directly in tool implementation function, they'll be caught and correctly format into tool result content.

Use `dedent` for multi-line content, do not concate `\n` manually.
