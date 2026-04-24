# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-04-25

### Added

**Core TUI**
- Findings panel with paginated list (20 per page), severity badges, CVE IDs, repo, and date columns
- Repos panel with scan status indicators (idle / scanning / completed / failed)
- Detail pane for individual findings: CVE ID, CVSS score, description, file/line location
- Diff viewer for AI-generated remediations

**Navigation**
- Vim-style keyboard navigation: `j`/`k` to move, `gg`/`G` to jump to top/bottom
- Panel switching via `1`, `2`, or `Tab`
- Fuzzy search overlay triggered by `/`
- REPL command bar triggered by `:`
- Full keybindings help overlay via `?`

**Remediation workflow**
- `r` — request AI-powered remediation
- `p` — create pull request from remediation diff
- `s` — mark finding as mitigated
- `f` — toggle false positive status

**AI chat sidebar**
- Toggle with `c`; streaming responses from Claude or OpenAI
- `:ask <question>` REPL shortcut pre-fills and auto-sends a question
- Context-aware: includes current findings in the system prompt

**REPL commands**
- `:ask <question>` — open chat and send a question
- `:filter severity:<levels> repo:<name>` — client-side filter
- `:theme dark|light` — switch theme live

**Configuration**
- `~/.config/plexicus/config.json` with atomic writes (0o600 permissions)
- `plexicus config set <key> <value>` CLI subcommand
- LLM provider selection: Claude (Anthropic SDK) and OpenAI (OpenAI SDK)
- Custom `baseUrl` support for OpenAI-compatible endpoints

**Auth**
- Interactive `plexicus login` flow
- `--token` flag, `PLEXICUS_TOKEN` environment variable, and config file fallback
- First-run wizard for initial server URL setup

**Developer experience**
- `MOCK_PLEXICUS=1` mode loads fixture data — no live API required
- 52 tests across 7 files (Bun test)
- Full TypeScript with strict mode

[Unreleased]: https://github.com/plexicus/cli/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/plexicus/cli/releases/tag/v0.1.0
