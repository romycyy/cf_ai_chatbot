# Cloudflare AI Chatbot

A serverless AI chatbot with a **React (Vite) frontend** and a **Cloudflare Worker** backend that streams responses and stores **session-based memory** in a **Durable Object**.

## Features

- **Streaming chat**: tokens are streamed from the Worker to the browser via `ReadableStream`
- **Session memory**: conversation history is stored per session in a Durable Object (`CHAT_MEMORY`)
- **Mode selection**: choose a conversation mode (General, Teaching, Coding, Writing, Creative) — each mode uses a tailored system prompt
- **Model selection**: pick from GPT-4o Mini, GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo, or o1-mini via a settings side panel
- **Max tokens control**: adjust the response length (50–4096 tokens) with a slider
- **Conversation preservation**: switching models or modes mid-conversation is seamless — history is stored independently and the new model continues from where the previous one left off
- **Secure secret storage**: `OPENAI_API_KEY` is stored as a Cloudflare secret (or `.dev.vars` locally)

## Architecture

```text
Browser (Vite React)
  ↓  POST /chat  { message, mode, model, maxTokens }
Cloudflare Worker
  ↓  fetch() internal DO endpoints
Durable Object (ChatMemoryDO)
  ↓
OpenAI API
```

## Project Structure

```text
frontend/                 # Vite + React UI
  src/
    App.tsx               # Chat UI, mode bar, settings panel, streaming client
    styles.css            # All styles (chat, mode bar, settings panel)
  index.html
  vite.config.ts

worker/                   # Cloudflare Worker + Durable Object
  src/
    index.ts              # Worker entry; routes POST /chat, CORS
    routes/chat.ts        # Streaming OpenAI call; mode/model/token handling
    chatMemoryDO.ts       # Durable Object: /history, /append, /reset
  wrangler.toml           # DO bindings + migrations (dev + production envs)
```

## Requirements

- **Node.js** >= 18
- **Wrangler CLI** (via `npx wrangler` or global install)
- **Cloudflare account** (for deployment)

## Configuration

### Worker secret: `OPENAI_API_KEY`

Set it for the target environment:

```bash
cd worker
npx wrangler secret put OPENAI_API_KEY --env dev
npx wrangler secret put OPENAI_API_KEY --env production
```

For local dev, you can also create `worker/.dev.vars`:

```bash
OPENAI_API_KEY=sk-...
```

### Frontend API URL

The frontend calls `POST /chat` against the URL defined in `API_URL` inside `App.tsx`. Update it to match your Worker's public URL when deploying.

## Local Development

Run the backend and frontend in two terminals.

### 1) Start the Worker (API)

```bash
cd worker
npm install
npx wrangler dev --env dev
```

Wrangler will print the local URL (typically `http://127.0.0.1:8787`).

### 2) Start the Frontend (UI)

```bash
cd frontend
npm install
npm run dev
```

## API

### `POST /chat`

- **Headers**:
  - `Content-Type: application/json`
  - `X-Session-Id: <uuid>` (required)
- **Body**:

```json
{
  "message": "Hello!",
  "mode": "general",
  "model": "gpt-4o-mini",
  "maxTokens": 1024
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `message` | string | *(required)* | The user's message |
| `mode` | string | `"general"` | One of: `general`, `teaching`, `coding`, `writing`, `creative` |
| `model` | string | `"gpt-4o-mini"` | One of: `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`, `o1-mini` |
| `maxTokens` | number | `1024` | Max completion tokens (clamped to 50–4096) |

Response is streamed as `text/plain; charset=utf-8`.

## Deployment

### Deploy the Worker

```bash
cd worker
npm run deploy:dev          # → chatbot-dev
npm run deploy:prod         # → chatbot (production)
```

Or directly:

```bash
npx wrangler deploy --env dev
npx wrangler deploy --env production
```

> **Note:** `npm run deploy --env=dev` does **not** work — npm absorbs the flag. Use `npm run deploy:dev` or call `npx wrangler deploy --env dev` directly.

### Deploy the Frontend

Build the frontend and deploy `frontend/dist` to your static host of choice (Cloudflare Pages recommended).

```bash
cd frontend
npm run build
```

## Roadmap

- Durable Object memory summarization / long-term memory
- Rate limiting + auth
- Voice input/output
- Markdown rendering in chat messages

## License

MIT

## Author

Romy Chen
