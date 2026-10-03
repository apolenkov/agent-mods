import { describe, expect, test } from "claude-code/testing";

import { CODEX_REVIEW_STDOUT } from "./fixtures/codex-review-stdout.ts";
import { councilCommand } from "./fixtures/council-command.ts";
import { councilWorld } from "./fixtures/council-world.ts";
import { OCR_REVIEW_JSON } from "./fixtures/ocr-review-json.ts";
import { PI_STDOUT } from "./fixtures/pi-stdout.ts";
import { SESSION } from "./fixtures/session.ts";
import { SUMMARY } from "./fixtures/summary.ts";

const byText = (a = "", b = ""): number => a.localeCompare(b);

const OUTPUTS = {
  codex: { stdout: CODEX_REVIEW_STDOUT },
  pi: { stdout: PI_STDOUT },
  ocr: { stdout: OCR_REVIEW_JSON },
};

describe("register", () => {
  test("/council runs every installed member and summarizes", async ($, on) => {
    const world = councilWorld(on, {
      outputs: OUTPUTS,
      replies: [JSON.stringify(SUMMARY)],
    });

    await $.session.start(SESSION);
    const ran = await $.command.run(councilCommand());

    expect(ran.text).toContain("reviewing the working diff");
    expect(world.kept.opened).toBe(1);
    expect(world.kept.spawns, "nothing runs inside the command").toEqual([]);

    await world.clock.settle();

    expect(
      world.kept.spawns.map((spawn) => spawn.argv[0]).toSorted(byText),
    ).toEqual(["codex", "ocr", "pi"]);
    expect(world.kept.spawns[0]?.argv).toEqual([
      "codex",
      "exec",
      "review",
      "--uncommitted",
      "--ephemeral",
    ]);
    expect(world.kept.prompts[0]).toContain("Cache never invalidated");
    expect(world.kept.prompts[0]).toContain("Stale cache");
    expect(world.kept.toasts.at(-1)).toBe(
      "council: 2 findings — /council status",
    );
    expect(world.kept.statuses.at(-1)).toBe("council: 2 findings");
    expect(world.kept.submitted, "nothing reaches the model unasked").toEqual(
      [],
    );
  });

  test("/council send submits the summary; before a run it says so", async ($, on) => {
    const world = councilWorld(on, {
      outputs: OUTPUTS,
      replies: [JSON.stringify(SUMMARY)],
    });

    await $.session.start(SESSION);
    const early = await $.command.run(councilCommand("send"));
    expect(early.text).toBe("No council summary to send yet.");

    await $.command.run(councilCommand());
    await world.clock.settle();
    await $.command.run(councilCommand("send"));
    await world.clock.settle();

    expect(world.kept.submitted).toHaveLength(1);
    expect(world.kept.submitted[0]).toContain("## Agreements");
    expect(world.kept.submitted[0]).toContain("(codex, pi)");
  });

  test("a question rides to every member", async ($, on) => {
    const world = councilWorld(on);

    await $.session.start(SESSION);
    await $.command.run(councilCommand("is the cache safe?"));
    await world.clock.settle();

    expect(world.kept.spawns[0]?.argv).toEqual([
      "codex",
      "exec",
      "review",
      "--ephemeral",
      "-",
    ]);
    expect(world.kept.spawns[0]?.input).toContain("is the cache safe?");
    expect(world.kept.written[0]?.text).toContain("is the cache safe?");
    expect(
      world.kept.spawns.find((spawn) => spawn.argv[0] === "ocr")?.argv,
    ).toContain("--background");
  });

  test("fewer than two runnable members: said plainly, nothing run", async ($, on) => {
    const world = councilWorld(on, {
      installed: ["codex", "pi"],
      limits: { pi: "1800003600" },
    });

    await $.session.start(SESSION);
    await $.command.run(councilCommand());
    await world.clock.settle();

    expect(world.kept.spawns).toEqual([]);
    expect(world.kept.toasts.at(-1)).toContain("1 reviewer(s) can run");
    expect(world.kept.toasts.at(-1)).toContain("pi (limited until");
  });

  test("a past limit, or none, leaves a member free", async ($, on) => {
    const world = councilWorld(on, {
      installed: ["codex", "pi"],
      limits: { pi: "1700000000" },
    });

    await $.session.start(SESSION);
    await $.command.run(councilCommand());
    await world.clock.settle();

    expect(
      world.kept.spawns.map((spawn) => spawn.argv[0]).toSorted(byText),
    ).toEqual(["codex", "pi"]);
  });

  test("a tool of the member's name that is not it is not run", async ($, on) => {
    const world = councilWorld(on, { installed: ["codex", "pi"] });

    on("process.run", { argv: ["ocr", "--version"] } as never, () => ({
      value: {
        exitCode: 0,
        stdout: "tesseract 5.3.0\n",
        stderr: "",
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }));

    await $.session.start(SESSION);
    await $.command.run(councilCommand());
    await world.clock.settle();

    expect(world.kept.spawns.map((spawn) => spawn.argv[0])).not.toContain(
      "ocr",
    );
  });

  test("a clean tree: nothing to review", async ($, on) => {
    const world = councilWorld(on, { diff: "" });

    await $.session.start(SESSION);
    await $.command.run(councilCommand());
    await world.clock.settle();

    expect(world.kept.spawns).toEqual([]);
    expect(world.kept.toasts.at(-1)).toContain("nothing to review");
  });

  test("single flight: a second /council while one runs is refused", async ($, on) => {
    const world = councilWorld(on, {
      outputs: { codex: { stdout: "", hangs: true } },
    });

    await $.session.start(SESSION);
    await $.command.run(councilCommand());
    await world.clock.settle();

    const second = await $.command.run(councilCommand());
    expect(second.text).toContain("already reviewing");
  });

  test("untracked files: secrets never read, the rest sent", async ($, on) => {
    const world = councilWorld(on, {
      untracked: { ".env": "TOKEN=1", "src/new.ts": "export {};\n" },
    });

    await $.session.start(SESSION);
    await $.command.run(councilCommand("q"));
    await world.clock.settle();

    const prompt = world.kept.written[0]?.text ?? "";
    expect(prompt).toContain("+++ b/src/new.ts");
    expect(prompt).not.toContain("TOKEN");
  });

  test("pi and devin read the prompt from a temp file, removed after", async ($, on) => {
    const world = councilWorld(on, { installed: ["pi", "devin"] });

    await $.session.start(SESSION);
    await $.command.run(councilCommand());
    await world.clock.settle();

    const paths = world.kept.written.map((file) => file.path).toSorted(byText);
    expect(paths).toHaveLength(2);
    expect(paths[1]).toMatch(/^\/scratch\/me\/council-pi-[\da-f-]{36}\.md$/u);
    expect(paths[0]).toMatch(/^\/scratch\/me\/council-devin-/u);
    expect(world.kept.written[0]?.text).toContain("<diff>");
    const argvOf = (bin: string): readonly string[] =>
      world.kept.spawns.find((spawn) => spawn.argv[0] === bin)?.argv ?? [];
    expect(argvOf("pi")).toContain(`@${paths[1] ?? ""}`);
    expect(argvOf("devin")).toContain(paths[0]);
    expect(
      world.kept.spawns.every((spawn) => spawn.argv.join(" ").length < 400),
    ).toBe(true);
    expect(world.kept.removed.toSorted(byText)).toEqual(paths.toSorted(byText));
  });

  test("/council status opens the pane", async ($, on) => {
    const world = councilWorld(on);

    await $.session.start(SESSION);
    const status = await $.command.run(councilCommand("status"));
    expect(status.text).toBe("Council pane opened.");
    expect(world.kept.opened).toBe(1);
  });
});
