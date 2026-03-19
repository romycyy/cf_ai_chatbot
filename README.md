# Cloudflare AI Chatbot

A serverless AI chatbot with a **React (Vite) frontend** and a **Cloudflare Worker** backend that streams responses and stores **session-based memory** in a **Durable Object**.

## Features

- **Streaming chat**: tokens are streamed from the Worker to the browser via `ReadableStream`
- **Session memory**: conversation history is stored per session in a Durable Object (`CHAT_MEMORY`)
- **Mode selection**: choose a conversation mode (General, Teaching, Coding, Writing, Creative) — each mode uses a tailored system prompt
- **Model selection**: pick from GPT-4o Mini, GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo, or o1-mini via a settings side panel
- **Max tokens control**: adjust the response length (50–4096 tokens) with a slider
- **Conversation preservation**: switching models or modes mid-conversation is seamless — history is stored independently and the new model continues from where the previous one left off
- **Shared contract**: `@cf-ai/shared` keeps modes, models, limits, and system prompts aligned between the UI and Worker
- **Secure secret storage**: `OPENAI_API_KEY` is stored as a Cloudflare secret (or `worker/.dev.vars` locally)

## Architecture

```text
Browser (Vite + React)
  ↓  POST /chat  { message, mode, model, maxTokens }
  ↓  Header: X-Session-Id
Cloudflare Worker
  ↓  stub.fetch() → Durable Object (per session)
Durable Object (ChatMemoryDO)  ←→  persistent message list
  ↓
OpenAI API (streaming completion)
```

## Monorepo layout

This repo is an **npm workspace** with three packages:

| Package | Role |
|---------|------|
| **`@cf-ai/shared`** | Types, allowed models/modes, token bounds, `SYSTEM_PROMPTS`, UI labels (`MODES`, `MODELS`) |
| **`frontend`** | Vite + React chat UI and streaming client |
| **`worker`** | Cloudflare Worker entry, `POST /chat` handler, Durable Object class |

Root scripts (run from the repo root after `npm install`):

| Script | What it does |
|--------|----------------|
| `npm run dev:frontend` | Start the Vite dev server |
| `npm run build:frontend` | Production build → `frontend/dist` |
| `npm run deploy:dev` | Deploy Worker to the **dev** environment |
| `npm run deploy:prod` | Deploy Worker to **production** |
| `npm run typecheck` | Typecheck all workspaces that define `typecheck` |

## Project structure

```text
package.json              # workspaces: shared, worker, frontend

shared/                   # @cf-ai/shared — imported by frontend + worker
  package.json
  tsconfig.json
  src/index.ts            # modes, models, ChatRequestBody, SYSTEM_PROMPTS, …

frontend/
  package.json
  tsconfig.json
  index.html
  vite.config.ts
  src/
    main.tsx              # React entry
    App.tsx               # Chat UI, settings, streaming fetch()
    styles.css
    vite-env.d.ts         # VITE_API_URL typing

worker/
  package.json
  wrangler.toml           # DO bindings + migrations (dev + production)
  tsconfig.json
  src/
    index.ts              # Worker fetch router, CORS, exports ChatMemoryDO
    routes/chat.ts        # OpenAI streaming, memory stub, validation
    chatMemoryDO.ts       # Durable Object: GET /history, POST /append
```

## Requirements

- **Node.js** >= 18
- **Wrangler** (via `npx wrangler` in `worker/`, or a global install)
- **Cloudflare account** (for deployment)

## Configuration

### Worker secret: `OPENAI_API_KEY`

```bash
cd worker
npx wrangler secret put OPENAI_API_KEY --env dev
npx wrangler secret put OPENAI_API_KEY --env production
```

For local dev, create **`worker/.dev.vars`** (gitignored):

```bash
OPENAI_API_KEY=sk-...
```

### Frontend: Worker URL (`VITE_API_URL`)

The app posts to whatever URL you set in **`VITE_API_URL`**. It must be the **full URL to the chat endpoint**, including the path, for example:

- Local: `http://127.0.0.1:8787/chat`
- Deployed: `https://your-worker.example.workers.dev/chat`

Use a Vite env file (e.g. **`frontend/.env.local`**, gitignored by `.env*.local` patterns):

```bash
VITE_API_URL=http://127.0.0.1:8787/chat
```

Vite only exposes variables prefixed with `VITE_`. After changing env files, restart the dev server.

## Local development

Install dependencies once from the **repository root** (links workspaces):

```bash
npm install
```

Then run the Worker and the UI in two terminals.

### 1) Worker (API)

```bash
cd worker
npx wrangler dev --env dev
```

Note the URL (often `http://127.0.0.1:8787`) and set `VITE_API_URL` to that origin + `/chat`.

### 2) Frontend (UI)

```bash
cd frontend
npm run dev
```

Or from root: `npm run dev:frontend`.

## API

### `POST /chat`

- **Headers**
  - `Content-Type: application/json`
  - `X-Session-Id: <string>` (required) — stable id per browser session; drives which Durable Object stores history
- **Body**

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
| `mode` | string | `"general"` | `general`, `teaching`, `coding`, `writing`, `creative` |
| `model` | string | `"gpt-4o-mini"` | Must be one of the allowed models in `@cf-ai/shared`; invalid values fall back to the default |
| `maxTokens` | number | `150` | Max completion tokens, clamped to **50–4096** (`shared` constants). The UI initializes its slider higher; omitted API calls use the package default |

Response body is streamed as **`text/plain; charset=utf-8`** (raw token text, not SSE).

### Other routes (Worker)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/`, `/health` | JSON `{ "ok": true }` health check |
| `OPTIONS` | `*` | CORS preflight |

## Deployment

### Worker

```bash
cd worker
npm run deploy:dev          # → chatbot-dev
npm run deploy:prod         # → chatbot (production)
```

Or:

```bash
npx wrangler deploy --env dev
npx wrangler deploy --env production
```

> **Note:** `npm run deploy --env=dev` does **not** work — npm consumes `--env`. Use `npm run deploy:dev` or `npx wrangler deploy --env dev`.

Set `OPENAI_API_KEY` for each environment (`wrangler secret put …`) after deploy if needed.

### Frontend

Build static assets, then host **`frontend/dist`** (Cloudflare Pages, R2 + Workers, etc.):

```bash
cd frontend
npm run build
```

Configure **`VITE_API_URL`** at build time (e.g. Pages project env var) so production points at your deployed Worker’s `/chat` URL.

## Roadmap

- Durable Object memory summarization / long-term memory
- Rate limiting + auth
- Voice input/output
- Markdown rendering in chat messages

## License

MIT

## Author

Romy Chen
