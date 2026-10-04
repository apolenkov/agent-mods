/** Where a System One API answers, and whether it is this machine. */
export type SystemOneEndpoint =
  Readonly<{ url: string; isLoopback: boolean }> | Readonly<{ error: string }>;

const PATH = "/v1/systemone";
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

const endpointOf = (url: Readonly<URL>, base: string): SystemOneEndpoint => {
  const isLoopback = LOOPBACK.has(url.hostname);
  const isHttps = url.protocol === "https:";
  return isHttps || (url.protocol === "http:" && isLoopback)
    ? { url: `${base.replace(/\/$/u, "")}${PATH}`, isLoopback }
    : {
        error:
          url.protocol === "http:"
            ? "http is allowed only for 127.0.0.1, localhost or ::1"
            : "only http(s) URLs are allowed",
      };
};

/**
 * The System One endpoint of a configured base URL: TypeSafe's API, or a
 * local server speaking the same API (Kev on 127.0.0.1). Plain http is
 * allowed only to this machine, so findings never cross a network in clear.
 * @param base the configured base URL, `https://api.typesafe.ai` say
 * @returns the endpoint and whether it is loopback, or why it is refused
 */
export const systemOneEndpoint = (base: string): SystemOneEndpoint =>
  URL.canParse(base.trim())
    ? endpointOf(new URL(base.trim()), base.trim())
    : { error: "not a URL" };
