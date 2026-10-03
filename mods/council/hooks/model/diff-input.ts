/** Untracked files whose names look like secrets: never read, never sent. */
const SECRET_NAME =
  /(?:^|\/)\.env(?:\.[^/]*)?$|\.(?:pem|key)$|secret|credential/iu;

/**
 * Whether an untracked file may be read and sent to the reviewers.
 * @param path the file, relative to the repository
 * @returns false for names that look like secrets
 */
export const isSentUntracked = (path: string): boolean =>
  !SECRET_NAME.test(path);

/**
 * An untracked file as a diff section, so reviewers see it as new.
 * @param path the file, relative to the repository
 * @param content its text
 * @returns the section
 */
export const untrackedSection = (path: string, content: string): string =>
  [
    `diff --git a/${path} b/${path}`,
    "new file (untracked)",
    "--- /dev/null",
    `+++ b/${path}`,
    ...content
      .replace(/\n$/u, "")
      .split("\n")
      .map((line) => `+${line}`),
    "",
  ].join("\n");

/**
 * Cuts the diff at the cap, saying so at the cut.
 * @param diff the whole diff
 * @param cap the most characters kept
 * @returns the diff, or its head and a note
 */
export const capDiff = (diff: string, cap: number): string =>
  diff.length > cap
    ? `${diff.slice(0, cap)}\n[council: diff cut at ${String(cap)} bytes of ${String(diff.length)}]\n`
    : diff;
