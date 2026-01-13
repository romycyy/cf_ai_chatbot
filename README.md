# Cloudflare AI Chatbot

A serverless AI chatbot with a **React (Vite) frontend** and a **Cloudflare Worker** backend that streams responses and stores **session-based memory** in a **Durable Object**.

## Features

- **Streaming chat**: tokens are streamed from the Worker to the browser via `ReadableStream`
- **Session memory**: conversation history is stored per session in a Durable Object (`CHAT_MEMORY`)
- **Stateless UI** + **stateful backend**: frontend is static; the Worker + DO hold memory
- **Simple controls UI**: model / max tokens / mode selectors in the sidebar (note: backend currently uses a fixed model)
- **Secure secret storage**: `OPENAI_API_KEY` is stored as a Cloudflare secret (or `.dev.vars` locally)

## Architecture

```text
Browser (Vite React)
  ↓  POST /chat  (streams text/plain)
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
    components/           # ChatWindow, MessageInput, Settings panel, etc.
    context/              # Persisted chat settings (model/maxTokens/mode/sessionId)
    hooks/                # Streaming client + persisted state
  index.html
  vite.config.ts

worker/                   # Cloudflare Worker + Durable Object
  src/
    index.ts              # Worker entry; routes POST /chat
    routes/chat.ts        # Streaming OpenAI call; reads/writes DO history
    chatMemoryDO.ts       # Durable Object: /history, /append, /reset
  wrangler.toml           # DO bindings + migrations (dev + production envs)
```

## Requirements

- **Node.js** >= 18
- **Wrangler CLI** (via `npx wrangler` or global install)
- **Cloudflare account** (for deployment)

## Configuration

### Worker secret: `OPENAI_API_KEY`

Set it for the target environment (recommended):

```bash
cd worker
npx wrangler secret put OPENAI_API_KEY --env production
```

For local dev, you can also create `worker/.dev.vars`:

```bash
OPENAI_API_KEY=sk-...
```

### Frontend env: `VITE_API_BASE`

The frontend calls:

- `POST ${VITE_API_BASE}/chat`
- with header `X-Session-Id` (persisted in the browser)

Create `frontend/.env`:

```bash
VITE_API_BASE=http://127.0.0.1:8787
```

When deployed, set `VITE_API_BASE` to your Worker’s public URL (e.g. `https://your-worker.your-domain.com`).

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
{ "message": "Hello!" }
```

Response is streamed as `text/plain; charset=utf-8`.

## Deployment

### Deploy the Worker (includes Durable Objects)

```bash
cd worker
npx wrangler deploy --env production
```

### Deploy the Frontend

Build the frontend with `VITE_API_BASE` pointing at your deployed Worker URL, then deploy `frontend/dist` to your static host of choice (Cloudflare Pages recommended).

```bash
cd frontend
npm run build
```

## Roadmap

- Durable Object memory summarization / long-term memory
- Use UI settings (model / max tokens / mode) end-to-end in the Worker
- Rate limiting + auth
- Voice input/output

## License

MIT

## Author

Romy Chen
