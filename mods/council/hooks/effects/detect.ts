import type { CouncilMember, CouncilMemberName } from "../../types/index.d.ts";
import type { CouncilConfig } from "../model/config.ts";
import { MEMBER_NAMES } from "../model/config.ts";
import { isMemberVersion, pickMembers } from "../model/detect.ts";
import { expandHome, limitedUntil, untilLabel } from "../model/limits.ts";
import type { Host } from "./host.ts";

const VERSION_TIMEOUT_MS = 10_000;

const isInstalled = async (
  host: Host,
  name: CouncilMemberName,
): Promise<boolean> => {
  try {
    const run = await host.run([name, "--version"], {
      timeoutMs: VERSION_TIMEOUT_MS,
    });
    return run.exitCode === 0 && isMemberVersion(name, run.stdout);
  } catch {
    // Not on PATH, or it did not answer in time.
    return false;
  }
};

const limitOf = async (
  host: Host,
  path: string,
  nowMs: number,
): Promise<number | undefined> => {
  try {
    return limitedUntil(await host.readFile(path), nowMs);
  } catch {
    // No limit file: the member is free.
    return undefined;
  }
};

const rowOf = (
  name: CouncilMemberName,
  until: number | undefined,
): CouncilMember => ({
  name,
  status: until === undefined ? "waiting" : "skipped",
  tail: "",
  findings: [],
  raw: "",
  ...(until !== undefined && { reason: untilLabel(until) }),
});

/**
 * Finds the members installed here (each by its `--version` signature),
 * picks the configured ones, and marks those whose limit file holds a
 * future reset as skipped.
 * @param host the engine
 * @param config the plugin's config
 * @returns a row per picked member, waiting or skipped
 */
export const detectMembers = async (
  host: Host,
  config: CouncilConfig,
): Promise<readonly CouncilMember[]> => {
  const found = await Promise.all(
    MEMBER_NAMES.map(async (name) =>
      (await isInstalled(host, name)) ? [name] : [],
    ),
  );
  const picked = pickMembers(found.flat(), config.members);
  const directory = expandHome(config.limitsDir, (await host.home()) ?? "~");
  const nowMs = await host.now();
  return Promise.all(
    picked.map(async (name) =>
      rowOf(name, await limitOf(host, `${directory}/${name}`, nowMs)),
    ),
  );
};
