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

## Usage

### Command Line Arguments

The program supports the following command line arguments:

#### `--query` or `-q` (required)

Specifies the query text to send to the AI agent.

Examples:

```bash
npm start -- --query "Create a Hello World program"
npm start -- -q "Analyze the structure of this project"
```

#### `--model` or `-m` (optional)

Specifies the AI model to use. Default: `openai/gpt-4o-mini`

Examples:

```bash
npm start -- --query "Optimize code" --model "openai/gpt-4o"
npm start -- -q "Write tests" -m "anthropic/claude-sonnet-4.5"
```

#### `--help` or `-h`

Display help information.

```bash
node dist/run.js --help
```

### Quick Start

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Run examples**
   ```bash
   # Use default model
   npm start -- -q "your question"

   # Specify model
   npm start -- -q "your question" -m "openai/gpt-4o"

   # Development mode (auto-build and run)
   npm run dev -- -q "your question"
   ```

### Available Models

Supports all models on the OpenRouter platform, including but not limited to:

- `openai/gpt-4o`
- `openai/gpt-4o-mini`
- `anthropic/claude-sonnet-4.5`
- `anthropic/claude-3.5-sonnet`
- `google/gemini-pro`

For a complete list of models, visit: https://openrouter.ai/models

### Output

The program saves execution results to the `./data/[timestamp]` directory:

- `*-script.js`: Generated script code
- `*-out.md`: Execution results in Markdown format
