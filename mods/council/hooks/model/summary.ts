import type {
  CouncilFinding,
  CouncilSummary,
  CouncilSummaryItem,
} from "../../types/index.d.ts";
import { fieldOf, parseJson } from "../json/parse-json.ts";

const MAX_DETAIL = 600;

/**
 * A value with text around it, or nothing when there is no value.
 * @param before the text before it
 * @param value the value, maybe absent or empty
 * @param after the text after it
 * @returns the joined text, or ""
 */
const around = (
  before: string,
  value: string | number | undefined,
  after: string,
): string =>
  value === undefined || value === ""
    ? ""
    : `${before}${String(value)}${after}`;

const SHAPE =
  '{"agreements":[{"members":["codex","pi"],"text":"..."}],"disagreements":[],"unique":[],"notes":["..."]}';

/**
 * Where a finding points, as `path:line`, or nothing.
 * @param finding the finding
 * @returns the location with a trailing space, or ""
 */
export const whereOf = (finding: CouncilFinding): string =>
  finding.path === undefined
    ? ""
    : `${finding.path}${around(":", finding.line, "")} `;

/**
 * The prompt that asks Claude to merge the findings into one summary.
 * @param findings every member's findings
 * @param question the owner's question, when there was one
 * @returns the prompt
 */
export const claudePrompt = (
  findings: readonly CouncilFinding[],
  question: string | undefined,
): string =>
  [
    "Independent code reviewers reviewed the same diff. Merge their findings.",
    "agreements: one issue raised by two or more members.",
    "disagreements: members contradict each other (say who holds what).",
    "unique: an issue only one member raised.",
    "notes: anything else worth one line (likely noise, missing context).",
    "Each item lists the members and one or two plain sentences, file:line first.",
    `Answer with JSON only, exactly this shape: ${SHAPE}`,
    question === undefined ? "" : `The owner asked: ${question}`,
    JSON.stringify(
      findings.map((finding) => ({
        ...finding,
        detail: finding.detail.slice(0, MAX_DETAIL),
      })),
    ),
  ].join("\n");

const isStringList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isItem = (value: unknown): value is CouncilSummaryItem =>
  isStringList(fieldOf(value, "members")) &&
  typeof fieldOf(value, "text") === "string";

const isItemList = (value: unknown): value is readonly CouncilSummaryItem[] =>
  Array.isArray(value) && value.every(isItem);

const emptyWhenAbsent = (value: unknown): readonly [] | undefined =>
  value === undefined ? [] : undefined;

// An absent section is empty; a malformed one fails the whole summary.
const itemsOf = (value: unknown): readonly CouncilSummaryItem[] | undefined =>
  isItemList(value) ? value : emptyWhenAbsent(value);

const SECTIONS = ["agreements", "disagreements", "unique", "notes"] as const;

const summaryOf = (value: unknown): CouncilSummary | undefined => {
  const agreements = itemsOf(fieldOf(value, "agreements"));
  const disagreements = itemsOf(fieldOf(value, "disagreements"));
  const unique = itemsOf(fieldOf(value, "unique"));
  const notes = fieldOf(value, "notes") ?? [];
  const hasSection = SECTIONS.some((key) => fieldOf(value, key) !== undefined);
  return hasSection &&
    agreements !== undefined &&
    disagreements !== undefined &&
    unique !== undefined &&
    isStringList(notes)
    ? { agreements, disagreements, unique, notes }
    : undefined;
};

/**
 * Reads Claude's reply: the JSON object in it, fenced or among prose.
 * @param reply the reply's text
 * @returns the summary, or undefined when the reply holds none
 */
export const parseSummary = (reply: string): CouncilSummary | undefined => {
  const json = reply.slice(reply.indexOf("{"), reply.lastIndexOf("}") + 1);
  return summaryOf(parseJson(json));
};

/**
 * One finding as a line of the summary.
 * @param finding the finding
 * @returns `path:line [severity] title — detail`
 */
export const lineOf = (finding: CouncilFinding): string =>
  [
    whereOf(finding),
    around("[", finding.severity, "] "),
    finding.title,
    around(" — ", finding.detail, ""),
  ].join("");

/**
 * The summary when no summarizer could merge: every finding as it came.
 * @param findings every member's findings
 * @param why why the summarizer's answer was not used
 * @returns each finding as a unique item, the reason as a note
 */
export const rawSummary = (
  findings: readonly CouncilFinding[],
  why: string,
): CouncilSummary => ({
  agreements: [],
  disagreements: [],
  unique: findings.map((finding) => ({
    members: [finding.member],
    text: lineOf(finding),
  })),
  notes: [why],
});

/**
 * How many points the summary makes.
 * @param summary the summary
 * @returns agreements, disagreements and unique findings together
 */
export const itemCount = (summary: CouncilSummary): number =>
  summary.agreements.length +
  summary.disagreements.length +
  summary.unique.length;

const section = (
  title: string,
  items: readonly CouncilSummaryItem[],
): readonly string[] =>
  items.length === 0
    ? []
    : [
        `## ${title}`,
        ...items.map((item) => `- (${item.members.join(", ")}) ${item.text}`),
        "",
      ];

/**
 * The summary as the prompt `/council send` submits.
 * @param summary the summary
 * @returns markdown for the model
 */
export const sendText = (summary: CouncilSummary): string =>
  [
    "Independent reviewers (the council) reviewed the working diff.",
    "Verify each point against the code before acting on it.",
    "",
    ...section("Agreements", summary.agreements),
    ...section("Disagreements", summary.disagreements),
    ...section("Unique findings", summary.unique),
    ...(summary.notes.length === 0
      ? []
      : ["## Notes", ...summary.notes.map((note) => `- ${note}`)]),
  ].join("\n");
