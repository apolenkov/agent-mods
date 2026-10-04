import { describe, expect, type Plugin, test } from "claude-code/testing";

import { councilCommand } from "../fixtures/council-command.ts";
import { councilWorld } from "../fixtures/council-world.ts";
import { PANE_PROPS } from "../fixtures/pane-props.ts";
import { SESSION } from "../fixtures/session.ts";

const TWO = ["codex", "pi"] as const;

/** Toasts "tick" for each period of any plugin's `$.clock.every`. */
const TICKS: Plugin = {
  name: "ticks",
  tier: "prepend",
  register(on) {
    on("clock.every", ($, e, next) => {
      $.ui.toast("tick");
      return next(e);
    });
  },
};

describe("run-member", () => {
  test(
    "a member past its timeout is stopped and failed",
    { options: { timeoutMin: 1 } },
    async ($, on) => {
      const world = councilWorld(on, {
        installed: TWO,
        outputs: { codex: { stdout: "", hangs: true } },
        replies: ['{"unique":[]}'],
      });

      await $.session.start(SESSION);
      await $.command.run(councilCommand());
      await world.clock.settle();

      expect(world.kept.toasts, "still waiting on codex").toEqual([]);

      await world.clock.advance(60_000);

      expect(world.kept.toasts.at(-1)).toMatch(
        /^\d+ findings? — \/council status$/u,
      );
      await $.command.run(councilCommand("status"));
      const pane = await $.ui.mount({
        plugin: "council",
        surface: "terminal",
        component: "Pane",
        requestId: "council",
        props: PANE_PROPS,
      });
      expect(
        await pane.find({
          type: "Text",
          text: /codex .*timed out after 1 min/u,
        }),
      ).toBeDefined();
    },
  );

  test("a failing exit or a missing binary fails only that member", async ($, on) => {
    const world = councilWorld(on, {
      installed: ["codex", "pi", "devin"],
      outputs: {
        pi: { stdout: "", stderr: "no api key\n", code: 2 },
        devin: { stdout: "", startError: "spawn devin ENOENT" },
      },
      replies: ['{"unique":[]}'],
    });

    await $.session.start(SESSION);
    await $.command.run(councilCommand());
    await world.clock.settle();

    expect(world.kept.toasts.at(-1)).toMatch(
      /^\d+ findings? — \/council status$/u,
    );
    expect(
      world.kept.prompts,
      "codex alone found nothing: no summary call",
    ).toEqual([]);
    await $.command.run(councilCommand("status"));
    const pane = await $.ui.mount({
      plugin: "council",
      surface: "terminal",
      component: "Pane",
      requestId: "council",
      props: PANE_PROPS,
    });
    const found = await pane.findAll({ type: "Text" });
    const texts = found.map((one) => one.text);
    expect(texts.join("\n")).toContain("pi: exit 2: no api key");
    expect(texts.join("\n")).toMatch(/devin .*cannot start: /u);
  });

  test(
    "a reviewer that cannot start leaves no timer behind",
    { plugins: [TICKS] },
    async ($, on) => {
      const world = councilWorld(on, {
        installed: TWO,
        outputs: { codex: { stdout: "", startError: "spawn codex ENOENT" } },
        replies: ['{"unique":[]}'],
      });

      await $.session.start(SESSION);
      await $.command.run(councilCommand());
      await world.clock.settle();
      const ticks = (): number =>
        world.kept.toasts.filter((text) => text === "tick").length;
      const before = ticks();
      await world.clock.advance(10_000);

      expect(ticks() - before).toBe(0);
    },
  );
});
