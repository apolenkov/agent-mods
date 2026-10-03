/** A reviewer the council knows how to run. */
export type CouncilMemberName = "codex" | "pi" | "devin" | "ocr";

/** One finding of one reviewer. */
export type CouncilFinding = Readonly<{
  member: CouncilMemberName;
  path?: string;
  line?: number;
  severity?: string;
  title: string;
  detail: string;
}>;

/** Where one reviewer is in a run. */
export type CouncilMemberStatus =
  "waiting" | "running" | "done" | "skipped" | "failed";

/** One reviewer's row in a run. */
export type CouncilMember = Readonly<{
  name: CouncilMemberName;
  status: CouncilMemberStatus;
  startedAt?: number;
  endedAt?: number;
  /** The last of its output, for the pane. */
  tail: string;
  /** Why it was skipped or failed. */
  reason?: string;
  findings: readonly CouncilFinding[];
  /** Its whole output, the fallback when the summary cannot be parsed. */
  raw: string;
}>;

/** One merged point of the summary and who raised it. */
export type CouncilSummaryItem = Readonly<{
  members: readonly string[];
  text: string;
}>;

/** What the summarizer makes of every finding. */
export type CouncilSummary = Readonly<{
  agreements: readonly CouncilSummaryItem[];
  disagreements: readonly CouncilSummaryItem[];
  unique: readonly CouncilSummaryItem[];
  notes: readonly string[];
}>;

/** Where the council is. */
export type CouncilPhase = "idle" | "running" | "summarizing" | "done";

/** The last (or current) run of the council. */
export type CouncilRun = Readonly<{
  phase: CouncilPhase;
  startedAt?: number;
  question?: string;
  isAuto?: boolean;
  members: readonly CouncilMember[];
  summary?: CouncilSummary;
  /** A plain line instead of a run: too few members, nothing to review. */
  note?: string;
}>;

/** The diff the council last reviewed, for the auto-review. */
export type CouncilReviewed = Readonly<{ hash: string; at: number }>;

declare module "claude-code" {
  interface PluginState {
    council: { run: CouncilRun; reviewed: CouncilReviewed };
  }
}
