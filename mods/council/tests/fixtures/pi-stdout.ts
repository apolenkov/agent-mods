/**
 * A reviewer that was asked for JSON lines and wrapped them in prose and a
 * fence anyway, with one malformed line: the tolerant parser's case.
 */
export const PI_STDOUT = `Here is my review.

\`\`\`json
{"path":"src/cache.ts","line":12,"severity":"high","title":"Stale cache","detail":"Never invalidated."}
{"path":"src/api.ts","line":"40","title":"Dropped promise","detail":"save() is not awaited."}
{"path": broken
\`\`\`
`;
