---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## Plexicus TUI

### Running the TUI

```bash
# Development (mock API — real API not yet live)
MOCK_PLEXICUS=1 bun run src/main.tsx --token test

# CLI subcommands
bun run src/main.tsx config set llm.provider claude
bun run src/main.tsx config set llm.api_key <key>
bun run src/main.tsx config set llm.base_url <url>
bun run src/main.tsx login
bun run src/main.tsx repos

# Type check
bun run typecheck   # tsc --noEmit

# Build binary
bun build src/main.tsx --outfile dist/plexicus --target bun
```

### Entry point and CLI (`src/main.tsx`)
Commander entrypoint with 4 subcommands: default (TUI), `login`, `repos`, `config set`. Each lazily imports its module. Token resolution: `--token` flag → `PLEXICUS_TOKEN` env → `~/.config/plexicus/config.json`.

### State management (`src/state/`)
Pure `useReducer` + React Context. `AppState.tsx` exports `AppStateProvider` + `useAppState`. `actions.ts` has the full discriminated union `Action` type. No direct state mutation anywhere.

Key state fields:
- `inputMode: 'navigation' | 'repl' | 'chat' | 'login'` — gates ALL keyboard input
- `fuzzyOpen: boolean` — controls FuzzyPicker; also forces `inputMode: 'repl'` when true
- `pendingChatMessage: string | null` — bridges `/ask <question>` → ChatSidebar auto-send
- `findingsFilter: { repo?, severities? }` — applied client-side via `useMemo` in `useFindings`

### Keyboard input architecture (`src/components/App.tsx`, `src/hooks/useKeymap.ts`)
**Critical**: The REPL bar does NOT use `ink-text-input`. It uses direct `useInput` char capture in `App.tsx` because `ink-text-input` v6 focus is unreliable in tmux. Characters accumulate in `replInput` state; a `replInputRef` (updated each render) provides stale-closure-safe access for the Enter handler.

Key bindings by mode:
- **Navigation**: `j/k` (move), `gg/G` (top/bottom), `Enter` (select), `r/p/s/f` (actions), `/` (fuzzy), `:` (REPL), `c` (chat toggle), `?` (help), `1/2/Tab` (panels)
- **REPL**: printable chars → accumulate; `Backspace` → delete; `Enter` → submit; `↑/↓` → history; `Esc` → exit
- **Chat**: `Esc` → close sidebar (blocked when help overlay open via `helpOpen` prop)
- **Fuzzy**: `↑/↓` → cursor; `Enter` → select; `Esc` → cancel

`?` opens help in `navigation` and `chat` modes only (typeable in repl). Ink has no `stopPropagation` — when `?` opens the help overlay, `ChatSidebar` retroactively clears any leaked `?` via `useEffect` and guards its `useInput` with `if (helpOpen) return` to prevent Escape from closing the sidebar while help is shown.

### Component tree (`src/components/`)
`App.tsx` → `AuthGate` (FirstRunWizard → LoginForm → AppShell). `AppShell`: header, FindingsPanel or ReposPanel (left), ChatSidebar (right, optional), DetailPane/DiffView (conditional), REPL bar (bottom).

`FuzzyPicker` renders inside `FindingsPanel` when `state.fuzzyOpen && state.activePanel === 'findings'`.

### API and mock mode (`src/services/plexicusApi.ts`)
Set `MOCK_PLEXICUS=1` to load fixture data from `tests/fixtures/plexicus/` instead of making HTTP calls. All responses validated via Zod schemas in `src/services/apiSchemas.ts`.

### Config (`src/services/config.ts`)
Stored at `~/.config/plexicus/config.json`. Atomic writes: `mkdir(0o700)` → `chmod` → `writeFile(tmp, 0o600)` → `rename` → `chmod`. Key aliases normalized in `setConfigValue`: `llm.api_key → llm.apiKey`, `llm.base_url → llm.baseUrl`.

### LLM streaming (`src/services/llm/`)
`streamLLM` routes to `streamClaude` (Anthropic SDK) or `streamOpenAI` based on `config.llm.provider`. User supplies their own API key. `useLLMStream` hook manages `AbortController` with cleanup on unmount.

### Command registry (`src/commands.ts`)
Discriminated union: `PromptCommand | LocalCommand | LocalJSXCommand`. Lazily loaded via lodash-es `memoize()`. The REPL in `App.tsx` inline-handles `ask/filter/theme`.

### Testing
Mock API via `MOCK_PLEXICUS=1`. Config tests use `beforeEach`/`afterEach` with `mkdtemp` + `process.env.HOME` override to isolate filesystem. Component tests use `ink-testing-library`. Use dynamic `import()` (not top-level) in tests when the module reads env vars at init time.
