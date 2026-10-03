import type { CouncilFinding, CouncilMemberName } from "../../types/index.d.ts";
import { fieldOf, parseJson } from "../json/parse-json.ts";
import { NO_FINDINGS } from "./members.ts";

/** How a member's child ended. */
export type MemberOutput = Readonly<{
  stdout: string;
  stderr: string;
  exitCode: number;
}>;

/** A member's findings, or why there are none to read. */
export type ParseResult =
  | Readonly<{ findings: readonly CouncilFinding[] }>
  | Readonly<{ error: string }>;

const MAX_DETAIL = 4000;
const MAX_TITLE = 120;

/** `- [P1] Title — /abs/path:12-14`, as codex-rs review_format.rs draws it. */
const CODEX_HEAD = /^- (?:\[[ x]\] )?(.+) — (.+):(\d+)-\d+$/u;
const PRIORITY = /^\[P(\d)\]\s*/u;
const SEVERITY_OF_PRIORITY: Readonly<Record<string, string>> = {
  "0": "high",
  "1": "high",
  "2": "medium",
  "3": "low",
};

const optional = <K extends string, V>(
  key: K,
  value: V | undefined,
): Partial<Record<K, V>> =>
  value === undefined ? {} : ({ [key]: value } as Record<K, V>);

const INDENT = "  ";

const relativeOf = (path: string, cwd: string): string =>
  path.startsWith(`${cwd}/`) ? path.slice(cwd.length + 1) : path;

const codexFinding = (
  head: readonly string[],
  body: readonly string[],
  cwd: string,
): CouncilFinding => {
  const [, title = "", path = "", line = "0"] = head;
  return {
    member: "codex",
    path: relativeOf(path, cwd),
    line: Number(line),
    ...optional(
      "severity",
      SEVERITY_OF_PRIORITY[PRIORITY.exec(title)?.[1] ?? ""],
    ),
    title: title.replace(PRIORITY, ""),
    detail: body
      .filter((text) => text.startsWith(INDENT))
      .map((text) => text.slice(INDENT.length))
      .join("\n")
      .trim(),
  };
};

const codexBlock = (block: string, cwd: string): readonly CouncilFinding[] => {
  const [first = "", ...body] = block.split("\n");
  const head = CODEX_HEAD.exec(first);
  return head === null ? [] : [codexFinding(head, body, cwd)];
};

// Each finding starts a line with `- `; split before each one.
const codexFindings = (
  stdout: string,
  cwd: string,
): readonly CouncilFinding[] =>
  stdout.split(/\n(?=- )/u).flatMap((block) => codexBlock(block, cwd));

const textField = (value: unknown, key: string): string | undefined => {
  const field = fieldOf(value, key);
  return typeof field === "string" && field.trim() !== "" ? field : undefined;
};

const lineField = (value: unknown, key: string): number | undefined => {
  const line = Number(fieldOf(value, key));
  return Number.isSafeInteger(line) && line > 0 ? line : undefined;
};

const jsonLineFinding = (
  member: CouncilMemberName,
  value: unknown,
): readonly CouncilFinding[] => {
  const title = textField(value, "title");
  return title === undefined
    ? []
    : [
        {
          member,
          ...optional("path", textField(value, "path")),
          ...optional("line", lineField(value, "line")),
          ...optional("severity", textField(value, "severity")),
          title: title.slice(0, MAX_TITLE),
          detail: textField(value, "detail") ?? "",
        },
      ];
};

const unstructured = (
  member: CouncilMemberName,
  text: string,
): readonly CouncilFinding[] =>
  text === "" || text === NO_FINDINGS
    ? []
    : [
        {
          member,
          title: `${member}: unstructured review`,
          detail: text.slice(0, MAX_DETAIL),
        },
      ];

const promptedFindings = (
  member: CouncilMemberName,
  stdout: string,
): readonly CouncilFinding[] => {
  const findings = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{"))
    .flatMap((line) => jsonLineFinding(member, parseJson(line)));
  return findings.length > 0 ? findings : unstructured(member, stdout.trim());
};

const ocrFindings = (comments: readonly unknown[]): readonly CouncilFinding[] =>
  comments.flatMap((comment): readonly CouncilFinding[] => {
    const content = textField(comment, "content");
    const suggestion = textField(comment, "suggestion_code");
    return content === undefined
      ? []
      : [
          {
            member: "ocr",
            ...optional("path", textField(comment, "path")),
            ...optional("line", lineField(comment, "start_line")),
            title: (content.split("\n", 1)[0] ?? "").slice(0, MAX_TITLE),
            detail:
              suggestion === undefined
                ? content
                : `${content}\n\nSuggested:\n${suggestion}`,
          },
        ];
  });

const ocrResult = (stdout: string): ParseResult => {
  const comments = fieldOf(parseJson(stdout), "comments");
  return Array.isArray(comments)
    ? { findings: ocrFindings(comments) }
    : { error: "ocr: output is not OpenCodeReview JSON" };
};

const lastLineOf = (text: string): string =>
  text
    .split("\n")
    .map((line) => line.trim())
    .findLast((line) => line !== "") ?? "";

const failureOf = (name: CouncilMemberName, run: MemberOutput): string =>
  `${name}: exit ${String(run.exitCode)}: ${
    lastLineOf(run.stderr) || lastLineOf(run.stdout) || "no output"
  }`;

const findingsOf = (
  name: CouncilMemberName,
  run: MemberOutput,
  cwd: string,
): ParseResult =>
  name === "ocr"
    ? ocrResult(run.stdout)
    : {
        findings:
          name === "codex"
            ? codexFindings(run.stdout, cwd)
            : promptedFindings(name, run.stdout),
      };

/**
 * Reads one member's output into findings.
 * @param name the member
 * @param run its exit code and output
 * @param cwd the directory it ran in, to make absolute paths relative
 * @returns its findings, or why they cannot be read
 */
export const parseRun = (
  name: CouncilMemberName,
  run: MemberOutput,
  cwd: string,
): ParseResult =>
  run.exitCode === 0
    ? findingsOf(name, run, cwd)
    : { error: failureOf(name, run) };
