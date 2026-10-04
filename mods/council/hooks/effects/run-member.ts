import type {
  HookStream,
  ProcessSpawnChunk,
  ProcessSpawnResult,
} from "claude-code";

import type { CouncilMemberName } from "../../types/index.d.ts";
import {
  commandOf,
  type MemberCommand,
  type ReviewInput,
} from "../model/members.ts";
import { type MemberOutput, parseRun } from "../model/parse.ts";
import type { Host } from "./host.ts";
import { appendTail, setMember } from "./state.ts";

const MAX_RAW = 20_000;
const MINUTE_MS = 60_000;

type Stream = HookStream<ProcessSpawnChunk, ProcessSpawnResult>;
type Collected = Readonly<{ stdout: string; stderr: string }>;

/** One member's run: who, on what, for how long. */
export type MemberJob = Readonly<{
  name: CouncilMemberName;
  input: ReviewInput;
  timeoutMs: number;
  /** The run it belongs to: once that run ends (a cancel), the child stops. */
  runId: string;
}>;

const withChunk = (
  got: Collected,
  chunk: Readonly<ProcessSpawnChunk>,
): Collected =>
  chunk.stream === "stdout"
    ? { ...got, stdout: got.stdout + chunk.text }
    : { ...got, stderr: got.stderr + chunk.text };

// Reads the child to its end, each piece onto the member's tail.
const pump = async (
  stream: Readonly<Stream>,
  got: Collected,
  onText: (text: string) => Promise<unknown>,
): Promise<MemberOutput> => {
  const step = await stream.next();
  if (step.done === true) {
    return { ...got, exitCode: step.value.code ?? 1 };
  }
  await onText(step.value.text);
  return pump(stream, withChunk(got, step.value), onText);
};

const timeoutOf = (
  host: Host,
  ms: number,
): Readonly<{ promise: Promise<"timeout">; cancel: () => void }> => {
  const fired = new AbortController();
  const timer = host.after(ms, () => {
    fired.abort();
  });
  return {
    promise: new Promise((resolve) => {
      fired.signal.addEventListener("abort", () => {
        resolve("timeout");
      });
    }),
    cancel: timer.cancel,
  };
};

const CANCEL_POLL_MS = 1000;

// Resolves once the run is no longer this one running: a cancel.
const cancelOf = (
  host: Host,
  runId: string,
): Readonly<{ promise: Promise<"cancelled">; cancel: () => void }> => {
  const fired = new AbortController();
  const timer = host.every(CANCEL_POLL_MS, () => {
    void host.readRun().then((run) => {
      if (run.id !== runId || run.phase !== "running") {
        fired.abort();
      }
    });
  });
  return {
    promise: new Promise((resolve) => {
      fired.signal.addEventListener("abort", () => {
        resolve("cancelled");
      });
    }),
    cancel: timer.cancel,
  };
};

const spawnOf = async (
  host: Host,
  { name, timeoutMs, runId }: MemberJob,
  command: MemberCommand,
): Promise<MemberOutput | "timeout" | "cancelled"> => {
  const stream = host.spawn({
    argv: command.argv,
    ...(command.stdin !== undefined && { input: command.stdin }),
  });
  const timeout = timeoutOf(host, timeoutMs);
  const cancelled = cancelOf(host, runId);
  const ended = await Promise.race([
    pump(stream, { stdout: "", stderr: "" }, (text) =>
      appendTail(host, { name, runId }, text),
    ),
    timeout.promise,
    cancelled.promise,
  ]);
  timeout.cancel();
  cancelled.cancel();
  if (typeof ended === "string") {
    // Leaving the stream kills the child; not awaited, as a pending read
    // would hold the return behind it.
    void stream.return(undefined as never);
  }
  return ended;
};

// A name of its own per run, in the user's temp folder.
const promptPathOf = async (
  host: Host,
  name: CouncilMemberName,
): Promise<string> => {
  const tmpdir = (await host.tmpdir()) ?? "/tmp";
  const folder = tmpdir.endsWith("/") ? tmpdir.slice(0, -1) : tmpdir;
  return `${folder}/council-${name}-${crypto.randomUUID()}.md`;
};

const failureOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const endedOf = async (
  host: Host,
  job: MemberJob,
): Promise<MemberOutput | string> => {
  const path = await promptPathOf(host, job.name);
  const command = commandOf(job.name, job.input, path);
  try {
    if (command.promptFile !== undefined) {
      await host.writeFile(path, command.promptFile);
    }
    const ended = await spawnOf(host, job, command);
    return ended === "timeout"
      ? `timed out after ${String(job.timeoutMs / MINUTE_MS)} min`
      : ended;
  } catch (error) {
    return `cannot start: ${failureOf(error)}`;
  } finally {
    if (command.promptFile !== undefined) {
      await host.removeFile(path);
    }
  }
};

/**
 * Runs one member on the input, streaming its output into its row, and
 * leaves the row done (with findings) or failed (with the reason).
 * @param host the engine
 * @param job the member, the input and the timeout
 * @returns once the row is final
 */
export const runMember = async (host: Host, job: MemberJob): Promise<void> => {
  const { name } = job;
  await setMember(host, job, {
    status: "running",
    startedAt: await host.now(),
  });
  const ended = await endedOf(host, job);
  const endedAt = await host.now();
  if (typeof ended === "string") {
    await setMember(host, job, { status: "failed", endedAt, reason: ended });
    return;
  }
  const parsed = parseRun(name, ended, await host.cwd());
  await setMember(host, job, {
    endedAt,
    raw: ended.stdout.slice(0, MAX_RAW),
    ...("error" in parsed
      ? { status: "failed", reason: parsed.error }
      : { status: "done", findings: parsed.findings }),
  });
};
