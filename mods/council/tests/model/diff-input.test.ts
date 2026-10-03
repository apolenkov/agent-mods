import { describe, expect, test } from "claude-code/testing";

import {
  capDiff,
  isSentUntracked,
  untrackedSection,
} from "../../hooks/model/diff-input.ts";

describe("diff-input", () => {
  test("secret-looking names are never sent", () => {
    expect(isSentUntracked(".env")).toBe(false);
    expect(isSentUntracked("config/.env.local")).toBe(false);
    expect(isSentUntracked("certs/server.pem")).toBe(false);
    expect(isSentUntracked("id.key")).toBe(false);
    expect(isSentUntracked("src/client_secret.json")).toBe(false);
    expect(isSentUntracked("aws-Credentials.txt")).toBe(false);
    expect(isSentUntracked("src/new-file.ts")).toBe(true);
    expect(isSentUntracked("docs/keyboard.md")).toBe(true);
  });

  test("an untracked file reads as a new-file diff", () => {
    expect(untrackedSection("a.ts", "x\ny\n")).toBe(
      "diff --git a/a.ts b/a.ts\nnew file (untracked)\n--- /dev/null\n+++ b/a.ts\n+x\n+y\n",
    );
  });

  test("a diff over the cap is cut and says so", () => {
    expect(capDiff("abcdef", 4)).toBe(
      "abcd\n[council: diff cut at 4 bytes of 6]\n",
    );
    expect(capDiff("abc", 4)).toBe("abc");
  });
});
