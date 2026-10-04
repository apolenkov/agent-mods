# agent-watch

[![ci](https://github.com/apolenkov/agent-watch/actions/workflows/ci.yml/badge.svg)](https://github.com/apolenkov/agent-watch/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/apolenkov/agent-watch/badge)](https://scorecard.dev/viewer/?uri=github.com/apolenkov/agent-watch)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Watch and check the agents your [Claude Code](https://claude.com/claude-code) session delegates to.
A showcase marketplace of mods.
Each mod lives, is developed and is released in its own repository; this one
only lists them. They answer two questions every agentic session raises:

- **Is it still working?** — [agent-shell-watch](https://github.com/apolenkov/agent-shell-watch) shows, without opening
  anything, that the session's shells and the agents you delegate to through the
  shell (Codex, Pi, Devin, OpenCodeReview) are moving: time ticking, output fresh,
  nothing failed.
- **Is it actually right?** — [agent-council](https://github.com/apolenkov/agent-council) hands your working diff to
  every reviewer CLI you have installed, in parallel, and merges their findings
  into agreements, disagreements and unique findings.

![agent-shell-watch: a background Codex review ticking with its current file, a failed typecheck, the status line](https://raw.githubusercontent.com/apolenkov/agent-shell-watch/main/demo/demo.gif)

## Install

Mods are Claude Code plugins built on function hooks. You need Claude Code
**2.1.287+**, where mods are on by default.

```
/plugin marketplace add apolenkov/agent-watch
/plugin install agent-shell-watch@agent-watch
/plugin install agent-council@agent-watch
```

| Mod                                                                 | What you get                                                                                                                       | Needs                                                                      |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [agent-shell-watch](https://github.com/apolenkov/agent-shell-watch) | Status line + `/shell-watch` pane: every Bash call, background task and runner run of the session, with liveness and a stop button | nothing else                                                               |
| [agent-council](https://github.com/apolenkov/agent-council)         | `/council [question]`, `/council send`, an opt-in auto-review that only notifies                                                   | at least two of `codex`, `pi`, `devin`, `ocr`; Jev summary: a TypeSafe key |

Options are listed in each mod's README and appear in `/config`. Each mod's
repository is also a marketplace of its own:
`/plugin marketplace add apolenkov/agent-shell-watch` or
`apolenkov/agent-council`. Renamed on 2026-10-04: the marketplace `claude-mods` is now
`agent-watch`, `shell-flow` is `agent-shell-watch` (command `/shell-watch`) and
`council` is `agent-council` (command still `/council`); reinstall under the new names.

## Privacy

No telemetry. agent-shell-watch makes no network calls. agent-council sends your diff only to
the reviewer CLIs you installed (each to its own provider) and, if you choose the
Jev summarizer, the findings to TypeSafe (or to a local System One server such
as Kev on 127.0.0.1, which keeps them on your machine). Secret-like untracked files are never
read. Details in each mod's SECURITY.md.

## Development

Code, issues and releases: [agent-shell-watch](https://github.com/apolenkov/agent-shell-watch)
and [agent-council](https://github.com/apolenkov/agent-council) (their history
before the split started here). This repository checks only its listing:
`npm ci && npm run check` (prettier, `claude plugin validate --strict .`). See
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE).
