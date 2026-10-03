import type { CommandRunInput } from "claude-code";

/**
 * `/council` as the person types it, with what follows it.
 * @param args the text after the command
 * @returns the command's run input
 */
export const councilCommand = (args = ""): CommandRunInput => ({
  command: "council",
  args,
  origin: { kind: "composer" },
  presentation: { isFullscreen: true, columns: 160 },
});
