# claude-mods

[![ci](https://github.com/apolenkov/claude-mods/actions/workflows/ci.yml/badge.svg)](https://github.com/apolenkov/claude-mods/actions/workflows/ci.yml)
[![codeql](https://github.com/apolenkov/claude-mods/actions/workflows/codeql.yml/badge.svg)](https://github.com/apolenkov/claude-mods/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/apolenkov/claude-mods/badge)](https://scorecard.dev/viewer/?uri=github.com/apolenkov/claude-mods)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Mods for [Claude Code](https://claude.com/claude-code) that answer two questions
every agentic session raises:

- **Is it still working?** — [shell-flow](mods/shell-flow) shows, without opening
  anything, that the session's shells and the agents you delegate to through the
  shell (Codex, Pi, Devin, OpenCodeReview) are moving: time ticking, output fresh,
  nothing failed.
- **Is it actually right?** — [council](mods/council) hands your working diff to
  every reviewer CLI you have installed, in parallel, and merges their findings
  into agreements, disagreements and unique findings.

```
shell: ◐ codex · Review diff 2:13 · output 4s ago · › applying patch src/a.ts · +1 bg
```

## Install

Mods are Claude Code plugins built on function hooks, an early-access API.
You need Claude Code **2.1.288+** and `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`
(in your shell, or under `env` in `~/.claude/settings.json`).

```
/plugin marketplace add apolenkov/claude-mods
/plugin install shell-flow@claude-mods
/plugin install council@claude-mods
```

| Mod                           | What you get                                                                                                                      | Needs                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [shell-flow](mods/shell-flow) | Status line + `/shell-flow` pane: every Bash call, background task and runner run of the session, with liveness and a stop button | nothing else                                                               |
| [council](mods/council)       | `/council [question]`, `/council send`, an opt-in auto-review that only notifies                                                  | at least two of `codex`, `pi`, `devin`, `ocr`; Jev summary: a TypeSafe key |

Options are listed in each mod's README and appear in `/config`.

## Privacy

No telemetry. shell-flow makes no network calls. council sends your diff only to
the reviewer CLIs you installed (each to its own provider) and, if you choose the
Jev summarizer, the findings to TypeSafe (or to a local System One server such
as Kev on 127.0.0.1, which keeps them on your machine). Secret-like untracked files are never
read. Details in [SECURITY.md](SECURITY.md).

## Development

```sh
npm ci && npm run check   # format, strict typecheck, lint (+ suppression guard), knip, ls-lint, validate, tests
claude --plugin-dir mods/shell-flow   # try a mod live
```

The bar: TypeScript at its strictest, no mutation, no `let`, no loops, a pure
`hooks/model/` under `eslint-plugin-functional`'s strict preset, every behaviour
tested through the engine with `claude plugin test`. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE). `types/claude-code.d.ts` is Anthropic's and excluded; see
[types/NOTICE.md](types/NOTICE.md).
