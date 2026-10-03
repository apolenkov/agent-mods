/**
 * What `ocr review --format json --audience agent` prints on stdout, after
 * the example in OpenCodeReview's CLI reference (v1.12.11,
 * pages/src/content/docs/en/cli-reference.md); not from a paid run.
 */
export const OCR_REVIEW_JSON = JSON.stringify({
  status: "success",
  llm: { provider: "anthropic", model: "claude-opus-4-6" },
  summary: { files_reviewed: 2, comments: 2, elapsed: "1m12s" },
  comments: [
    {
      path: "src/cache.ts",
      content: "Cache entries are never invalidated after an update.",
      start_line: 12,
      end_line: 14,
      existing_code: "cache.set(k, v)",
      suggestion_code: "cache.delete(k)",
      thinking: "Looking at line 12…",
    },
    {
      path: "src/api.ts",
      content: "Missing await on save().\nThe promise is dropped.",
      start_line: 40,
      end_line: 40,
    },
  ],
});
