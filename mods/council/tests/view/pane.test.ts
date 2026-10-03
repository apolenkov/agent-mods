import { describe, expect, test } from "claude-code/testing";

import { CODEX_REVIEW_STDOUT } from "../fixtures/codex-review-stdout.ts";
import { councilCommand } from "../fixtures/council-command.ts";
import { councilWorld } from "../fixtures/council-world.ts";
import { PANE_PROPS } from "../fixtures/pane-props.ts";
import { PI_STDOUT } from "../fixtures/pi-stdout.ts";
import { SESSION } from "../fixtures/session.ts";
import { SUMMARY } from "../fixtures/summary.ts";

const SURFACES = ["terminal", "desktop"] as const;

describe("pane", () => {
  for (const surface of SURFACES) {
    test(`${surface}: before any run it says how to start one`, async ($, on) => {
      councilWorld(on);
      await $.session.start(SESSION);

      const pane = await $.ui.mount({
        plugin: "council",
        surface,
        component: "Pane",
        requestId: "council",
        props: PANE_PROPS,
      });

      expect(
        await pane.find({ type: "Text", text: /No council has run yet/u }),
      ).toBeDefined();
      expect(await pane.find({ key: "send" })).toBeUndefined();
      expect(await pane.find({ key: "rerun" })).toBeDefined();
    });

    test(`${surface}: members, the summary, and the buttons act`, async ($, on) => {
      const world = councilWorld(on, {
        installed: ["codex", "pi"],
        outputs: {
          codex: { stdout: CODEX_REVIEW_STDOUT },
          pi: { stdout: PI_STDOUT },
        },
        replies: [JSON.stringify(SUMMARY), JSON.stringify(SUMMARY)],
      });
      await $.session.start(SESSION);
      await $.command.run(councilCommand());
      await world.clock.settle();

      const pane = await $.ui.mount({
        plugin: "council",
        surface,
        component: "Pane",
        requestId: "council",
        props: PANE_PROPS,
      });
      const found = await pane.findAll({ type: "Text" });
      const texts = found.map((one) => one.text);

      expect(texts).toContain("● codex  done      0:00 2 findings");
      expect(texts).toContain("Agreements");
      expect(texts).toContain(
        "• (codex, pi) src/cache.ts:12 cache never invalidated",
      );
      expect(texts).toContain("Unique findings");
      expect(texts).not.toContain("Disagreements");

      await pane.press({ key: "send" });
      await world.clock.settle();
      expect(world.kept.submitted).toHaveLength(1);

      await pane.press({ key: "rerun" });
      await world.clock.settle();
      expect(world.kept.spawns).toHaveLength(4);

      await pane.press({ key: "close" });
    });
  }
});
