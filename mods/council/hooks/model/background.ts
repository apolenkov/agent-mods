import { fieldOf } from "../json/parse-json.ts";

/** The part of a `$.session.messages()` row the check reads. */
export type TranscriptRow = Readonly<{
  role: string;
  text: string;
  toolUses: readonly Readonly<{
    tool: string;
    input?: unknown;
    result?: unknown;
    isError?: true;
  }>[];
}>;

/** One notification block: its task id and how it ended, if it says. */
const NOTIFICATION =
  /<task-notification>[\s\S]*?<\/task-notification>|<task-notification>[\s\S]*$/gu;
const TASK_ID = /<task-id>([^<]+)<\/task-id>/u;
const TERMINAL = /<status>(?:completed|failed|killed|stopped)<\/status>/u;

const startedIn = (row: TranscriptRow): readonly string[] =>
  row.role === "assistant"
    ? row.toolUses.flatMap((use) => {
        const id = fieldOf(use.result, "backgroundTaskId");
        return use.tool === "Bash" && typeof id === "string" ? [id] : [];
      })
    : [];

// A notification ends a task only with a terminal status: one saying a
// command may be waiting for input carries the id, and the task runs on.
const notifiedIn = (row: TranscriptRow): readonly string[] =>
  row.role === "user"
    ? [...row.text.matchAll(NOTIFICATION)].flatMap(([block]) => {
        const id = TASK_ID.exec(block)?.[1];
        return id !== undefined && TERMINAL.test(block) ? [id] : [];
      })
    : [];

// A successful TaskStop ends its task; the engine adds no notification then.
const stoppedIn = (row: TranscriptRow): readonly string[] =>
  row.role === "assistant"
    ? row.toolUses.flatMap((use) => {
        const id =
          fieldOf(use.input, "task_id") ?? fieldOf(use.input, "shell_id");
        return use.tool === "TaskStop" &&
          use.isError !== true &&
          use.result !== undefined &&
          typeof id === "string"
          ? [id]
          : [];
      })
    : [];

/**
 * The background Bash tasks still running: started by a Bash call that went
 * to the background (`result.backgroundTaskId`) and not yet ended by a
 * task-notification with a terminal status or by a successful TaskStop. No
 * API lists them; the transcript does.
 * @param rows the session's messages, oldest first
 * @returns the running tasks' ids
 */
export const runningBackgroundTasks = (
  rows: readonly TranscriptRow[],
): readonly string[] => {
  const ended = new Set([
    ...rows.flatMap(notifiedIn),
    ...rows.flatMap(stoppedIn),
  ]);
  return rows.flatMap(startedIn).filter((id) => !ended.has(id));
};
