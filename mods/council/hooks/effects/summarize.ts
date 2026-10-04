import type { CouncilFinding, CouncilSummary } from "../../types/index.d.ts";
import type { CouncilConfig } from "../model/config.ts";
import {
  answersOf,
  clustersOf,
  contradictionRequests,
  groupsOf,
  type JevAnswers,
  type JevRequest,
  scoringRequests,
} from "../model/jev.ts";
import {
  classify,
  jevSummary,
  parseProse,
  prosePrompt,
} from "../model/jev-summary.ts";
import { claudePrompt, parseSummary, rawSummary } from "../model/summary.ts";
import { systemOneEndpoint } from "../model/system-one.ts";
import type { Host } from "./host.ts";

const MAX_TOKENS = 4096;
const MODEL_TIMEOUT_MS = 180_000;

/** What a summarizer is handed beside the findings. */
export type SummarizeContext = Readonly<{
  question?: string;
  config: CouncilConfig;
}>;

const complete = async (
  host: Host,
  prompt: string,
  model: string,
): Promise<string | undefined> => {
  try {
    const reply = await host.complete({
      model,
      prompt,
      maxTokens: MAX_TOKENS,
      timeoutMs: MODEL_TIMEOUT_MS,
    });
    return reply.isAnswered ? reply.text : undefined;
  } catch {
    // The engine refused to send it (a blocked model): no reply either.
    return undefined;
  }
};

const claudeSummary = async (
  host: Host,
  findings: readonly CouncilFinding[],
  context: SummarizeContext,
): Promise<CouncilSummary> => {
  const reply = await complete(
    host,
    claudePrompt(findings, context.question),
    context.config.summarizerModel,
  );
  return reply === undefined
    ? rawSummary(findings, "Claude did not answer; the findings as they came.")
    : (parseSummary(reply) ??
        rawSummary(
          findings,
          "Claude's summary was not JSON; the findings as they came.",
        ));
};

/** Where System One answers and with what key ("" for a loopback server). */
type Jev = Readonly<{ url: string; key: string; model: string }>;

const askJev = async (
  host: Host,
  jev: Jev,
  requests: readonly JevRequest[],
): Promise<JevAnswers> => {
  const replies = await Promise.all(
    requests.map((request) =>
      host.fetch(jev.url, {
        method: "POST",
        headers: {
          ...(jev.key !== "" && { Authorization: `Bearer ${jev.key}` }),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }),
    ),
  );
  const failed = replies.find((reply) => !reply.ok);
  if (failed !== undefined) {
    throw new Error(`Jev answered HTTP ${String(failed.status)}`);
  }
  return Object.assign(
    {},
    ...replies.map((reply) => answersOf(reply.text)),
  ) as JevAnswers;
};

const jevOnly = async (
  host: Host,
  findings: readonly CouncilFinding[],
  { jev, config }: Readonly<{ jev: Jev; config: CouncilConfig }>,
): Promise<CouncilSummary> => {
  const scored = await askJev(host, jev, scoringRequests(findings, jev.model));
  const groups = groupsOf(findings, clustersOf(findings.length, scored));
  const contra = await askJev(
    host,
    jev,
    contradictionRequests(groups, jev.model),
  );
  const sorted = classify(
    groups,
    { ...scored, ...contra },
    config.jevThreshold,
  );
  const prose = await complete(
    host,
    prosePrompt(sorted),
    config.summarizerModel,
  );
  const count =
    sorted.agreements.length +
    sorted.disagreements.length +
    sorted.unique.length;
  return jevSummary(sorted, parseProse(prose ?? "", count) ?? []);
};

const keyOf = async (host: Host, config: CouncilConfig): Promise<string> =>
  config.typesafeApiKey === ""
    ? ((await host.typesafeKey()) ?? "")
    : config.typesafeApiKey;

// The System One endpoint to ask, or why Claude merges alone.
const jevOf = async (
  host: Host,
  config: CouncilConfig,
): Promise<Jev | string> => {
  const endpoint = systemOneEndpoint(config.systemOneUrl);
  if ("error" in endpoint) {
    return `System One URL refused (${endpoint.error}); Claude merged alone.`;
  }
  const key = endpoint.isLoopback ? "" : await keyOf(host, config);
  const model =
    config.systemOneModel ||
    ((await host.typesafeModel()) ?? "") ||
    "jev-latest";
  return key === "" && !endpoint.isLoopback
    ? `jev needs a TypeSafe API key for ${new URL(endpoint.url).hostname}; Claude merged alone.`
    : { url: endpoint.url, key, model };
};

const withNote = (summary: CouncilSummary, note: string): CouncilSummary => ({
  ...summary,
  notes: [...summary.notes, note],
});

/**
 * Merges every member's findings into one summary: Claude by default; with
 * `jev`, System One (TypeSafe, or a local server on loopback) scores and
 * Claude writes the prose, Claude alone when System One is refused, unkeyed
 * or failing, saying why. Runs from a `$.clock.after` callback: time inside
 * `$` calls (the model, the network) never counts against a hook's budget.
 * @param host the engine
 * @param findings every member's findings
 * @param context the question and the config
 * @returns the summary
 */
export const summarize = async (
  host: Host,
  findings: readonly CouncilFinding[],
  context: SummarizeContext,
): Promise<CouncilSummary> => {
  if (findings.length === 0) {
    return {
      agreements: [],
      disagreements: [],
      unique: [],
      notes: ["No findings."],
    };
  }
  if (context.config.summarizer === "claude") {
    return claudeSummary(host, findings, context);
  }
  const jev = await jevOf(host, context.config);
  if (typeof jev === "string") {
    return withNote(await claudeSummary(host, findings, context), jev);
  }
  try {
    return await jevOnly(host, findings, { jev, config: context.config });
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    return withNote(
      await claudeSummary(host, findings, context),
      `Jev unavailable (${why}); Claude merged alone.`,
    );
  }
};
