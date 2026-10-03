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
import type { Host } from "./host.ts";

/** The model that writes the summary's prose. */
const CLAUDE_MODEL = "sonnet";
const MAX_TOKENS = 4096;
const MODEL_TIMEOUT_MS = 180_000;
const JEV_URL = "https://api.typesafe.ai/v1/systemone";

/** What a summarizer is handed beside the findings. */
export type SummarizeContext = Readonly<{
  question?: string;
  config: CouncilConfig;
}>;

const complete = async (
  host: Host,
  prompt: string,
): Promise<string | undefined> => {
  const reply = await host.complete({
    model: CLAUDE_MODEL,
    prompt,
    maxTokens: MAX_TOKENS,
    timeoutMs: MODEL_TIMEOUT_MS,
  });
  return reply.isAnswered ? reply.text : undefined;
};

const claudeSummary = async (
  host: Host,
  findings: readonly CouncilFinding[],
  question: string | undefined,
): Promise<CouncilSummary> => {
  const reply = await complete(host, claudePrompt(findings, question));
  return reply === undefined
    ? rawSummary(findings, "Claude did not answer; the findings as they came.")
    : (parseSummary(reply) ??
        rawSummary(
          findings,
          "Claude's summary was not JSON; the findings as they came.",
        ));
};

const askJev = async (
  host: Host,
  key: string,
  requests: readonly JevRequest[],
): Promise<JevAnswers> => {
  const replies = await Promise.all(
    requests.map((request) =>
      host.fetch(JEV_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
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
  { key, threshold }: Readonly<{ key: string; threshold: number }>,
): Promise<CouncilSummary> => {
  const model = (await host.typesafeModel()) ?? "jev-latest";
  const scored = await askJev(host, key, scoringRequests(findings, model));
  const groups = groupsOf(findings, clustersOf(findings.length, scored));
  const contra = await askJev(host, key, contradictionRequests(groups, model));
  const sorted = classify(groups, { ...scored, ...contra }, threshold);
  const prose = await complete(host, prosePrompt(sorted));
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

/**
 * Merges every member's findings into one summary: Claude by default; Jev
 * scoring with Claude's prose when configured and keyed, Claude again when
 * Jev fails. Runs from a `$.clock.after` callback: the time spent inside
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
  const key =
    context.config.summarizer === "jev"
      ? await keyOf(host, context.config)
      : "";
  if (key === "") {
    return claudeSummary(host, findings, context.question);
  }
  try {
    return await jevOnly(host, findings, {
      key,
      threshold: context.config.jevThreshold,
    });
  } catch (error) {
    const summary = await claudeSummary(host, findings, context.question);
    const why = error instanceof Error ? error.message : String(error);
    return {
      ...summary,
      notes: [
        ...summary.notes,
        `Jev unavailable (${why}); Claude merged alone.`,
      ],
    };
  }
};
