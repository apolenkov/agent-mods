import type { CouncilFinding } from "../../types/index.d.ts";

/** Two members on one stale-cache bug, one alone on a typo. */
export const FINDINGS: readonly CouncilFinding[] = [
  {
    member: "codex",
    path: "src/cache.ts",
    line: 12,
    severity: "high",
    title: "Cache never invalidated",
    detail: "Stale values after an update.",
  },
  {
    member: "pi",
    path: "src/cache.ts",
    line: 12,
    severity: "high",
    title: "Stale cache",
    detail: "Never invalidated.",
  },
  {
    member: "ocr",
    path: "src/log.ts",
    line: 3,
    title: "Typo in log message",
    detail: "recieved",
  },
];
