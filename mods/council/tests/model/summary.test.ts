import { describe, expect, test } from "claude-code/testing";

import {
  claudePrompt,
  itemCount,
  parseSummary,
  rawSummary,
  sendText,
} from "../../hooks/model/summary.ts";
import { FINDINGS } from "../fixtures/findings.ts";
import { SUMMARY } from "../fixtures/summary.ts";

describe("summary", () => {
  test("the prompt carries every finding and the JSON shape asked", () => {
    const prompt = claudePrompt(FINDINGS, "is the cache safe?");

    expect(prompt).toContain('"agreements"');
    expect(prompt).toContain("Cache never invalidated");
    expect(prompt).toContain("Typo in log message");
    expect(prompt).toContain("is the cache safe?");
  });

  test("a reply in a fence, prose around it, parses", () => {
    const reply = `Sure.\n\`\`\`json\n${JSON.stringify(SUMMARY)}\n\`\`\`\nDone.`;

    expect(parseSummary(reply)).toEqual(SUMMARY);
  });

  test("a reply of the wrong shape or no JSON is undefined", () => {
    expect(parseSummary("no json here")).toBeUndefined();
    expect(parseSummary('{"agreements": "many"}')).toBeUndefined();
    expect(
      parseSummary('{"agreements":[{"members":"codex","text":"x"}]}'),
    ).toBeUndefined();
  });

  test("missing sections read as empty", () => {
    expect(parseSummary('{"unique":[{"members":["pi"],"text":"x"}]}')).toEqual({
      agreements: [],
      disagreements: [],
      unique: [{ members: ["pi"], text: "x" }],
      notes: [],
    });
  });

  test("the raw fallback lists each finding as unique, and says why", () => {
    const raw = rawSummary(FINDINGS, "summary reply was not JSON");

    expect(raw.unique).toHaveLength(3);
    expect(raw.unique[0]).toEqual({
      members: ["codex"],
      text: "src/cache.ts:12 [high] Cache never invalidated — Stale values after an update.",
    });
    expect(raw.notes).toEqual(["summary reply was not JSON"]);
  });

  test("items are counted across the three sections", () => {
    expect(itemCount(SUMMARY)).toBe(2);
  });

  test("the text sent to the model names sections and members", () => {
    const text = sendText(SUMMARY);

    expect(text).toContain("## Agreements");
    expect(text).toContain("- (codex, pi) src/cache.ts:12");
    expect(text).toContain("## Unique findings");
    expect(text).not.toContain("## Disagreements");
    expect(text).toContain("Verify");
  });
});
