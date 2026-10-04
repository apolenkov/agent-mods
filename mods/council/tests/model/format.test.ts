import { describe, expect, test } from "claude-code/testing";

import {
  elapsedLabel,
  findingsLabel,
  memberLine,
  tailLines,
} from "../../hooks/model/format.ts";

describe("format", () => {
  test("elapsed reads m:ss", () => {
    expect(elapsedLabel(0)).toBe("0:00");
    expect(elapsedLabel(65_400)).toBe("1:05");
  });

  test("a member's line: glyph, name, status, time, outcome", () => {
    expect(
      memberLine(
        {
          name: "codex",
          status: "done",
          startedAt: 0,
          endedAt: 90_000,
          tail: "",
          raw: "",
          findings: [
            { member: "codex", title: "a", detail: "" },
            { member: "codex", title: "b", detail: "" },
          ],
        },
        100_000,
      ),
    ).toBe("● codex  done      1:30 2 findings");
    expect(
      memberLine(
        {
          name: "pi",
          status: "skipped",
          tail: "",
          raw: "",
          findings: [],
          reason: "limited until 07:05",
        },
        0,
      ),
    ).toBe("○ pi     skipped        limited until 07:05");
    expect(
      memberLine(
        {
          name: "ocr",
          status: "running",
          startedAt: 0,
          tail: "",
          raw: "",
          findings: [],
        },
        5000,
      ),
    ).toBe("◐ ocr    running   0:05");
  });

  test("one finding is singular", () => {
    expect(findingsLabel(1)).toBe("1 finding");
    expect(findingsLabel(0)).toBe("0 findings");
    expect(findingsLabel(3)).toBe("3 findings");
    expect(
      memberLine(
        {
          name: "pi",
          status: "done",
          startedAt: 0,
          endedAt: 1000,
          tail: "",
          raw: "",
          findings: [{ member: "pi", title: "a", detail: "" }],
        },
        1000,
      ),
    ).toBe("● pi     done      0:01 1 finding");
  });

  test("the tail is its last non-empty lines", () => {
    expect(tailLines("a\n\nb\nc\nd\n", 2)).toEqual(["c", "d"]);
  });
});
