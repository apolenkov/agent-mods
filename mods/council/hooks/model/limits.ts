const SECOND_MS = 1000;
const PAD = 2;

/**
 * Reads a limit file: an epoch in seconds when the member's limit resets.
 * @param text the file's content
 * @param nowMs the time now, in milliseconds
 * @returns the reset in milliseconds while it is in the future, else undefined
 */
export const limitedUntil = (
  text: string,
  nowMs: number,
): number | undefined => {
  const epoch = Number(text.trim());
  return text.trim() !== "" &&
    Number.isFinite(epoch) &&
    epoch * SECOND_MS > nowMs
    ? epoch * SECOND_MS
    : undefined;
};

const twoDigits = (value: number): string => String(value).padStart(PAD, "0");

/**
 * What the pane says of a limited member.
 * @param untilMs when the limit resets, in milliseconds
 * @returns `limited until HH:MM`, local time
 */
export const untilLabel = (untilMs: number): string => {
  const at = new Date(untilMs);
  return `limited until ${twoDigits(at.getHours())}:${twoDigits(at.getMinutes())}`;
};

/**
 * Expands a leading `~/` to the home folder.
 * @param path the configured path
 * @param home the home folder
 * @returns the path with `~` expanded
 */
export const expandHome = (path: string, home: string): string =>
  path.startsWith("~/") ? `${home}${path.slice(1)}` : path;
