# Agent SDK

A coding agent SDK with terminal user interface (TUI).

## Prerequisites

- Node.js 24+
- OpenRouter API key

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file with your OpenRouter API key:

```bash
echo "OPENROUTER_API_KEY=your-api-key-here" > .env
```

3. Run TUI:

```bash
npm run tui
```

## Usage

- Type your question and press Enter to submit
- The agent will process your request using available tools
- Press Backspace/Delete to edit input
- Press Ctrl+C to exit

## Development

```bash
npm run lint        # Run linter
npm run type-check  # Type check
npm run build       # Build project
npm test            # Run tests
```
