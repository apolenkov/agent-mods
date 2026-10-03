import { describe, expect, test } from "claude-code/testing";

import {
  answersOf,
  clustersOf,
  contradictionRequests,
  groupsOf,
  JEV_MAX_CHARS,
  JEV_MAX_QUESTIONS,
  scoringRequests,
} from "../../hooks/model/jev.ts";
import {
  classify,
  jevSummary,
  parseProse,
} from "../../hooks/model/jev-summary.ts";
import { FINDINGS } from "../fixtures/findings.ts";

const many = Array.from({ length: 12 }, (_, index) => ({
  ...FINDINGS[0],
  member: "codex" as const,
  title: `finding ${String(index)}`,
  detail: "x".repeat(500),
}));

describe("jev", () => {
  test("each finding gets a noise noul; each after the first a dedupe choice", () => {
    const [request] = scoringRequests(FINDINGS, "jev-latest");

    expect(request?.model).toBe("jev-latest");
    expect(Object.keys(request?.questions ?? {})).toEqual([
      "real_0",
      "real_1",
      "same_1",
      "real_2",
      "same_2",
    ]);
    expect(request?.questions["same_2"]).toMatchObject({
      type: "choice",
      criteria: {
        new: expect.any(String),
        "#0": "Cache never invalidated",
        "#1": "Stale cache",
      },
    });
  });

  test("requests hold at most 9 questions and 14k characters", () => {
    const requests = scoringRequests(many, "jev-latest");

    expect(requests.length).toBeGreaterThan(2);
    for (const request of requests) {
      expect(Object.keys(request.questions).length).toBeLessThanOrEqual(
        JEV_MAX_QUESTIONS,
      );
      expect(JSON.stringify(request).length).toBeLessThanOrEqual(JEV_MAX_CHARS);
    }
    expect(
      requests.flatMap((request) => Object.keys(request.questions)),
    ).toHaveLength(12 + 11);
  });

  test("answers are read off the response, foreign ones ignored", () => {
    expect(
      answersOf(
        JSON.stringify({
          model: "jev-1.13.0",
          answers: {
            real_0: { type: "noul", noul: 0.9 },
            same_1: { type: "choice", choice: "#0", confidence: 0.8 },
            odd: "text",
          },
        }),
      ),
    ).toEqual({ real_0: { noul: 0.9 }, same_1: { choice: "#0" } });
    expect(answersOf("<html>")).toEqual({});
  });

  test("same-as choices chain into clusters", () => {
    expect(
      clustersOf(4, {
        same_1: { choice: "#0" },
        same_2: { choice: "new" },
        same_3: { choice: "#1" },
      }),
    ).toEqual([0, 0, 2, 0]);
  });

  test("agreement, contradiction, unique and noise", () => {
    const groups = groupsOf(FINDINGS, [0, 0, 2]);
    const contra = contradictionRequests(groups, "jev-latest");

    expect(Object.keys(contra[0]?.questions ?? {})).toEqual(["contra_0"]);

    const agreed = classify(groups, { real_0: { noul: 0.9 } }, 0.3);
    expect(agreed.agreements).toEqual([groups[0]]);
    expect(agreed.unique).toEqual([groups[1]]);

    const split = classify(
      groups,
      { contra_0: { noul: 0.8 }, real_2: { noul: 0.1 } },
      0.3,
    );
    expect(split.disagreements).toEqual([groups[0]]);
    expect(split.noise).toEqual([groups[1]]);
  });

  test("Claude's prose is used when it has one text per group", () => {
    expect(parseProse('{"texts":["a","b"]}', 2)).toEqual(["a", "b"]);
    expect(parseProse('{"texts":["a"]}', 2)).toBeUndefined();
    expect(parseProse("nope", 1)).toBeUndefined();
  });

  test("the summary names members once per group, noise as notes", () => {
    const groups = groupsOf(FINDINGS, [0, 0, 2]);
    const summary = jevSummary(
      {
        agreements: groups.slice(0, 1),
        disagreements: [],
        unique: [],
        noise: groups.slice(1),
      },
      ["merged cache bug"],
    );

    expect(summary.agreements).toEqual([
      { members: ["codex", "pi"], text: "merged cache bug" },
    ]);
    expect(summary.notes[0]).toContain("Typo in log message");
  });
});
