## Code Act

This is a coding agent using only one tool executing JavaScript code to explore, analyze and act on your repository, we build it to demostrate how a Code-Act loop can archieve coding tasks with large language model and a very simple system prompt.

- Ensure NodeJS >= 24.
- Create `.env` and write `OPENAI_API_KEY` variable in it.

```shell
npm install

npm run build

node --env-file=.env dist/run.js
```

You can modify initial query in `src/run.ts`, `npm run build` must be
triggered after you modify any file in `src`.
