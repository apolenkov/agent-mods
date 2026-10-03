import { describe, expect, test } from "claude-code/testing";

import { parseRun } from "../../hooks/model/parse.ts";
import { CODEX_REVIEW_STDOUT } from "../fixtures/codex-review-stdout.ts";
import { DEVIN_STDOUT } from "../fixtures/devin-stdout.ts";
import { OCR_REVIEW_JSON } from "../fixtures/ocr-review-json.ts";
import { PI_STDOUT } from "../fixtures/pi-stdout.ts";

const ok = (
  stdout: string,
): { stdout: string; stderr: string; exitCode: number } => ({
  stdout,
  stderr: "",
  exitCode: 0,
});
const CWD = "/work";

describe("parse", () => {
  test("codex: each finding of the block, paths made relative", () => {
    expect(parseRun("codex", ok(CODEX_REVIEW_STDOUT), CWD)).toEqual({
      findings: [
        {
          member: "codex",
          path: "src/cache.ts",
          line: 12,
          severity: "high",
          title: "Cache never invalidated",
          detail:
            "Entries are written on every miss and never dropped,\nso stale values are served after an update.",
        },
        {
          member: "codex",
          path: "src/log.ts",
          line: 3,
          severity: "low",
          title: "Typo in log message",
          detail: '"recieved" should be "received".',
        },
      ],
    });
  });

  test("codex: an explanation and no block is no finding", () => {
    expect(parseRun("codex", ok("Looks good to me."), CWD)).toEqual({
      findings: [],
    });
  });

  test("pi: JSON lines inside prose and a fence, the broken one skipped", () => {
    expect(parseRun("pi", ok(PI_STDOUT), CWD)).toEqual({
      findings: [
        {
          member: "pi",
          path: "src/cache.ts",
          line: 12,
          severity: "high",
          title: "Stale cache",
          detail: "Never invalidated.",
        },
        {
          member: "pi",
          path: "src/api.ts",
          line: 40,
          title: "Dropped promise",
          detail: "save() is not awaited.",
        },
      ],
    });
  });

  test("devin: prose alone is one finding holding the text", () => {
    expect(parseRun("devin", ok(DEVIN_STDOUT), CWD)).toEqual({
      findings: [
        {
          member: "devin",
          title: "devin: unstructured review",
          detail: DEVIN_STDOUT,
        },
      ],
    });
  });

  test("NO_FINDINGS and silence are no finding", () => {
    expect(parseRun("pi", ok("NO_FINDINGS\n"), CWD)).toEqual({
      findings: [],
    });
    expect(parseRun("devin", ok("  \n"), CWD)).toEqual({ findings: [] });
  });

  test("ocr: comments become findings, first line the title", () => {
    expect(parseRun("ocr", ok(OCR_REVIEW_JSON), CWD)).toEqual({
      findings: [
        {
          member: "ocr",
          path: "src/cache.ts",
          line: 12,
          title: "Cache entries are never invalidated after an update.",
          detail:
            "Cache entries are never invalidated after an update.\n\nSuggested:\ncache.delete(k)",
        },
        {
          member: "ocr",
          path: "src/api.ts",
          line: 40,
          title: "Missing await on save().",
          detail: "Missing await on save().\nThe promise is dropped.",
        },
      ],
    });
  });

  test("ocr: output that is not its JSON is an error", () => {
    expect(parseRun("ocr", ok("panic: boom"), CWD)).toEqual({
      error: "ocr: output is not OpenCodeReview JSON",
    });
  });

  test("a non-zero exit is an error naming the last stderr line", () => {
    expect(
      parseRun(
        "pi",
        { stdout: "", stderr: "x\nno api key\n", exitCode: 2 },
        CWD,
      ),
    ).toEqual({ error: "pi: exit 2: no api key" });
  });
});
