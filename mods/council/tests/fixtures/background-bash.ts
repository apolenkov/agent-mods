import type { SessionMessage } from "claude-code";

/**
 * An assistant row whose Bash call went to the background as `id`.
 * @param id the background task's id
 * @returns the row
 */
export const backgroundBash = (id: string): SessionMessage => ({
  role: "assistant",
  text: "",
  toolUses: [
    {
      tool_use_id: `toolu_${id}`,
      tool: "Bash",
      input: { command: "npm test", run_in_background: true },
      result: { backgroundTaskId: id, stdout: "", stderr: "" },
      text: `Command running in background with ID: ${id}.`,
    },
  ],
});
