import type { CouncilMember, CouncilMemberName } from "../../types/index.d.ts";
import type { Host } from "./host.ts";

const TAIL_CHARS = 2000;

/** One member's row in one run: a row of a cancelled or newer run is left. */
export type MemberRow = Readonly<{ name: CouncilMemberName; runId: string }>;

const changeRow = (
  host: Host,
  row: MemberRow,
  change: (member: CouncilMember) => CouncilMember,
): Promise<unknown> =>
  host.updateRun((run) =>
    run.id === row.runId && run.phase === "running"
      ? {
          ...run,
          members: run.members.map((member) =>
            member.name === row.name ? change(member) : member,
          ),
        }
      : run,
  );

/**
 * Changes one member's row of its run, while that run still runs.
 * @param host the engine
 * @param row the member and its run
 * @param change what to set on its row
 * @returns once written
 */
export const setMember = (
  host: Host,
  row: MemberRow,
  change: Partial<CouncilMember>,
): Promise<unknown> =>
  changeRow(host, row, (member) => ({ ...member, ...change }));

/**
 * Adds a piece of a member's output to its tail.
 * @param host the engine
 * @param row the member and its run
 * @param text the piece
 * @returns once written
 */
export const appendTail = (
  host: Host,
  row: MemberRow,
  text: string,
): Promise<unknown> =>
  changeRow(host, row, (member) => ({
    ...member,
    tail: `${member.tail}${text}`.slice(-TAIL_CHARS),
  }));
