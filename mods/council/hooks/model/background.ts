import { fieldOf } from "../json/parse-json.ts";

/** The part of a `$.session.messages()` row the check reads. */
export type TranscriptRow = Readonly<{
  role: string;
  text: string;
  toolUses: readonly Readonly<{ tool: string; result?: unknown }>[];
}>;

const NOTIFICATION = "<task-notification>";
const TASK_ID = /<task-id>([^<]+)<\/task-id>/gu;

const startedIn = (row: TranscriptRow): readonly string[] =>
  row.role === "assistant"
    ? row.toolUses.flatMap((use) => {
        const id = fieldOf(use.result, "backgroundTaskId");
        return use.tool === "Bash" && typeof id === "string" ? [id] : [];
      })
    : [];

const endedIn = (row: TranscriptRow): readonly string[] =>
  row.role === "user" && row.text.includes(NOTIFICATION)
    ? [...row.text.matchAll(TASK_ID)].flatMap((match) =>
        match[1] === undefined ? [] : [match[1]],
      )
    : [];

/**
 * The background Bash tasks still running: started by a Bash call that went
 * to the background (`result.backgroundTaskId`) and not yet ended by the
 * task-notification row the engine adds when one completes, fails or is
 * killed. No API lists them; the transcript does.
 * @param rows the session's messages, oldest first
 * @returns the running tasks' ids
 */
export const runningBackgroundTasks = (
  rows: readonly TranscriptRow[],
): readonly string[] => {
  const ended = new Set(rows.flatMap(endedIn));
  return rows.flatMap(startedIn).filter((id) => !ended.has(id));
};
