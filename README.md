# Dream Journal — Full Version

A small, mobile-first dream journal with seasonal themes, private local storage, a letter archive, and an optional streaming AI chat panel powered by OpenRouter through a Netlify Function.

Live demo: [dream-journal-gxf.netlify.app](https://dream-journal-gxf.netlify.app/)

## Features

- Record, edit, sort, and delete dreams.
- Keep separate “Then” records.
- Seasonal themes, automatic light/dark mode, and falling seasonal particles.
- “Mine” year/month/letter views.
- Optional streaming chat with OpenAI, Anthropic, or Google models available through OpenRouter.
- Conversation history, summaries, notes, and memory stored in the browser’s `localStorage`.
- Responsive layout for phone and desktop screens.

## Run locally

This is a static frontend plus one Netlify Function. The simplest local preview is:

```bash
npx netlify dev
```

Or serve the static files with any local web server. Chat requires Netlify Functions (or an equivalent serverless route) and an API key.

## Deploy to Netlify

1. Connect this repository to a Netlify site, or use Netlify Drop.
2. Set `OPENROUTER_API_KEY` in the Netlify environment variables. Never put the key in `app.js` or commit it to GitHub.
3. Deploy with `netlify.toml` so the `netlify/functions` directory is detected automatically.

The browser calls `/.netlify/functions/chat`; the function keeps the OpenRouter key on the server side and streams the response back to the UI.

## Private content and the Mine gate

The public repository intentionally does not include the original personal letters or exported letter text. `letters-data.js` is an empty safe default; use `letters-data.example.js` as a template for a private copy.

The Mine unlock phrase is a client-side UI gate, not real authentication. Replace `MINE_UNLOCK_PHRASE` in `app.js` for a personal deployment, and do not treat it as protection for sensitive data.

Dreams, notes, chat sessions, and model settings are stored locally in the browser. Clearing site data removes them, and they are not uploaded by the frontend except for the messages explicitly sent to the configured chat provider through the Netlify Function.

