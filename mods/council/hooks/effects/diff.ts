import {
  capDiff,
  isSentUntracked,
  untrackedSection,
} from "../model/diff-input.ts";
import type { Host } from "./host.ts";

/** The most of the diff the reviewers are handed. */
const MAX_DIFF = 200_000;
/** Untracked files larger than this are left out. */
const MAX_UNTRACKED = 65_536;
const HEX = 16;
const BYTE_DIGITS = 2;

const untrackedOf = async (
  host: Host,
  path: string,
  cwd: string,
): Promise<string> => {
  try {
    const stat = await host.stat(`${cwd}/${path}`);
    const text =
      stat.kind === "file" && stat.size <= MAX_UNTRACKED
        ? await host.readFile(`${cwd}/${path}`)
        : "";
    return text === "" || text.includes("\0")
      ? ""
      : untrackedSection(path, text);
  } catch {
    // Gone or unreadable since git listed it.
    return "";
  }
};

/**
 * The working diff the council reviews: `git diff HEAD`, then each
 * untracked file that is text, at most 64 KB and not named like a secret,
 * the whole cut at 200 KB.
 * @param host the engine
 * @returns the diff; "" outside a repository or with nothing changed
 */
export const workingDiff = async (host: Host): Promise<string> => {
  const tracked = await host.run(["git", "diff", "HEAD"]);
  const listed = await host.run([
    "git",
    "ls-files",
    "--others",
    "--exclude-standard",
  ]);
  const cwd = await host.cwd();
  const untracked = await Promise.all(
    listed.stdout
      .split("\n")
      .filter((path) => path !== "" && isSentUntracked(path))
      .map((path) => untrackedOf(host, path, cwd)),
  );
  return capDiff(
    [tracked.exitCode === 0 ? tracked.stdout : "", ...untracked].join(""),
    MAX_DIFF,
  );
};

/**
 * The diff's SHA-256, to tell whether it changed since the last review.
 * @param diff the diff
 * @returns the hash in hex
 */
export const hashOf = async (diff: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(diff),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(HEX).padStart(BYTE_DIGITS, "0"))
    .join("");
};
