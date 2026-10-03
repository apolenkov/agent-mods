import { describe, expect, test } from "claude-code/testing";

import {
  expandHome,
  limitedUntil,
  untilLabel,
} from "../../hooks/model/limits.ts";

const NOW_MS = 1_800_000_000_000;

describe("limits", () => {
  test("a future epoch in seconds is a limit, in milliseconds", () => {
    expect(limitedUntil("1800003600\n", NOW_MS)).toBe(1_800_003_600_000);
  });

  test("a past epoch, garbage or nothing is no limit", () => {
    expect(limitedUntil("1799999999", NOW_MS)).toBeUndefined();
    expect(limitedUntil("soon", NOW_MS)).toBeUndefined();
    expect(limitedUntil("", NOW_MS)).toBeUndefined();
  });

  test("the label is the local HH:MM", () => {
    const at = new Date(2026, 9, 4, 7, 5).getTime();

    expect(untilLabel(at)).toBe("limited until 07:05");
  });

  test("~ is the home folder", () => {
    expect(expandHome("~/.local/state/x", "/Users/a")).toBe(
      "/Users/a/.local/state/x",
    );
    expect(expandHome("/etc/x", "/Users/a")).toBe("/etc/x");
  });
});
