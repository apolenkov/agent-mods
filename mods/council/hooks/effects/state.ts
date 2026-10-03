import type { CouncilMember, CouncilMemberName } from "../../types/index.d.ts";
import type { Host } from "./host.ts";

const TAIL_CHARS = 2000;

/**
 * Changes one member's row of the current run.
 * @param host the engine
 * @param name the member
 * @param change what to set on its row
 * @returns once written
 */
export const setMember = (
  host: Host,
  name: CouncilMemberName,
  change: Partial<CouncilMember>,
): Promise<unknown> =>
  host.updateRun((run) => ({
    ...run,
    members: run.members.map((member) =>
      member.name === name ? { ...member, ...change } : member,
    ),
  }));

/**
 * Adds a piece of a member's output to its tail.
 * @param host the engine
 * @param name the member
 * @param text the piece
 * @returns once written
 */
export const appendTail = (
  host: Host,
  name: CouncilMemberName,
  text: string,
): Promise<unknown> =>
  host.updateRun((run) => ({
    ...run,
    members: run.members.map((member) =>
      member.name === name
        ? { ...member, tail: `${member.tail}${text}`.slice(-TAIL_CHARS) }
        : member,
    ),
  }));
