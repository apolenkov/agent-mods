import { describe, expect, test } from "claude-code/testing";

import { commandOf, promptOf } from "../../hooks/model/members.ts";

const DIFF = "diff --git a/x b/x\n+1";

describe("members", () => {
  test("codex reviews the uncommitted tree, ephemeral", () => {
    expect(commandOf("codex", { diff: DIFF })).toEqual({
      argv: ["codex", "exec", "review", "--uncommitted", "--ephemeral"],
    });
  });

  test("codex with a question reads it, and the diff, from stdin", () => {
    const run = commandOf("codex", { diff: DIFF, question: "is it safe?" });

    expect(run.argv).toEqual(["codex", "exec", "review", "--ephemeral", "-"]);
    expect(run.stdin).toContain("is it safe?");
    expect(run.stdin).toContain(DIFF);
  });

  test("pi: print mode, no session kept, no tools at all", () => {
    const run = commandOf("pi", { diff: DIFF });

    expect(run.argv.slice(0, -1)).toEqual([
      "pi",
      "-p",
      "--no-session",
      "--no-tools",
    ]);
    expect(run.argv.at(-1)).toBe(promptOf({ diff: DIFF }));
  });

  test("devin: read-only auto-approval, always stated", () => {
    const run = commandOf("devin", { diff: DIFF });

    expect(run.argv.slice(0, -1)).toEqual([
      "devin",
      "--permission-mode",
      "auto",
      "--respect-workspace-trust",
      "false",
      "-p",
    ]);
  });

  test("ocr: JSON for agents; a question rides as background", () => {
    expect(commandOf("ocr", { diff: DIFF }).argv).toEqual([
      "ocr",
      "review",
      "--format",
      "json",
      "--audience",
      "agent",
    ]);
    expect(commandOf("ocr", { diff: DIFF, question: "why?" }).argv).toEqual([
      "ocr",
      "review",
      "--format",
      "json",
      "--audience",
      "agent",
      "--background",
      "why?",
    ]);
  });

  test("the prompt asks for JSON lines and carries question and diff", () => {
    const prompt = promptOf({ diff: DIFF, question: "races?" });

    expect(prompt).toContain('{"path"');
    expect(prompt).toContain("NO_FINDINGS");
    expect(prompt).toContain("races?");
    expect(prompt).toContain(DIFF);
  });
});
