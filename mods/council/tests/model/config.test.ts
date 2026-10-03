import { describe, expect, test } from "claude-code/testing";

import { configOf } from "../../hooks/model/config.ts";

describe("config", () => {
  test("defaults fill what is unset", () => {
    expect(configOf({})).toEqual({
      members: [],
      limitsDir: "~/.local/state/executor-limits",
      timeoutMs: 480_000,
      summarizer: "claude",
      jevThreshold: 0.3,
      typesafeApiKey: "",
      autoReview: "off",
      cooldownMs: 600_000,
    });
  });

  test("members: a comma list, unknown names dropped, order kept", () => {
    expect(configOf({ members: " ocr, codex ,nope,pi" }).members).toEqual([
      "ocr",
      "codex",
      "pi",
    ]);
  });

  test("timeout is held under process.run's ten minutes", () => {
    expect(configOf({ timeoutMin: 60 }).timeoutMs).toBe(570_000);
    expect(configOf({ timeoutMin: 2, cooldownMin: 1 })).toMatchObject({
      timeoutMs: 120_000,
      cooldownMs: 60_000,
    });
  });

  test("pickers outside their options fall back", () => {
    expect(configOf({ summarizer: "gpt", autoReview: "loud" })).toMatchObject({
      summarizer: "claude",
      autoReview: "off",
    });
    expect(configOf({ summarizer: "jev", autoReview: "notify" })).toMatchObject(
      {
        summarizer: "jev",
        autoReview: "notify",
      },
    );
  });
});
