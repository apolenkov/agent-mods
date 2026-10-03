import { describe, expect, test } from "claude-code/testing";

import { commandOf, promptOf } from "../../hooks/model/members.ts";

const DIFF = "diff --git a/x b/x\n+1";
const FILE = "/scratch/council-pi-1.md";

describe("members", () => {
  test("codex reviews the uncommitted tree, ephemeral", () => {
    expect(commandOf("codex", { diff: DIFF }, FILE)).toEqual({
      argv: ["codex", "exec", "review", "--uncommitted", "--ephemeral"],
    });
  });

  test("codex with a question reads it, and the diff, from stdin", () => {
    const run = commandOf(
      "codex",
      { diff: DIFF, question: "is it safe?" },
      FILE,
    );

    expect(run.argv).toEqual(["codex", "exec", "review", "--ephemeral", "-"]);
    expect(run.stdin).toContain("is it safe?");
    expect(run.stdin).toContain(DIFF);
  });

  test("pi: the prompt rides as an attached file, no tools", () => {
    const run = commandOf("pi", { diff: DIFF }, FILE);

    expect(run.argv).toEqual([
      "pi",
      "-p",
      "--no-session",
      "--no-tools",
      `@${FILE}`,
      "Review the diff in the attached file; its first lines say how to answer.",
    ]);
    expect(run.promptFile).toBe(promptOf({ diff: DIFF }));
  });

  test("devin: read-only auto-approval, always stated; a prompt file", () => {
    const run = commandOf("devin", { diff: DIFF }, FILE);

    expect(run.argv).toEqual([
      "devin",
      "--permission-mode",
      "auto",
      "--respect-workspace-trust",
      "false",
      "--prompt-file",
      FILE,
      "-p",
    ]);
    expect(run.promptFile).toBe(promptOf({ diff: DIFF }));
  });

  test("codex and ocr need no prompt file", () => {
    expect(commandOf("codex", { diff: DIFF }, FILE).promptFile).toBeUndefined();
    expect(commandOf("ocr", { diff: DIFF }, FILE).promptFile).toBeUndefined();
  });

  test("ocr: JSON for agents; a question rides as background", () => {
    expect(commandOf("ocr", { diff: DIFF }, FILE).argv).toEqual([
      "ocr",
      "review",
      "--format",
      "json",
      "--audience",
      "agent",
    ]);
    expect(
      commandOf("ocr", { diff: DIFF, question: "why?" }, FILE).argv,
    ).toEqual([
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
