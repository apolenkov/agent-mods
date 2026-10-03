import type { CouncilSummary } from "../../types/index.d.ts";

/** The summary FINDINGS should come to. */
export const SUMMARY: CouncilSummary = {
  agreements: [
    {
      members: ["codex", "pi"],
      text: "src/cache.ts:12 cache never invalidated",
    },
  ],
  disagreements: [],
  unique: [{ members: ["ocr"], text: "src/log.ts:3 typo in a log message" }],
  notes: [],
};
