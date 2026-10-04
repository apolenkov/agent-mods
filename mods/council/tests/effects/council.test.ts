import { describe, expect, test } from "claude-code/testing";

import { ANSWERED_TURN } from "../fixtures/answered-turn.ts";
import { councilCommand } from "../fixtures/council-command.ts";
import { councilWorld } from "../fixtures/council-world.ts";
import { SESSION } from "../fixtures/session.ts";
import { TYPED_PROMPT } from "../fixtures/typed-prompt.ts";

const NOTIFY = { options: { autoReview: "notify", cooldownMin: 10 } };
const IDLE_MS = 15_000;

describe("auto-review", () => {
  test("off by default: an answered turn runs nothing", async ($, on) => {
    const world = councilWorld(on);
    on("turn.complete", (_engine, e) => ({ text: e.answer }));

    await $.session.start(SESSION);
    await $.turn.complete(ANSWERED_TURN);
    await world.clock.advance(IDLE_MS);

    expect(world.kept.spawns).toEqual([]);
  });

  test("notify: runs once idle, and only notifies", NOTIFY, async ($, on) => {
    const world = councilWorld(on);
    on("turn.complete", (_engine, e) => ({ text: e.answer }));

    await $.session.start(SESSION);
    await $.turn.complete(ANSWERED_TURN);

    expect(world.kept.spawns, "the turn is never held").toEqual([]);

    await world.clock.advance(IDLE_MS);

    expect(world.kept.spawns).toHaveLength(3);
    expect(world.kept.toasts.at(-1)).toMatch(
      /^\d+ findings? — \/council status$/u,
    );
    expect(world.kept.submitted).toEqual([]);
    expect(world.kept.opened, "no pane opened unasked").toBe(0);
  });

  test("a prompt before idle drops the waiting run", NOTIFY, async ($, on) => {
    const world = councilWorld(on);
    on("turn.complete", (_engine, e) => ({ text: e.answer }));

    await $.session.start(SESSION);
    await $.turn.complete(ANSWERED_TURN);
    await $.prompt.submit(TYPED_PROMPT);
    await world.clock.advance(IDLE_MS);

    expect(world.kept.spawns).toEqual([]);
  });

  test(
    "a subagent's turn or an aborted one is ignored",
    NOTIFY,
    async ($, on) => {
      const world = councilWorld(on);
      on("turn.complete", (_engine, e) => ({ text: e.answer }));

      await $.session.start(SESSION);
      await $.turn.complete({ ...ANSWERED_TURN, agentId: "agent-1" });
      await $.turn.complete({
        ...ANSWERED_TURN,
        reason: "aborted",
        isAborted: true,
      });
      await world.clock.advance(IDLE_MS);

      expect(world.kept.spawns).toEqual([]);
    },
  );

  test("an unchanged diff is not reviewed again", NOTIFY, async ($, on) => {
    const world = councilWorld(on);
    on("turn.complete", (_engine, e) => ({ text: e.answer }));

    await $.session.start(SESSION);
    await $.turn.complete(ANSWERED_TURN);
    await world.clock.advance(IDLE_MS);
    await world.clock.advance(11 * 60_000);
    await $.turn.complete(ANSWERED_TURN);
    await world.clock.advance(IDLE_MS);

    expect(world.kept.spawns).toHaveLength(3);
  });

  test("the cooldown holds a changed diff back", NOTIFY, async ($, on) => {
    const script = { diff: "diff --git a/x b/x\n+one\n" };
    const world = councilWorld(on, script);
    on("turn.complete", (_engine, e) => ({ text: e.answer }));

    await $.session.start(SESSION);
    await $.turn.complete(ANSWERED_TURN);
    await world.clock.advance(IDLE_MS);
    script.diff = "diff --git a/x b/x\n+two\n";
    await $.turn.complete(ANSWERED_TURN);
    await world.clock.advance(IDLE_MS);

    expect(world.kept.spawns, "within ten minutes").toHaveLength(3);

    await world.clock.advance(10 * 60_000);
    await $.turn.complete(ANSWERED_TURN);
    await world.clock.advance(IDLE_MS);

    expect(world.kept.spawns, "after the cooldown").toHaveLength(6);
  });

  test(
    "a skipped attempt is not a review: the diff runs once members free up",
    NOTIFY,
    async ($, on) => {
      const world = councilWorld(on, {
        installed: ["codex", "pi"],
        limits: { pi: "1800000100" },
      });
      on("turn.complete", (_engine, e) => ({ text: e.answer }));

      await $.session.start(SESSION);
      await $.turn.complete(ANSWERED_TURN);
      await world.clock.advance(IDLE_MS);

      expect(world.kept.spawns, "pi is limited: nothing run").toEqual([]);

      await world.clock.advance(100_000);
      await $.turn.complete(ANSWERED_TURN);
      await world.clock.advance(IDLE_MS);

      expect(world.kept.spawns).toHaveLength(2);
    },
  );

  test(
    "a manual run started while the auto-review reads the diff wins alone",
    NOTIFY,
    async ($, on) => {
      const world = councilWorld(on, { diffDelayMs: 1000 });
      on("turn.complete", (_engine, e) => ({ text: e.answer }));

      await $.session.start(SESSION);
      await $.turn.complete(ANSWERED_TURN);
      await world.clock.advance(IDLE_MS);
      await $.command.run(councilCommand());
      await world.clock.advance(2000);

      expect(world.kept.spawns).toHaveLength(3);
    },
  );

  test(
    "a prompt while the auto-review reads the diff still cancels it",
    NOTIFY,
    async ($, on) => {
      const world = councilWorld(on, { diffDelayMs: 1000 });
      on("turn.complete", (_engine, e) => ({ text: e.answer }));

      await $.session.start(SESSION);
      await $.turn.complete(ANSWERED_TURN);
      await world.clock.advance(IDLE_MS);
      await $.prompt.submit(TYPED_PROMPT);
      await world.clock.advance(2000);

      expect(world.kept.spawns).toEqual([]);
    },
  );
});
