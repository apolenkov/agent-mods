import { describe, expect, test } from "claude-code/testing";

import { systemOneEndpoint } from "../../hooks/model/system-one.ts";

describe("system-one", () => {
  test("TypeSafe over https needs a key", () => {
    expect(systemOneEndpoint("https://api.typesafe.ai")).toEqual({
      url: "https://api.typesafe.ai/v1/systemone",
      isLoopback: false,
    });
  });

  test("a loopback server over http needs none, a trailing slash is dropped", () => {
    for (const base of [
      "http://127.0.0.1:8010",
      "http://localhost:8010/",
      "http://[::1]:8010",
    ]) {
      expect(systemOneEndpoint(base)).toMatchObject({ isLoopback: true });
    }
    expect(systemOneEndpoint("http://127.0.0.1:8010/")).toEqual({
      url: "http://127.0.0.1:8010/v1/systemone",
      isLoopback: true,
    });
  });

  test("http to another host, other schemes and garbage are refused", () => {
    // eslint-disable-next-line unicorn/prefer-https -- the refusal of plain http to a remote host is what is tested
    expect(systemOneEndpoint("http://example.com")).toEqual({
      error: "http is allowed only for 127.0.0.1, localhost or ::1",
    });
    expect(systemOneEndpoint("ftp://127.0.0.1")).toEqual({
      error: "only http(s) URLs are allowed",
    });
    expect(systemOneEndpoint("not a url")).toEqual({
      error: "not a URL",
    });
  });
});
