# council

A council of independent code reviewers for Claude Code. `/council` hands
your working diff to every reviewer CLI you have installed (Codex, Pi, Devin,
OpenCodeReview), runs them in parallel, and merges what they found into one
summary: where they **agree**, where they **disagree**, and what only one of
them saw. Nothing reaches the session's model until you send it.

```
┌ Council ─────────────────────────────────────────────────────────┐
│ Question: is the cache safe?                                     │
│ ● codex  done      3:12 2 findings                               │
│ ● pi     done      1:47 2 findings                               │
│ ◐ ocr    running   2:05                                          │
│     [ocr] reviewing src/cache.ts …                               │
│ ○ devin  skipped        limited until 18:40                      │
│                                                                  │
│ Agreements                                                       │
│ • (codex, pi) src/cache.ts:12 entries are never invalidated, so  │
│   stale values are served after an update.                       │
│ Unique findings                                                  │
│ • (codex) src/log.ts:3 typo in a log message.                    │
│ • (pi) src/api.ts:40 save() is not awaited.                      │
│                                                                  │
│ [ send to model ] [ rerun ] [ close ]                            │
└──────────────────────────────────────────────────────────────────┘
```

What `/council send` (or the pane's button) submits to the model:

```
Independent reviewers (the council) reviewed the working diff.
Verify each point against the code before acting on it.

## Agreements
- (codex, pi) src/cache.ts:12 entries are never invalidated …

## Unique findings
- (codex) src/log.ts:3 typo in a log message.
- (pi) src/api.ts:40 save() is not awaited.
```

## Install

```
/plugin marketplace add apolenkov/claude-mods
/plugin install council@claude-mods
```

Requires Claude Code 2.1.288 or later with function hooks enabled
(`CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`), and **at least two** of these CLIs
installed and signed in:

| Member | How it is run                                                                                 |
| ------ | --------------------------------------------------------------------------------------------- |
| codex  | `codex exec review --uncommitted --ephemeral` (a question: `codex exec review --ephemeral -`) |
| pi     | `pi -p --no-session --no-tools <prompt>`                                                      |
| devin  | `devin --permission-mode auto --respect-workspace-trust false -p <prompt>`                    |
| ocr    | `ocr review --format json --audience agent` (a question rides as `--background`)              |

A member counts as installed when `<bin> --version` prints its own signature
(`codex-cli …`, `open-code-review v…`, `devin …`, a bare version for pi), so
another tool that happens to be called `ocr` is not run. Pi and Devin get the
diff in their prompt and are asked for JSON lines; prose is kept as one
finding. Devin is always started with `--permission-mode auto` (read-only
tools), whatever `DEVIN_PERMISSION_MODE` says. Pi runs with no tools.

The OpenCodeReview adapter was built from its CLI reference (v1.12.11) and a
recorded example of its JSON, not from a live review; the Codex parser follows
the findings block that codex-rs prints. Neither has been checked against a
paid run yet.

## Commands

- `/council`: review the working diff (`git diff HEAD` plus untracked text
  files).
- `/council <question>`: the same, with your question for every reviewer.
- `/council send`: submit the last summary to the model.
- `/council status`: open the pane.

With fewer than two runnable members the council says so and runs nothing.
Only one run at a time.

## Auto-review

With `autoReview` set to `notify`, an answered turn of the main conversation
schedules a review once the session has been idle for 15 seconds (any new
prompt cancels it), when the diff changed since the last review and the
cooldown has passed. It never holds a turn, never opens the pane, and only
notifies: a toast and the status line `council: N findings`. Off by default,
because the members' CLIs may cost you money.

## Options

| Option            | Default                          | What it does                                                                |
| ----------------- | -------------------------------- | --------------------------------------------------------------------------- |
| `members`         | (empty: all installed)           | Comma list choosing and ordering members, e.g. `codex,ocr`.                 |
| `limitsDir`       | `~/.local/state/executor-limits` | A file `<dir>/<member>` holding a future epoch (seconds) skips that member. |
| `timeoutMin`      | `8`                              | A member running longer is stopped and marked failed.                       |
| `summarizer`      | `claude`                         | `claude`, or `jev` (TypeSafe scores, Claude writes).                        |
| `summarizerModel` | `sonnet`                         | The Claude model that writes the summary (an alias or a full id).           |
| `typesafeApiKey`  | (empty: `TYPESAFE_API_KEY`)      | Kept in secure storage. `TYPESAFE_MODEL` picks the model (`jev-latest`).    |
| `jevThreshold`    | `0.3`                            | Findings Jev rates less likely than this to be real go to notes.            |
| `autoReview`      | `off`                            | `notify` turns the auto-review on.                                          |
| `cooldownMin`     | `10`                             | The least time between two auto-reviews.                                    |

Limit files are only read, never written; a missing file means no limit.

### The summarizers

- **claude**: one `$.model.complete` on `summarizerModel` (Sonnet by default) merges every finding into
  agreements, disagreements, unique findings and notes. If its reply is not
  the asked JSON, every finding is listed as it came, with a note saying so.
- **jev**: TypeSafe's Jev decides, per finding, whether it is the same issue
  as an earlier one (a Choice), how likely it is a real defect (a Noul), and,
  per issue several members raised, whether they contradict each other.
  Requests hold at most 9 questions and 14,000 characters (the owner's
  calibration rule, not an API limit); at most 20
  findings are scored, the rest stand alone. Claude then writes one line per
  issue. If TypeSafe fails, Claude merges alone and a note says why.

## Privacy: what leaves your machine

- **To each member's own service**: the reviewers run as your user, with
  their own accounts. Pi and Devin receive the diff in their prompt: `git
diff HEAD` plus untracked text files of at most 64 KB, cut at 200 KB.
  Untracked files named like secrets (`.env*`, `*.pem`, `*.key`, anything
  with `secret` or `credential` in its name) are never read or sent. Codex
  (`--uncommitted`) and OpenCodeReview read the working tree **themselves**;
  that filter cannot apply to them, their own ignore rules do.
- **To Anthropic**, through the session's own client: the members' findings
  (paths, lines, titles, details) and your question, to write the summary.
- **To TypeSafe** (`api.typesafe.ai`), only with `summarizer: jev` and a key:
  each finding's member, location, title and up to 300 characters of detail.
- **To the session's model**: nothing, until you run `/council send` or press
  the pane's button.

No telemetry.
