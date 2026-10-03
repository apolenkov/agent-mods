import { describe, expect, test } from "claude-code/testing";

import { isMemberVersion, pickMembers } from "../../hooks/model/detect.ts";

describe("detect", () => {
  test("each member's --version must carry its signature", () => {
    expect(isMemberVersion("codex", "codex-cli 0.160.0\n")).toBe(true);
    expect(isMemberVersion("ocr", "open-code-review v1.12.11 (a758d9cb)")).toBe(
      true,
    );
    expect(isMemberVersion("devin", "devin 3000.11.3 (9c803229faa4)")).toBe(
      true,
    );
    expect(isMemberVersion("pi", "1.0.0\n")).toBe(true);
    expect(isMemberVersion("ocr", "tesseract 5.3.0")).toBe(false);
    expect(isMemberVersion("pi", "pi: command not found")).toBe(false);
  });

  test("no list: every installed member, in the default order", () => {
    expect(pickMembers(["ocr", "codex", "pi"], [])).toEqual([
      "codex",
      "pi",
      "ocr",
    ]);
  });

  test("a list picks and orders, installed ones only", () => {
    expect(
      pickMembers(["codex", "pi", "devin"], ["devin", "ocr", "codex"]),
    ).toEqual(["devin", "codex"]);
  });
});
