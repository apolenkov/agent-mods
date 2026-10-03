/**
 * What `codex exec review --uncommitted` prints on stdout: the review's
 * explanation, then the findings block as codex-rs `review_format.rs`
 * renders it (`- <title> — <abs path>:<start>-<end>`, body indented).
 * Built from that formatter (codex-cli 0.160), not from a paid run.
 */
export const CODEX_REVIEW_STDOUT = `The change adds a cache but never invalidates it.

Full review comments:

- [P1] Cache never invalidated — /work/src/cache.ts:12-14
  Entries are written on every miss and never dropped,
  so stale values are served after an update.

- [P3] Typo in log message — /work/src/log.ts:3-3
  "recieved" should be "received".
`;
