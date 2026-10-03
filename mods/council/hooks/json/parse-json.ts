/**
 * `JSON.parse` that answers `undefined` for text that is not JSON, so the
 * pure model (which may not `try`) can read member and model output.
 * @param text the text
 * @returns the value, or undefined
 */
export const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
};

/**
 * One field of a value that may be an object.
 * @param value anything
 * @param key the field's name
 * @returns the field's value, or undefined when value is no object
 */
export const fieldOf = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null
    ? (value as Readonly<Record<string, unknown>>)[key]
    : undefined;
