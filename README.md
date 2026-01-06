# Cloudflare AI Chatbot

A serverless AI chatbot built on **Cloudflare Pages**, **Workers**, and **Durable Objects**, with **session-based memory** and global edge deployment.

---

## Features

- Edge-deployed chat API (Cloudflare Workers)
- Session-based conversation memory (Durable Objects)
- Streaming Response (ReadableStream)
- Stateless frontend + stateful backend
- Secure API key storage (Cloudflare Secrets)
- Simple responsive web UI

---

## Architecture

```text
Browser
  ↓
Cloudflare Pages (Frontend)
  ↓
Worker API (/api/chat)
  ↓
Durable Object (Chat Memory)
  ↓
LLM (OpenAI or Workers AI)
```

---

## Project Structure

```text
public/
├── index.html          # Chat UI
├── app.js              # Frontend logic
├── styles.css
└── functions/
    └── api/
        └── chat.ts     # Chat endpoint (Pages Functions / Worker entry)
src/
├── chatMemoryDO.ts     # Durable Object implementation
└── worker.ts           # Worker logic (if used as separate entry)
wrangler.toml
```

---

## Requirements

* Cloudflare account
* Node.js >= 18
* Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

---

## Environment Setup

Store your API key securely as a Cloudflare secret:

```bash
wrangler secret put OPENAI_API_KEY
```

## Durable Object Configuration

Add this to `wrangler.toml`:

```toml
durable_objects = { bindings = [
  { name = "CHAT_MEMORY", class_name = "ChatMemoryDO" }
] }

migrations = [
  { tag = "v1", new_classes = ["ChatMemoryDO"] }
]
```

---

## Local Development

```bash
wrangler pages dev public
```

---

## Deployment

Deploy the Worker (includes Durable Objects bindings):

```bash
wrangler deploy --env production
```

Deploy the Pages frontend:

```bash
wrangler pages deploy public
```

After deployment, your chatbot will be live at your Cloudflare Pages URL.

---

## Roadmap

* Voice input/output
* Long-term memory summarization
* Model routing (OpenAI / Workers AI)
* Rate limiting and authentication

---

## License

MIT

---

## Author

Romy Chen
