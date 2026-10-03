import type { Args, On } from "claude-code";
import { mock, type MockClock } from "claude-code/testing";

import type { CouncilMemberName } from "../../types/index.d.ts";

const VERSIONS: Readonly<Record<CouncilMemberName, string>> = {
  codex: "codex-cli 0.160.0\n",
  pi: "1.0.0\n",
  devin: "devin 3000.11.3 (9c803229faa4)\n",
  ocr: "open-code-review v1.12.11 (a758d9cb) darwin/arm64\n",
};

interface Kept {
  runs: Args<"process.run">[];
  spawns: Args<"process.spawn">[];
  prompts: string[];
  submitted: string[];
  fetches: { url: string; body: string; auth: string }[];
  toasts: string[];
  statuses: (string | undefined)[];
  opened: number;
  written: { path: string; text: string }[];
  removed: string[];
}

interface Output {
  stdout: string;
  stderr?: string;
  code?: number;
  hangs?: true;
  /** The child cannot start: the stream's first pull rejects with this. */
  startError?: string;
}

/**
 * The world beneath the council, answered from a script: which members
 * are installed, their limit files, the diff, each member's output, the
 * model's replies and TypeSafe's; everything the plugin did is kept.
 * @param on the test's `on`
 * @param script what the world answers
 * @returns the kept calls and the mocked clock
 */
export function councilWorld(
  on: On,
  script: {
    installed?: readonly CouncilMemberName[];
    limits?: Record<string, string>;
    diff?: string;
    untracked?: Record<string, string>;
    outputs?: Partial<Record<CouncilMemberName, Output>>;
    replies?: string[];
    jev?: (body: string) => { status: number; text: string };
    env?: Record<string, string>;
  } = {},
): { kept: Kept; clock: MockClock } {
  const kept: Kept = {
    runs: [],
    spawns: [],
    prompts: [],
    submitted: [],
    fetches: [],
    toasts: [],
    statuses: [],
    opened: 0,
    written: [],
    removed: [],
  };
  const installed = script.installed ?? ["codex", "pi", "ocr"];
  const replies = [...(script.replies ?? [])];
  const clock = mock.clock(on, { now: 1_800_000_000_000 });

  mock.env(on, { HOME: "/home/me", TMPDIR: "/scratch/me/", ...script.env });
  on("fs.write", (_engine, e) => {
    kept.written.push({ path: e.path, text: e.text });
    return { value: undefined };
  });
  mock.store(on);
  on("session.start", (_engine, e) => ({ cwd: e.cwd }));
  on("command.register", (_engine, e) => ({ value: { command: e.name } }));
  on("session.cwd", () => ({ value: "/work" }));
  on("ui.open", () => {
    kept.opened += 1;
    return { value: { isPlaced: true } };
  });
  on("ui.close", () => ({ value: undefined }));
  on("ui.invalidate", () => ({ value: undefined }));
  on("ui.toast", (_engine, e) => {
    kept.toasts.push(e.text);
    return { value: undefined };
  });
  on("ui.status", (_engine, e) => {
    kept.statuses.push(e.text);
    return { value: undefined };
  });
  on("prompt.submit", (_engine, e) => {
    kept.submitted.push(e.text);
    return { text: e.text };
  });
  on("process.run", (_engine, e) => {
    kept.runs.push(e);
    const [bin, word] = e.argv;
    if (bin === "rm") {
      kept.removed.push(e.argv.at(-1) ?? "");
    }
    if (word === "--version") {
      if (!installed.includes(bin as CouncilMemberName)) {
        throw new Error(`${String(bin)}: not found`);
      }
      return {
        value: {
          exitCode: 0,
          stdout: VERSIONS[bin as CouncilMemberName],
          stderr: "",
          isStdoutTruncated: false,
          isStderrTruncated: false,
        },
      };
    }
    const stdout =
      word === "diff"
        ? (script.diff ?? "diff --git a/x b/x\n+changed\n")
        : Object.keys(script.untracked ?? {}).join("\n");
    return {
      value: {
        exitCode: 0,
        stdout,
        stderr: "",
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    };
  });
  on("fs.read", (_engine, e) => {
    const limit = /executor-limits\/(\w+)$/u.exec(e.path)?.[1];
    const text =
      limit === undefined
        ? script.untracked?.[e.path.replace("/work/", "")]
        : script.limits?.[limit];
    if (text === undefined) {
      throw new Error(`ENOENT: ${e.path}`);
    }
    return { value: text };
  });
  on("fs.stat", (_engine, e) => ({
    value: {
      kind: "file",
      size: (script.untracked?.[e.path.replace("/work/", "")] ?? "").length,
      mtimeMs: 0,
      isLink: false,
    },
  }));
  on("process.spawn", async function* (_engine, e) {
    kept.spawns.push(e);
    const output = script.outputs?.[e.argv[0] as CouncilMemberName] ?? {
      stdout: "NO_FINDINGS\n",
    };
    if (output.startError !== undefined) {
      throw new Error(output.startError);
    }
    if (output.hangs === true) {
      await clock.sleep(3_600_000);
    }
    if (output.stdout !== "") {
      yield { stream: "stdout" as const, text: output.stdout };
    }
    if (output.stderr !== undefined) {
      yield { stream: "stderr" as const, text: output.stderr };
    }
    return { value: { code: output.code ?? 0, signal: null } };
  });
  on("model.complete", (_engine, e) => {
    kept.prompts.push(e.prompt);
    const text = replies.shift();
    return {
      value:
        text === undefined
          ? {
              isAnswered: false as const,
              reason: "empty-reply" as const,
              usage: {
                input_tokens: 0,
                output_tokens: 0,
                cache_read_input_tokens: 0,
                cache_creation_input_tokens: 0,
              },
            }
          : {
              isAnswered: true as const,
              text,
              usage: {
                input_tokens: 1,
                output_tokens: 1,
                cache_read_input_tokens: 0,
                cache_creation_input_tokens: 0,
              },
            },
    };
  });
  on("http.fetch", (_engine, e) => {
    const body = e.init?.body ?? "";
    kept.fetches.push({
      url: e.url,
      body,
      auth: e.init?.headers?.["Authorization"] ?? "",
    });
    const reply = script.jev?.(body) ?? { status: 500, text: "" };
    return {
      value: {
        status: reply.status,
        ok: reply.status < 300,
        headers: {},
        text: reply.text,
      },
    };
  });

  return { kept, clock };
}
