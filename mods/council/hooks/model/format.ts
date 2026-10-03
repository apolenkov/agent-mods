import type {
  CouncilMember,
  CouncilMemberStatus,
} from "../../types/index.d.ts";

const SECOND_MS = 1000;
const MINUTE_S = 60;
const PAD = 2;
const NAME_WIDTH = 6;
const STATUS_WIDTH = 8;
const TIME_WIDTH = 5;

const GLYPHS: Readonly<Record<CouncilMemberStatus, string>> = {
  waiting: "·",
  running: "◐",
  done: "●",
  skipped: "○",
  failed: "✗",
};

/**
 * A duration as `m:ss`.
 * @param ms the duration, in milliseconds
 * @returns the label
 */
export const elapsedLabel = (ms: number): string => {
  const seconds = Math.floor(ms / SECOND_MS);
  return `${String(Math.floor(seconds / MINUTE_S))}:${String(seconds % MINUTE_S).padStart(PAD, "0")}`;
};

const timeOf = (member: CouncilMember, nowMs: number): string =>
  member.startedAt === undefined
    ? ""
    : elapsedLabel((member.endedAt ?? nowMs) - member.startedAt);

const outcomeOf = (member: CouncilMember): string =>
  member.status === "done"
    ? `${String(member.findings.length)} findings`
    : (member.reason ?? "");

/**
 * One member's row in the pane.
 * @param member the member
 * @param nowMs the time now, for a running member's elapsed time
 * @returns `glyph name status m:ss outcome`, trailing space trimmed
 */
export const memberLine = (member: CouncilMember, nowMs: number): string =>
  [
    GLYPHS[member.status],
    member.name.padEnd(NAME_WIDTH),
    member.status.padEnd(STATUS_WIDTH),
    timeOf(member, nowMs).padStart(TIME_WIDTH),
    outcomeOf(member),
  ]
    .join(" ")
    .trimEnd();

/**
 * The last non-empty lines of a member's output.
 * @param tail the output's tail
 * @param count how many lines
 * @returns the lines, oldest first
 */
export const tailLines = (tail: string, count: number): readonly string[] =>
  tail
    .split("\n")
    .filter((line) => line.trim() !== "")
    .slice(-count);
