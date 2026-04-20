# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start local dev server (Vite, hot-reload)
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

No test runner is configured. No lint command is configured.

## Environment

Copy `.env.example` to `.env` for production config, or use `.env.development` for local dev. Key variables:

- `VITE_API_BASE_URL` — backend API base (e.g. `http://localhost:7896/api`)
- `VITE_API_ORIGIN` — used as `Origin` header for CORS
- `VITE_FEEDBACK_ENABLED` — toggles the post-chat feedback modal

## Architecture

**Vue 3 (Composition API) + Vite. No router, no Vuex/Pinia — all state is local to components.**

### App Flow

```
App.vue (screen: "form" | "chat")
  ├── PreChatForm.vue  →  collects name, email, organization
  └── ChatScreen.vue   ←  receives userInfo as prop
```

`App.vue` owns the top-level `screen` state and passes user info down once the form is submitted. There is no shared store.

### Key Files

| File | Purpose |
|------|---------|
| `src/App.vue` | Root component; routes between form and chat screens |
| `src/components/PreChatForm.vue` | User intake form with custom accessible combobox |
| `src/components/ChatScreen.vue` | Full chat UI — messages, sidebar, input, feedback modal |
| `src/components/TypingIndicator.vue` | Animated dots while awaiting API response |
| `src/api/chat.js` | `sendMessage()` and `submitFeedback()` — all API calls |
| `src/utils/markdown.js` | XSS-safe markdown → HTML renderer (no external library) |
| `src/data/organizations.js` | Hardcoded organization list for the form combobox |
| `src/styles.css` | Global styles and CSS custom properties (design tokens) |

### API Contract (`src/api/chat.js`)

- `POST /api/chat` — sends `{ message, conversation_id, name, email, organization }`, expects `{ response, conversation_id, sources[], escalate_to_human }`
- `POST /api/feedback` — sends `{ conversation_id, rating (1–5), comment }`

The API module validates inputs and response shapes; it enforces HTTPS in production.

### Markdown Renderer (`src/utils/markdown.js`)

Hand-rolled renderer — **do not swap in a third-party library without auditing XSS surface**. All text is HTML-entity-escaped before any regex substitution. Supports headings, bold/italic, links (https/mailto only), fenced code blocks, lists, and `---` rules.

### Security Constraints

- `index.html` has a strict Content Security Policy — no inline scripts, no iframes, camera/mic/geo all disabled.
- The markdown renderer intentionally escapes all raw HTML; keep this invariant when modifying it.
- API calls reject non-HTTPS base URLs in production.


claude --resume c13286e3-dc53-492a-a334-98f86ac43188 