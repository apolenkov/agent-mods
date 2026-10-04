import { describe, expect, test } from "claude-code/testing";

import { CODEX_REVIEW_STDOUT } from "../fixtures/codex-review-stdout.ts";
import { councilCommand } from "../fixtures/council-command.ts";
import { councilWorld } from "../fixtures/council-world.ts";
import { OCR_REVIEW_JSON } from "../fixtures/ocr-review-json.ts";
import { PANE_PROPS } from "../fixtures/pane-props.ts";
import { PI_STDOUT } from "../fixtures/pi-stdout.ts";
import { SESSION } from "../fixtures/session.ts";
import { SUMMARY } from "../fixtures/summary.ts";

const OUTPUTS = {
  codex: { stdout: CODEX_REVIEW_STDOUT },
  pi: { stdout: PI_STDOUT },
  ocr: { stdout: OCR_REVIEW_JSON },
};

describe("command", () => {
  test("the status line stays only until the owner looks or sends", async ($, on) => {
    const world = councilWorld(on, {
      outputs: OUTPUTS,
      replies: [JSON.stringify(SUMMARY), JSON.stringify(SUMMARY)],
    });

    await $.session.start(SESSION);
    await $.command.run(councilCommand());
    expect(world.kept.statuses.at(-1)).toBe("reviewing…");
    await world.clock.settle();
    expect(world.kept.statuses.at(-1)).toBe("2 findings");

    await $.command.run(councilCommand("status"));
    expect(world.kept.statuses.at(-1)).toBeUndefined();

    await $.command.run(councilCommand());
    await world.clock.settle();
    expect(world.kept.statuses.at(-1)).toBe("2 findings");
    await $.command.run(councilCommand("send"));
    expect(world.kept.statuses.at(-1)).toBeUndefined();
  });

  test("/council cancel ends a running review; nothing is summarized", async ($, on) => {
    const world = councilWorld(on, {
      outputs: { codex: { stdout: "", hangs: true } },
      replies: ['{"unique":[]}'],
    });

    await $.session.start(SESSION);
    const idle = await $.command.run(councilCommand("cancel"));
    expect(idle.text).toBe("No council review is running.");

    await $.command.run(councilCommand());
    await world.clock.settle();
    const cancelled = await $.command.run(councilCommand("cancel"));
    expect(cancelled.text).toBe("Cancelled the council's review.");
    await world.clock.advance(2000);

    expect(world.kept.statuses.at(-1)).toBeUndefined();
    expect(world.kept.prompts, "no summary after a cancel").toEqual([]);
    const pane = await $.ui.mount({
      plugin: "council",
      surface: "terminal",
      component: "Pane",
      requestId: "council",
      props: PANE_PROPS,
    });
    const found = await pane.findAll({ type: "Text" });
    const texts = found.map((one) => one.text).join("\n");
    expect(texts).toMatch(/codex .*failed .*cancelled/u);
    expect(texts).toContain("Cancelled.");

    const again = await $.command.run(councilCommand());
    expect(again.text).toContain("reviewing the working diff");
  });
});
