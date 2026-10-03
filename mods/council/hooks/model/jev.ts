import type { CouncilFinding } from "../../types/index.d.ts";
import { fieldOf, parseJson } from "../json/parse-json.ts";
import { whereOf } from "./summary.ts";

/**
 * The owner's rule for one TypeSafe request (backlog doc-016), not an API
 * limit: at most 9 questions and 14k characters.
 */
export const JEV_MAX_QUESTIONS = 9;
/** See JEV_MAX_QUESTIONS. */
export const JEV_MAX_CHARS = 14_000;

/** Findings past this many skip Jev and stand alone. */
const MAX_SCORED = 20;
const MAX_DETAIL = 300;

/** One TypeSafe question, as docs.typesafe.ai/api.md spells it. */
type JevQuestion = Readonly<{
  type: "noul" | "choice";
  instructions: string;
  criteria?: Readonly<Record<string, string>>;
}>;

/** One POST to `https://api.typesafe.ai/v1/systemone`. */
export type JevRequest = Readonly<{
  model: string;
  state: unknown;
  questions: Readonly<Record<string, JevQuestion>>;
}>;

/** The part of an answer the council reads. */
type JevAnswer = Readonly<{ noul?: number; choice?: string }>;

/** Answers by question id. */
export type JevAnswers = Readonly<Record<string, JevAnswer>>;

/** A finding and its place in the list Jev was asked about. */
type JevItem = Readonly<{ index: number; finding: CouncilFinding }>;

/** Findings judged to be one issue. */
export type JevGroup = readonly JevItem[];

/** The groups sorted by what Jev made of them. */
export type JevSorted = Readonly<{
  agreements: readonly JevGroup[];
  disagreements: readonly JevGroup[];
  unique: readonly JevGroup[];
  noise: readonly JevGroup[];
}>;

type Asked = readonly (readonly [string, JevQuestion])[];

const stateOf = (findings: readonly CouncilFinding[]): unknown => ({
  findings: findings.map((finding, index) => ({
    id: `#${String(index)}`,
    member: finding.member,
    where: whereOf(finding).trim(),
    title: finding.title,
    detail: finding.detail.slice(0, MAX_DETAIL),
  })),
});

const criteriaOf = (
  earlier: readonly CouncilFinding[],
): Readonly<Record<string, string>> =>
  Object.fromEntries([
    ["new", "A different issue from every earlier finding"],
    ...earlier.map((finding, index): readonly [string, string] => [
      `#${String(index)}`,
      finding.title,
    ]),
  ]);

const questionsOf = (
  findings: readonly CouncilFinding[],
  index: number,
): Asked => [
  [
    `real_${String(index)}`,
    {
      type: "noul",
      instructions: `Is finding #${String(index)} a real defect in the reviewed change, not noise, style or a false alarm?`,
    },
  ],
  ...(index === 0
    ? []
    : ([
        [
          `same_${String(index)}`,
          {
            type: "choice",
            instructions: `Is finding #${String(index)} the same underlying issue as an earlier finding?`,
            criteria: criteriaOf(findings.slice(0, index)),
          },
        ],
      ] as const)),
];

const requestOf = (
  model: string,
  state: unknown,
  asked: Asked,
): JevRequest => ({
  model,
  state,
  questions: Object.fromEntries(asked),
});

const isFitting = (model: string, state: unknown, asked: Asked): boolean =>
  asked.length <= JEV_MAX_QUESTIONS &&
  JSON.stringify(requestOf(model, state, asked)).length <= JEV_MAX_CHARS;

const withNext = (
  done: readonly Asked[],
  next: readonly [string, JevQuestion],
  canHold: (asked: Asked) => boolean,
): readonly Asked[] => {
  const current = done.at(-1) ?? [];
  return current.length > 0 && canHold([...current, next])
    ? [...done.slice(0, -1), [...current, next]]
    : [...done, [next]];
};

// Packs questions greedily; one too big for any request still goes alone.
const pack = (
  rest: Asked,
  done: readonly Asked[],
  canHold: (asked: Asked) => boolean,
): readonly Asked[] => {
  const [next, ...others] = rest;
  return next === undefined
    ? done
    : pack(others, withNext(done, next, canHold), canHold);
};

const requestsOf = (
  model: string,
  state: unknown,
  asked: Asked,
): readonly JevRequest[] =>
  pack(asked, [], (batch) => isFitting(model, state, batch)).map((batch) =>
    requestOf(model, state, batch),
  );

/**
 * The first round: per finding, is it real (noul) and is it a finding
 * already seen (choice); only the first findings, see MAX_SCORED.
 * @param findings every member's findings
 * @param model the TypeSafe model
 * @returns the requests to send
 */
export const scoringRequests = (
  findings: readonly CouncilFinding[],
  model: string,
): readonly JevRequest[] => {
  const scored = findings.slice(0, MAX_SCORED);
  return requestsOf(
    model,
    stateOf(scored),
    scored.flatMap((_, index) => questionsOf(scored, index)),
  );
};

const answerOf = (value: unknown): JevAnswer => {
  const noul = fieldOf(value, "noul");
  const choice = fieldOf(value, "choice");
  return {
    ...(typeof noul === "number" && { noul }),
    ...(typeof choice === "string" && { choice }),
  };
};

/**
 * Reads the answers of one TypeSafe response.
 * @param text the response body
 * @returns the answers by question id; none when the body is not one
 */
export const answersOf = (text: string): JevAnswers => {
  const answers = fieldOf(parseJson(text), "answers");
  return Object.fromEntries(
    Object.entries(
      typeof answers === "object" && answers !== null ? answers : {},
    )
      .map(([id, value]) => [id, answerOf(value)] as const)
      .filter(([, answer]) => Object.keys(answer).length > 0),
  );
};

const rootOf = (
  index: number,
  roots: readonly number[],
  answers: JevAnswers,
): number =>
  roots[Number((answers[`same_${String(index)}`]?.choice ?? "").slice(1))] ??
  index;

const rootsFrom = (
  count: number,
  roots: readonly number[],
  answers: JevAnswers,
): readonly number[] =>
  roots.length === count
    ? roots
    : rootsFrom(
        count,
        [...roots, rootOf(roots.length, roots, answers)],
        answers,
      );

/**
 * Which cluster each finding falls in: "same as #k" joins #k's cluster.
 * @param count how many findings
 * @param answers the first round's answers
 * @returns per finding, the index of its cluster's first finding
 */
export const clustersOf = (
  count: number,
  answers: JevAnswers,
): readonly number[] => rootsFrom(count, [], answers);

/**
 * The findings grouped by cluster, in the order the clusters start.
 * @param findings every finding
 * @param clusters per finding, its cluster
 * @returns the groups
 */
export const groupsOf = (
  findings: readonly CouncilFinding[],
  clusters: readonly number[],
): readonly JevGroup[] =>
  [...new Set(clusters)].map((root) =>
    findings
      .map((finding, index) => ({ index, finding }))
      .filter(({ index }) => clusters[index] === root),
  );

/**
 * The distinct members of a group, in order.
 * @param group the group
 * @returns the members' names
 */
export const membersOf = (group: JevGroup): readonly string[] => [
  ...new Set(group.map((item) => item.finding.member)),
];

/**
 * The second round: does a group raised by several members contradict
 * itself.
 * @param groups the groups
 * @param model the TypeSafe model
 * @returns the requests to send
 */
export const contradictionRequests = (
  groups: readonly JevGroup[],
  model: string,
): readonly JevRequest[] =>
  requestsOf(
    model,
    {
      groups: groups.map((group) =>
        group.map(({ finding }) => `${finding.member}: ${finding.title}`),
      ),
    },
    groups.flatMap((group, index): Asked =>
      membersOf(group).length > 1
        ? [
            [
              `contra_${String(index)}`,
              {
                type: "noul",
                instructions: `Do the findings of group ${String(index)} contradict each other: one calls something a defect or prescribes a fix that another rejects or reverses?`,
              },
            ],
          ]
        : [],
    ),
  );
