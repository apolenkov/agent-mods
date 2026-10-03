import type { CouncilMemberName } from "../../types/index.d.ts";

/** What the council reviews: the working diff and, maybe, a question. */
export type ReviewInput = Readonly<{ diff: string; question?: string }>;

/** How one member is started: its argv and, maybe, its standard input. */
export type MemberCommand = Readonly<{
  argv: readonly string[];
  stdin?: string;
  /** Text to write to the prompt file the argv names, before the start. */
  promptFile?: string;
}>;

/** What a reviewer without a review mode of its own must print. */
export const NO_FINDINGS = "NO_FINDINGS";

const FORMAT = [
  "You are one reviewer on a code review council. Review the diff below for",
  "real defects: bugs, security holes, data loss, broken contracts, missing",
  "tests for changed behaviour. Do not edit any file.",
  "Answer with one JSON object per line and nothing else:",
  '{"path":"<file>","line":<number>,"severity":"high|medium|low","title":"<one line>","detail":"<why, and the fix>"}',
  `If you find nothing, answer exactly: ${NO_FINDINGS}`,
].join("\n");

/**
 * The review prompt for a member that takes a prompt (Pi, Devin, and Codex
 * when asked a question).
 * @param input the diff and the owner's question
 * @returns the prompt text
 */
export const promptOf = (input: ReviewInput): string =>
  [
    FORMAT,
    input.question === undefined ? "" : `\nThe owner asks: ${input.question}`,
    `\n<diff>\n${input.diff}\n</diff>`,
  ].join("\n");

const codexOf = (input: ReviewInput): MemberCommand =>
  input.question === undefined
    ? { argv: ["codex", "exec", "review", "--uncommitted", "--ephemeral"] }
    : {
        argv: ["codex", "exec", "review", "--ephemeral", "-"],
        stdin: promptOf(input),
      };

const OCR = ["ocr", "review", "--format", "json", "--audience", "agent"];

type CommandOf = (input: ReviewInput, promptPath: string) => MemberCommand;

// Pi and Devin read the prompt from a file: a diff of 200 KB is past what
// one argument may hold on Linux (128 KB).
const COMMANDS: Readonly<Record<CouncilMemberName, CommandOf>> = {
  codex: codexOf,
  pi: (input, promptPath) => ({
    argv: [
      "pi",
      "-p",
      "--no-session",
      "--no-tools",
      `@${promptPath}`,
      "Review the diff in the attached file; its first lines say how to answer.",
    ],
    promptFile: promptOf(input),
  }),
  devin: (input, promptPath) => ({
    // Stated every time: a user's DEVIN_PERMISSION_MODE may say `dangerous`.
    argv: [
      "devin",
      "--permission-mode",
      "auto",
      "--respect-workspace-trust",
      "false",
      "--prompt-file",
      promptPath,
      "-p",
    ],
    promptFile: promptOf(input),
  }),
  ocr: (input) => ({
    argv:
      input.question === undefined
        ? OCR
        : [...OCR, "--background", input.question],
  }),
};

/**
 * How to start one member on the input.
 * @param name the member
 * @param input the diff and the owner's question
 * @param promptPath where a member that reads its prompt from a file finds it
 * @returns its argv, standard input and prompt file's text
 */
export const commandOf = (
  name: CouncilMemberName,
  input: ReviewInput,
  promptPath: string,
): MemberCommand => COMMANDS[name](input, promptPath);
