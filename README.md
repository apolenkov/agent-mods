# claude-mods

[![ci](https://github.com/apolenkov/claude-mods/actions/workflows/ci.yml/badge.svg)](https://github.com/apolenkov/claude-mods/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/apolenkov/claude-mods/badge)](https://scorecard.dev/viewer/?uri=github.com/apolenkov/claude-mods)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A showcase marketplace of mods for [Claude Code](https://claude.com/claude-code).
Each mod lives, is developed and is released in its own repository; this one
only lists them. They answer two questions every agentic session raises:

- **Is it still working?** — [shell-flow](https://github.com/apolenkov/claude-shell-flow) shows, without opening
  anything, that the session's shells and the agents you delegate to through the
  shell (Codex, Pi, Devin, OpenCodeReview) are moving: time ticking, output fresh,
  nothing failed.
- **Is it actually right?** — [council](https://github.com/apolenkov/claude-council) hands your working diff to
  every reviewer CLI you have installed, in parallel, and merges their findings
  into agreements, disagreements and unique findings.

```
shell-flow: ◐ codex · Review diff 2:13 · output 4s ago · › applying patch src/a.ts · +1 bg
```

The `/shell-flow` pane's layout (assembled from the pane the tests draw, not a
screenshot), with the status line under it:

```
╭──────────────────────────────────────────────────────────────╮
│ [ c clear ] [ q close ]                                      │
│ [ 1 ▸ ] ◐ 0:51 output 1s ago  Count steps  [ s stop ]        │
│       bg · main · for i in $(seq 40); do echo step $i; sle…  │
│       › step 26                                              │
│ [ 2 ▸ ] ✗ 0:03 exit 2  Fail on purpose                       │
│       main · sleep 3; exit 2                                 │
│ [ 3 ▸ ] ○ 0:00 denied  Show current directory and all files  │
│       agent a189ac45c45566717 · pwd; ls -la                  │
│       ○ Permission to use Bash has been denied.              │
│ 1–9 open · c clear · q close · Esc → prompt                  │
╰──────────────────────────────────────────────────────────────╯
  ⚠ shell-flow: ✗ Fail on purpose exit 2 · +1 bg
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

| Mod                                                          | What you get                                                                                                                      | Needs                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [shell-flow](https://github.com/apolenkov/claude-shell-flow) | Status line + `/shell-flow` pane: every Bash call, background task and runner run of the session, with liveness and a stop button | nothing else                                                               |
| [council](https://github.com/apolenkov/claude-council)       | `/council [question]`, `/council send`, an opt-in auto-review that only notifies                                                  | at least two of `codex`, `pi`, `devin`, `ocr`; Jev summary: a TypeSafe key |

Options are listed in each mod's README and appear in `/config`. Each mod's
repository is also a marketplace of its own:
`/plugin marketplace add apolenkov/claude-shell-flow` or
`apolenkov/claude-council`. Installs made from claude-mods keep working: the
plugin names are the same, only their source moved.

## Privacy

No telemetry. shell-flow makes no network calls. council sends your diff only to
the reviewer CLIs you installed (each to its own provider) and, if you choose the
Jev summarizer, the findings to TypeSafe (or to a local System One server such
as Kev on 127.0.0.1, which keeps them on your machine). Secret-like untracked files are never
read. Details in each mod's SECURITY.md.

## Development

Code, issues and releases: [claude-shell-flow](https://github.com/apolenkov/claude-shell-flow)
and [claude-council](https://github.com/apolenkov/claude-council) (their history
before the split started here). This repository checks only its listing:
`npm ci && npm run check` (prettier, `claude plugin validate --strict .`). See
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE).
