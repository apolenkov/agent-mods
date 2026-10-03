import type { CouncilSummary } from "../../types/index.d.ts";
import { fieldOf, parseJson } from "../json/parse-json.ts";
import {
  type JevAnswers,
  type JevGroup,
  type JevSorted,
  membersOf,
} from "./jev.ts";
import { lineOf } from "./summary.ts";

const CONTRADICTS = 0.5;

const isNoise = (
  group: JevGroup,
  answers: JevAnswers,
  threshold: number,
): boolean =>
  group.every(
    ({ index }) => (answers[`real_${String(index)}`]?.noul ?? 1) < threshold,
  );

const isContradicted = (index: number, answers: JevAnswers): boolean =>
  (answers[`contra_${String(index)}`]?.noul ?? 0) >= CONTRADICTS;

/**
 * Sorts the groups: noise (every finding below the threshold), a
 * contradiction, an agreement of several members, or one member alone.
 * @param groups the groups
 * @param answers both rounds' answers
 * @param threshold the probability of being real below which is noise
 * @returns the groups by kind
 */
export const classify = (
  groups: readonly JevGroup[],
  answers: JevAnswers,
  threshold: number,
): JevSorted => {
  const kept = groups.filter((group) => !isNoise(group, answers, threshold));
  const shared = kept.filter((group) => membersOf(group).length > 1);
  const split = shared.filter((group) =>
    isContradicted(groups.indexOf(group), answers),
  );
  return {
    agreements: shared.filter((group) => !split.includes(group)),
    disagreements: split,
    unique: kept.filter((group) => membersOf(group).length === 1),
    noise: groups.filter((group) => isNoise(group, answers, threshold)),
  };
};

const ordered = (sorted: JevSorted): readonly JevGroup[] => [
  ...sorted.agreements,
  ...sorted.disagreements,
  ...sorted.unique,
];

/**
 * Asks Claude for one line of prose per group, the grouping already done.
 * @param sorted the sorted groups
 * @returns the prompt
 */
export const prosePrompt = (sorted: JevSorted): string =>
  [
    "Each group below holds code review findings judged to be one issue.",
    "Write one or two plain sentences per group, file:line first; for a",
    "group marked contradicted, say who holds what.",
    'Answer with JSON only: {"texts":["...", ...]}, one text per group, in order.',
    JSON.stringify(
      ordered(sorted).map((group) => ({
        contradicted: sorted.disagreements.includes(group),
        findings: group.map(({ finding }) => finding),
      })),
    ),
  ].join("\n");

/**
 * Reads Claude's prose: one text per group, or nothing usable.
 * @param reply the reply's text
 * @param count how many groups were asked about
 * @returns the texts, or undefined
 */
export const parseProse = (
  reply: string,
  count: number,
): readonly string[] | undefined => {
  const json = reply.slice(reply.indexOf("{"), reply.lastIndexOf("}") + 1);
  const texts = fieldOf(parseJson(json), "texts");
  return Array.isArray(texts) &&
    texts.length === count &&
    texts.every((text) => typeof text === "string")
    ? texts
    : undefined;
};

const itemsOf = (
  groups: readonly JevGroup[],
  texts: readonly string[],
  offset: number,
): CouncilSummary["unique"] =>
  groups.map((group, index) => ({
    members: membersOf(group),
    text:
      texts[offset + index] ??
      lineOf(
        (group[0] ?? { finding: { member: "codex", title: "", detail: "" } })
          .finding,
      ),
  }));

/**
 * The summary from Jev's sorting and Claude's prose (or the findings'
 * own lines where there is no prose).
 * @param sorted the sorted groups
 * @param texts Claude's texts, in prosePrompt's order; may be empty
 * @returns the summary, noise as notes
 */
export const jevSummary = (
  sorted: JevSorted,
  texts: readonly string[],
): CouncilSummary => ({
  agreements: itemsOf(sorted.agreements, texts, 0),
  disagreements: itemsOf(sorted.disagreements, texts, sorted.agreements.length),
  unique: itemsOf(
    sorted.unique,
    texts,
    sorted.agreements.length + sorted.disagreements.length,
  ),
  notes: sorted.noise.flatMap((group) =>
    group.map(
      ({ finding }) =>
        `likely noise (Jev): ${finding.member}: ${lineOf(finding)}`,
    ),
  ),
});
