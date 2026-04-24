# plexicus

> Security findings & remediation, right in your terminal.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/plexicus/cli?label=release)](https://github.com/plexicus/cli/releases/latest)
[![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1?logo=bun&logoColor=black)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-52%20passing-brightgreen)](https://github.com/plexicus/cli/actions)

<!-- Terminal demo — recording coming soon -->
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ plexicus  v0.1.0  user@example.com                                   ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ SEVER   CVE / Name                              Repo          Date   ┃
┃ ────────────────────────────────────────────────────────────────────  ┃
┃ CRIT  ▸ CVE-2024-1234 SQL Injection in users    backend   2024-11-01 ┃
┃ HIGH    CVE-2024-5678 XSS via query param       frontend  2024-11-02 ┃
┃ HIGH    CVE-2024-9012 Path Traversal            api-gw    2024-11-03 ┃
┃ MED     CVE-2024-3456 CSRF token missing        web-app   2024-11-04 ┃
┃ LOW     Outdated dependency (lodash 4.17.15)    infra     2024-11-05 ┃
┃                                                                      ┃
┃ 1–5 of 47 findings  (page 1/3 — ] next, [ prev)                     ┃
┃ [Enter]detail  [r]emediate  [s]uppress  [f]alse-pos  [c]hat  [/]search ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
> Press : for commands, / to search
```

**plexicus** is a terminal UI for [Plexicus ASPM](https://plexicus.ai) — browse security findings, triage vulnerabilities, trigger AI-powered remediations, and open pull requests, all without leaving your terminal.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Panels](#panels)
  - [Findings panel](#findings-panel)
  - [Repos panel](#repos-panel)
  - [AI chat sidebar](#ai-chat-sidebar)
  - [Detail pane](#detail-pane)
- [Keyboard reference](#keyboard-reference)
- [REPL commands](#repl-commands)
- [AI chat setup](#ai-chat-setup)
- [Configuration](#configuration)
- [CLI reference](#cli-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Findings panel** — paginated list of security findings sorted by severity, with CVE IDs, repository, and date
- **Repos panel** — browse scanned repositories and their scan status
- **AI chat sidebar** — ask questions about your findings using Claude or OpenAI; context-aware, streams live
- **Remediation workflow** — request AI-generated remediations, review diffs, and open pull requests from the TUI
- **Fuzzy search** — instantly filter findings by name, CVE ID, or repository
- **REPL command bar** — `:ask`, `:filter`, `:theme` without touching a config file
- **Vim navigation** — `j`/`k`, `gg`/`G`, `Enter`, `Esc` — no mouse required
- **Dark and light themes** — switch live with `:theme dark` or `:theme light`
- **Zero-dependency install** — single static binary, no Node.js or Bun runtime needed on the target machine

---

## Installation

Download the latest binary for your platform from the [releases page](https://github.com/plexicus/cli/releases/latest):

```bash
# macOS (Apple Silicon)
curl -fsSL https://github.com/plexicus/cli/releases/latest/download/plexicus-darwin-arm64 \
  -o plexicus && chmod +x plexicus && sudo mv plexicus /usr/local/bin/

# macOS (Intel)
curl -fsSL https://github.com/plexicus/cli/releases/latest/download/plexicus-darwin-x64 \
  -o plexicus && chmod +x plexicus && sudo mv plexicus /usr/local/bin/

# Linux (x86-64)
curl -fsSL https://github.com/plexicus/cli/releases/latest/download/plexicus-linux-x64 \
  -o plexicus && chmod +x plexicus && sudo mv plexicus /usr/local/bin/
```

Verify:

```bash
plexicus --version
```

---

## Quick start

> **First launch**: if you have no existing configuration, plexicus will open a setup wizard to collect the server URL before proceeding to login. Enter `https://api.app.plexicus.ai` (the default) or your self-hosted endpoint, then press `Enter`.

**1. Authenticate**

```bash
plexicus login
```

Or pass a token directly:

```bash
plexicus --token <your-token>
# or
export PLEXICUS_TOKEN=<your-token>
plexicus
```

**2. Open the TUI**

```bash
plexicus
```

**3. Navigate**

| Key | Action |
|-----|--------|
| `j` / `k` | Move down / up |
| `Enter` | Open finding detail |
| `/` | Fuzzy search |
| `?` | Show all keybindings |
| `Ctrl+C` | Quit |

---

## Panels

### Findings panel

The default view. Shows all findings for your connected repositories, sorted by severity (Critical → High → Medium → Low → Informational).

- **Pagination**: 20 findings per page. Use `]` and `[` to move between pages.
- **Filtering**: use `:filter severity:critical,high` or `:filter repo:my-service` to narrow the list.
- **Jump to CVE**: launch with `plexicus --cve CVE-2024-1234` to open the TUI with that finding pre-selected.

### Repos panel

Press `2` or `Tab` to switch to the repos panel. Shows all repositories connected to your Plexicus account with their current scan status: `idle`, `scanning`, `completed`, or `failed`.

### AI chat sidebar

Press `c` to toggle the chat sidebar. Ask anything about your findings:

```
You: What's the risk of CVE-2024-1234 in my environment?
AI:  CVE-2024-1234 is a SQL injection vulnerability rated CVSS 9.8 (Critical).
     In your backend service it affects the user authentication endpoint...
```

The sidebar streams responses live. Press `Esc` to close it.

You can also pre-fill the chat from the REPL: `:ask what is the safest way to fix this?`

### Detail pane

Press `Enter` on any finding to open the detail pane:

- CVE ID and CVSS score
- Full vulnerability description
- File path and line number
- Status (open / mitigated / false positive)
- Actions: remediate, create PR, suppress, toggle false positive

---

## Keyboard reference

### Navigation mode (default)

| Key | Action |
|-----|--------|
| `j` or `↓` | Move cursor down |
| `k` or `↑` | Move cursor up |
| `gg` | Jump to top of list |
| `G` | Jump to bottom of list |
| `Enter` | Select / open detail pane |
| `Esc` | Close detail pane / go back |
| `1` | Switch to Findings panel |
| `2` | Switch to Repos panel |
| `Tab` | Toggle between panels |
| `]` / `[` | Next / previous page |
| `/` | Open fuzzy search (findings panel only) |
| `:` | Open REPL command bar |
| `c` | Toggle AI chat sidebar |
| `?` | Show keybindings help |
| `Ctrl+C` | Exit (press `Esc` first if you are in REPL mode) |

### Finding actions (navigation mode)

| Key | Action |
|-----|--------|
| `r` | Request AI remediation |
| `p` | Create pull request from remediation |
| `s` | Mark finding as mitigated |
| `f` | Toggle false positive status |

### REPL mode (`:` to enter)

| Key | Action |
|-----|--------|
| Any char | Type command |
| `↑` / `↓` | Navigate command history (last 20) |
| `Backspace` | Delete last character |
| `Enter` | Execute command |
| `Esc` | Exit REPL, return to navigation |

### Fuzzy search (`/` to enter)

| Key | Action |
|-----|--------|
| Any char | Filter results |
| `↑` / `↓` | Move cursor in results |
| `Enter` | Select result |
| `Esc` | Cancel |

### Chat mode (`c` to enter)

| Key | Action |
|-----|--------|
| `Esc` | Close sidebar, return to navigation |

---

## REPL commands

Open the REPL with `:` and type a command. Press `Esc` to return to navigation without running anything.

### `:ask <question>`

Opens the AI chat sidebar and sends the question immediately.

```
:ask what is the impact of CVE-2024-1234?
:ask how should I prioritize these findings?
```

### `:filter <criteria>`

Filters the findings list. Criteria can be combined.

```bash
:filter severity:critical
:filter severity:critical,high
:filter repo:my-backend
:filter severity:high repo:frontend
```

Valid severity levels: `critical`, `high`, `medium`, `low`, `informational`

To clear the filter, run `:filter` with no arguments (or restart the TUI).

### `:theme <name>`

Switches the UI colour theme live.

```
:theme dark
:theme light
```

### `:config`

The `config` command is available in the REPL registry for in-TUI configuration queries. For setting persistent values, use the `plexicus config set` CLI subcommand from your shell.

---

## AI chat setup

The AI chat sidebar uses your own API key. Configure a provider once:

```bash
# Use Claude (Anthropic)
plexicus config set llm.provider claude
plexicus config set llm.api_key sk-ant-...

# Use OpenAI (or any OpenAI-compatible endpoint)
plexicus config set llm.provider openai
plexicus config set llm.api_key sk-...
plexicus config set llm.model gpt-4o          # optional, overrides default
plexicus config set llm.base_url https://...  # optional, for custom endpoints
```

Your API key is stored in `~/.config/plexicus/config.json` with `0600` permissions (owner read/write only).

---

## Configuration

All configuration is stored in `~/.config/plexicus/config.json`. Modify it with `plexicus config set` or edit the file directly.

Keys passed to `plexicus config set` use snake_case aliases (`llm.api_key`, `llm.base_url`). They are normalized to camelCase when written to the JSON file (`llm.apiKey`, `llm.baseUrl`).

| Key (CLI / `config set`) | Key (JSON file) | Description | Default |
|--------------------------|-----------------|-------------|---------|
| `serverUrl` | `serverUrl` | Plexicus API base URL | `https://api.app.plexicus.ai` |
| `token` | `token` | Authentication token | — |
| `theme` | `theme` | UI colour theme (`dark` \| `light`) | `dark` |
| `llm.provider` | `llm.provider` | LLM provider (`claude` \| `openai`) | — |
| `llm.api_key` | `llm.apiKey` | API key for the LLM provider | — |
| `llm.model` | `llm.model` | Model name (optional override) | Provider default |
| `llm.base_url` | `llm.baseUrl` | Custom base URL (OpenAI-compatible endpoints) | — |

Example `~/.config/plexicus/config.json`:

```json
{
  "serverUrl": "https://api.app.plexicus.ai",
  "token": "plx_...",
  "theme": "dark",
  "llm": {
    "provider": "claude",
    "apiKey": "sk-ant-..."
  }
}
```

---

## CLI reference

### `plexicus` (default — opens TUI)

```
plexicus [options]

Options:
  --token <token>   Authentication token (overrides PLEXICUS_TOKEN env and config)
  --repo <name>     Filter findings to a specific repository on launch
  --cve <id>        Open the TUI with a specific CVE pre-selected (e.g. CVE-2024-1234)
  --version         Print version
  --help            Show help
```

### `plexicus login`

```
plexicus login [options]

Options:
  --token <token>   Authenticate non-interactively with a token
```

### `plexicus repos`

Opens the TUI directly on the Repos panel.

### `plexicus config set <key> <value>`

```
plexicus config set <key> <value>

Examples:
  plexicus config set llm.provider claude
  plexicus config set llm.api_key sk-ant-...
  plexicus config set theme light
  plexicus config set serverUrl https://api.example.com
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `PLEXICUS_TOKEN` | Authentication token (lower priority than `--token`, higher than config file) |
| `MOCK_PLEXICUS` | Set to `1` to load fixture data instead of making real API calls (for development) |

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, architecture overview, testing guide, and pull request checklist.

---

## License

[MIT](LICENSE) — Copyright © 2026 Plexicus
