import type { CouncilMember, CouncilRun } from "../../types/index.d.ts";
import type { CouncilConfig } from "../model/config.ts";
import { findingsLabel } from "../model/format.ts";
import { itemCount } from "../model/summary.ts";
import { detectMembers } from "./detect.ts";
import { hashOf, workingDiff } from "./diff.ts";
import type { Host } from "./host.ts";
import { runMember } from "./run-member.ts";
import { summarize } from "./summarize.ts";

/** What started a run: the owner's question, and whether it was automatic. */
export type CouncilRequest = Readonly<{
  question?: string;
  isAuto: boolean;
  /** The diff, when the caller already read it. */
  diff?: string;
}>;

const MIN_MEMBERS = 2;

const isRunBusy = (run: CouncilRun): boolean =>
  run.phase === "running" || run.phase === "summarizing";

// Still this run, in this phase: a cancel (or a newer run) ends ours.
const isOurs = (
  run: CouncilRun,
  id: string,
  phase: CouncilRun["phase"],
): boolean => run.id === id && run.phase === phase;

/**
 * Cancels the running review: the run ends as cancelled, its members'
 * children are stopped by their runs (they watch the run), and no summary
 * is written.
 * @param host the engine
 * @returns whether a review was running
 */
export const didCancel = async (host: Host): Promise<boolean> => {
  const before = await host.readRun();
  if (!isRunBusy(before)) {
    return false;
  }
  await host.updateRun((run): CouncilRun =>
    run.id === before.id && isRunBusy(run)
      ? {
          ...run,
          phase: "done",
          note: "Cancelled.",
          members: run.members.map((member) =>
            member.status === "running" || member.status === "waiting"
              ? { ...member, status: "failed", reason: "cancelled" }
              : member,
          ),
        }
      : run,
  );
  host.status(undefined);
  return true;
};

/**
 * Takes the council for a run, unless one is under way (single flight for
 * the whole council): the check and the write are one conditional update,
 * so of two entry points racing, one wins.
 * @param host the engine
 * @param request the question and whether it is automatic
 * @returns whether this caller holds the council now
 */
export const canClaim = async (
  host: Host,
  request: CouncilRequest,
): Promise<boolean> => {
  const id = crypto.randomUUID();
  const startedAt = await host.now();
  const run = await host.updateRun((current): CouncilRun =>
    isRunBusy(current)
      ? current
      : {
          id,
          phase: "running",
          startedAt,
          isAuto: request.isAuto,
          members: [],
          ...(request.question !== undefined && {
            question: request.question,
          }),
        },
  );
  if (run.id === id) {
    host.status("reviewing…");
  }
  return run.id === id;
};

/**
 * Ends a run a reload cut short: the old environment's timers and children
 * are gone, so nothing will finish it.
 * @param host the engine
 * @returns once written
 */
export const interruptStale = async (host: Host): Promise<void> => {
  await host.updateRun((run): CouncilRun =>
    isRunBusy(run)
      ? {
          ...run,
          phase: "done",
          note: "interrupted (the plugin reloaded); /council runs it again.",
          members: run.members.map((member) =>
            member.status === "running" || member.status === "waiting"
              ? { ...member, status: "failed", reason: "interrupted" }
              : member,
          ),
        }
      : run,
  );
};

const finishWithNote = async (host: Host, note: string): Promise<void> => {
  await host.updateRun((run): CouncilRun => ({ ...run, phase: "done", note }));
  host.status(undefined);
  host.toast(note);
};

const tooFew = (members: readonly CouncilMember[]): string => {
  const ready = members.filter((member) => member.status === "waiting");
  const names = members.map((member) =>
    member.reason === undefined
      ? member.name
      : `${member.name} (${member.reason})`,
  );
  const list = names.length === 0 ? "none found" : names.join(", ");
  return `${String(ready.length)} reviewer(s) can run (${list}); the council needs ${String(MIN_MEMBERS)}. Nothing was run.`;
};

const hasReviewedWith = async (
  host: Host,
  config: CouncilConfig,
  input: Readonly<{ diff: string; question?: string }>,
): Promise<boolean> => {
  const members = await detectMembers(host, config);
  await host.updateRun((run): CouncilRun => ({ ...run, members }));
  const runnable = members.filter((member) => member.status === "waiting");
  if (runnable.length < MIN_MEMBERS) {
    await finishWithNote(host, tooFew(members));
    return false;
  }
  const { id = "" } = await host.readRun();
  await Promise.all(
    runnable.map(({ name }) =>
      runMember(host, { name, input, timeoutMs: config.timeoutMs, runId: id }),
    ),
  );
  return hasSummarized(host, config, { id, ...input });
};

// The summary of the run `id`, unless it was cancelled meanwhile.
const hasSummarized = async (
  host: Host,
  config: CouncilConfig,
  input: Readonly<{ id: string; question?: string }>,
): Promise<boolean> => {
  const { id } = input;
  const done = await host.updateRun((run): CouncilRun =>
    isOurs(run, id, "running") ? { ...run, phase: "summarizing" } : run,
  );
  if (!isOurs(done, id, "summarizing")) {
    return false;
  }
  const summary = await summarize(
    host,
    done.members.flatMap((member) => member.findings),
    {
      config,
      ...(input.question !== undefined && { question: input.question }),
    },
  );
  const ended = await host.updateRun((run): CouncilRun =>
    isOurs(run, id, "summarizing") ? { ...run, phase: "done", summary } : run,
  );
  if (ended.summary !== summary) {
    return false;
  }
  const count = itemCount(summary);
  host.status(findingsLabel(count));
  host.toast(`${findingsLabel(count)} — /council status`);
  return true;
};

/**
 * One run, after `canClaim`: the diff, the members, their reviews in
 * parallel, the summary. Called from a `$.clock.after` callback, never
 * awaited by a hook; the long `$` calls inside do not count against any
 * hook's budget.
 * @param host the engine
 * @param config the plugin's config
 * @param request the question and whether it is automatic
 * @returns once the run is done
 */
export const convene = async (
  host: Host,
  config: CouncilConfig,
  request: CouncilRequest,
): Promise<void> => {
  try {
    await reviewDiff(host, config, request);
  } catch (error) {
    // Never leave the council busy: a failed run is a finished one.
    const why = error instanceof Error ? error.message : String(error);
    await finishWithNote(host, `the run failed: ${why}`);
  }
};

const reviewDiff = async (
  host: Host,
  config: CouncilConfig,
  request: CouncilRequest,
): Promise<void> => {
  const diff = request.diff ?? (await workingDiff(host));
  if (diff.trim() === "") {
    await finishWithNote(host, "nothing to review: the working tree is clean.");
    return;
  }
  const hash = await hashOf(diff);
  const hasReviewed = await hasReviewedWith(host, config, {
    diff,
    ...(request.question !== undefined && { question: request.question }),
  });
  // Only a review that ran counts: a skipped one may run once members free up.
  if (hasReviewed) {
    await host.writeReviewed({ hash, at: await host.now() });
  }
};

/**
 * The auto-review, once the session has been idle: runs only when no
 * prompt came since it was scheduled, no run is under way, the cooldown
 * has passed and the diff changed since the last review.
 * @param host the engine
 * @param config the plugin's config
 * @param token the prompt count when it was scheduled
 * @returns once done or skipped
 */
export const autoReview = async (
  host: Host,
  config: CouncilConfig,
  token: number,
): Promise<void> => {
  const reviewed = await host.readReviewed();
  const now = await host.now();
  const isStale =
    (await host.readToken()) !== token ||
    isRunBusy(await host.readRun()) ||
    (reviewed.at > 0 && now - reviewed.at < config.cooldownMs);
  if (isStale) {
    return;
  }
  const diff = await workingDiff(host);
  const isWanted =
    diff.trim() !== "" &&
    (await hashOf(diff)) !== reviewed.hash &&
    // A prompt while the diff was read still cancels the run, and a
    // subagent started during the idle wait holds it back.
    (await host.readToken()) === token &&
    !(await host.isAgentRunning());
  if (isWanted && (await canClaim(host, { isAuto: true }))) {
    await convene(host, config, { isAuto: true, diff });
  }
};
