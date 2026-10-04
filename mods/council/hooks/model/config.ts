import type { PluginOptions } from "claude-code";

import type { CouncilMemberName } from "../../types/index.d.ts";

/** Every reviewer the council can run, in its default order. */
export const MEMBER_NAMES: readonly CouncilMemberName[] = [
  "codex",
  "pi",
  "devin",
  "ocr",
];

const MINUTE_MS = 60_000;

/** `process.run` stops a child at ten minutes; leave room for the rest. */
const MAX_TIMEOUT_MS = 570_000;

const DEFAULTS = {
  limitsDir: "~/.local/state/executor-limits",
  timeoutMin: 8,
  jevThreshold: 0.3,
  cooldownMin: 10,
  summarizerModel: "sonnet",
  systemOneUrl: "https://api.typesafe.ai",
} as const;

/** The plugin's options, read and defaulted. */
export type CouncilConfig = Readonly<{
  members: readonly CouncilMemberName[];
  limitsDir: string;
  timeoutMs: number;
  summarizer: "claude" | "jev";
  /** The model that writes the summary (an alias or a full id). */
  summarizerModel: string;
  jevThreshold: number;
  typesafeApiKey: string;
  /** The System One API's base URL: TypeSafe's, or a local server's. */
  systemOneUrl: string;
  /** Its model; empty: TYPESAFE_MODEL, else jev-latest. */
  systemOneModel: string;
  autoReview: "notify" | "off";
  cooldownMs: number;
}>;

const isMemberName = (name: string): name is CouncilMemberName =>
  (MEMBER_NAMES as readonly string[]).includes(name);

const stringOf = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

const numberOf = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/**
 * Reads the comma list of members, keeping its order and known names.
 * @param list the option's text
 * @returns the names, possibly none
 */
const membersOf = (list: string): readonly CouncilMemberName[] =>
  list
    .split(",")
    .map((name) => name.trim())
    .filter(isMemberName);

/**
 * The options as the council uses them.
 * @param options the `userConfig` values the engine passes to `register`
 * @returns the config, every value defaulted
 */
export const configOf = (options: PluginOptions): CouncilConfig => ({
  members: membersOf(stringOf(options["members"], "")),
  limitsDir: stringOf(options["limitsDir"], DEFAULTS.limitsDir),
  timeoutMs: Math.min(
    MAX_TIMEOUT_MS,
    numberOf(options["timeoutMin"], DEFAULTS.timeoutMin) * MINUTE_MS,
  ),
  summarizer: options["summarizer"] === "jev" ? "jev" : "claude",
  summarizerModel:
    stringOf(options["summarizerModel"], "").trim() || DEFAULTS.summarizerModel,
  jevThreshold: numberOf(options["jevThreshold"], DEFAULTS.jevThreshold),
  typesafeApiKey: stringOf(options["typesafeApiKey"], ""),
  systemOneUrl:
    stringOf(options["systemOneUrl"], "").trim() || DEFAULTS.systemOneUrl,
  systemOneModel: stringOf(options["systemOneModel"], "").trim(),
  autoReview: options["autoReview"] === "notify" ? "notify" : "off",
  cooldownMs:
    numberOf(options["cooldownMin"], DEFAULTS.cooldownMin) * MINUTE_MS,
});
