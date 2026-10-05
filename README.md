<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banner-dark.svg">
  <img alt="agent-mods: watch and check the agents your Claude Code session delegates to" src=".github/assets/banner-light.svg" width="100%">
</picture>

[![ci](https://github.com/apolenkov/agent-mods/actions/workflows/ci.yml/badge.svg)](https://github.com/apolenkov/agent-mods/actions/workflows/ci.yml)
[![codeql](https://github.com/apolenkov/agent-mods/actions/workflows/codeql.yml/badge.svg)](https://github.com/apolenkov/agent-mods/actions/workflows/codeql.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code ≥ 2.1.287](https://img.shields.io/badge/Claude%20Code-%E2%89%A5%202.1.287-1C60A3)](https://claude.com/claude-code)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/apolenkov/agent-mods/badge)](https://scorecard.dev/viewer/?uri=github.com/apolenkov/agent-mods)

A showcase marketplace of [Claude Code](https://claude.com/claude-code) mods
that watch and check the agents your session delegates to. Each mod lives, is
developed and is released in its own repository; this one only lists them.

<table>
<tr>
<td width="25%" valign="top">

### [agent-shell-watch](https://github.com/apolenkov/agent-shell-watch)

**Is it still working?** Status line and `/shell-watch` pane: every Bash
call, background task and runner run (Codex, Pi, Devin, OpenCodeReview), with
liveness and a stop button.

</td>
<td width="25%" valign="top">

### [agent-council](https://github.com/apolenkov/agent-council)

**Is it actually right?** `/council` hands your working diff to every
reviewer CLI you have installed, in parallel, and merges their findings into
agreements, disagreements and unique findings.

</td>
<td width="25%" valign="top">

### [agent-compact-advisor](https://github.com/apolenkov/agent-compact-advisor)

**Is it time to compact?** A status-line score for `/compact` with reasons, a
ready `/compact` suggestion (Tab), and a template that keeps goals, decisions
and leftovers through every compaction.

</td>
<td width="25%" valign="top">

### [agent-autopilot](https://github.com/apolenkov/agent-autopilot)

**Who picks the option?** Answers a poll for you only when the assistant marked
one option (Recommended) and nothing looks irreversible; by default it only
stars the option. A journal and a limit of five keep it checkable.

</td>
</tr>
</table>

![agent-shell-watch: a background Codex review ticking with its current file, a failed typecheck, the status line](https://raw.githubusercontent.com/apolenkov/agent-shell-watch/main/demo/demo.gif)

<sub>agent-shell-watch in action.</sub>

## Demos

Every mod records its own demo; these are those recordings.

![agent-council: four reviewer CLIs running in parallel, their findings merged into agreements, disagreements and unique findings](https://raw.githubusercontent.com/apolenkov/agent-council/main/demo/demo.gif)

<sub>agent-council: `/council` on a working diff.</sub>

![agent-compact-advisor: the status line scoring the session for /compact, the reasons behind the score and the suggested command](https://raw.githubusercontent.com/apolenkov/agent-compact-advisor/main/demo/demo.gif)

<sub>agent-compact-advisor: the score, the reasons and the ready `/compact`.</sub>

![agent-autopilot: a poll with one option marked Recommended, the mod starring it and the journal line it writes](https://raw.githubusercontent.com/apolenkov/agent-autopilot/main/demo/demo.gif)

<sub>agent-autopilot: a poll answered, and the journal line it leaves.</sub>

## Install

Mods are Claude Code plugins built on function hooks. You need Claude Code
**2.1.287+**, where mods are on by default.

```
/plugin marketplace add apolenkov/agent-mods
/plugin install agent-shell-watch@agent-mods
/plugin install agent-council@agent-mods
/plugin install agent-compact-advisor@agent-mods
/plugin install agent-autopilot@agent-mods
```

| Mod                                                                         | Needs                                                                                 |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [agent-shell-watch](https://github.com/apolenkov/agent-shell-watch)         | nothing else                                                                          |
| [agent-council](https://github.com/apolenkov/agent-council)                 | at least two of `codex`, `pi`, `devin`, `ocr`; Jev summary: a TypeSafe key            |
| [agent-compact-advisor](https://github.com/apolenkov/agent-compact-advisor) | nothing else; optional local Kev on 127.0.0.1 for the "task done" signal              |
| [agent-autopilot](https://github.com/apolenkov/agent-autopilot)             | nothing else; no network, no model; interactive sessions only (no `-p`, no subagents) |

Options are listed in each mod's README and appear in `/config`. Each mod's
repository is also a marketplace of its own, e.g.
`/plugin marketplace add apolenkov/agent-shell-watch`.

> [!NOTE]
> **Renamed.** The marketplace `claude-mods` became `agent-watch` on
> 2026-10-04 and `agent-mods` on 2026-10-05 (the old name was easy to confuse
> with the agent-shell-watch mod); `shell-flow` is `agent-shell-watch` (command
> `/shell-watch`) and `council` is `agent-council` (command still `/council`).
> Reinstall under the new names: `/plugin marketplace add apolenkov/agent-mods`,
> install the mods `@agent-mods`, then uninstall the `@agent-watch` ones and
> `/plugin marketplace remove agent-watch`.

## Privacy

No telemetry. agent-shell-watch makes no network calls. agent-council sends
your diff only to the reviewer CLIs you installed (each to its own provider)
and, if you choose the Jev summarizer, the findings to TypeSafe (or to a local
System One server such as Kev on 127.0.0.1, which keeps them on your
machine); secret-like untracked files are never read. agent-compact-advisor
talks only to a loopback Kev. Details in each mod's SECURITY.md.

## Development

Code, issues and releases: [agent-shell-watch](https://github.com/apolenkov/agent-shell-watch),
[agent-council](https://github.com/apolenkov/agent-council) (their history
before the split started here),
[agent-compact-advisor](https://github.com/apolenkov/agent-compact-advisor) and
[agent-autopilot](https://github.com/apolenkov/agent-autopilot).
This repository checks only its listing: `npm ci && npm run check` (prettier,
`claude plugin validate --strict .`). See [CONTRIBUTING.md](CONTRIBUTING.md)
and [SUPPORT.md](SUPPORT.md).

## License

[MIT](LICENSE).
