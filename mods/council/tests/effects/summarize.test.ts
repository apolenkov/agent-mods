import { describe, expect, test } from "claude-code/testing";

import { CODEX_REVIEW_STDOUT } from "../fixtures/codex-review-stdout.ts";
import { councilCommand } from "../fixtures/council-command.ts";
import { councilWorld } from "../fixtures/council-world.ts";
import { PI_STDOUT } from "../fixtures/pi-stdout.ts";
import { SESSION } from "../fixtures/session.ts";

const OUTPUTS = {
  codex: { stdout: CODEX_REVIEW_STDOUT },
  pi: { stdout: PI_STDOUT },
};
const TWO = ["codex", "pi"] as const;
const JEV = { options: { summarizer: "jev", typesafeApiKey: "ts-key" } };

const jevAnswers = (body: string): { status: number; text: string } => {
  const { questions } = JSON.parse(body) as { questions: object };
  const answers = Object.fromEntries(
    Object.keys(questions).map((id) => [
      id,
      id.startsWith("same_")
        ? { type: "choice", choice: id === "same_2" ? "#0" : "new" }
        : { type: "noul", noul: id.startsWith("contra_") ? 0.1 : 0.9 },
    ]),
  );
  return {
    status: 200,
    text: JSON.stringify({ model: "jev-1.13.0", answers }),
  };
};

describe("summarize", () => {
  test("Claude's broken JSON: the findings as they came", async ($, on) => {
    const world = councilWorld(on, {
      installed: TWO,
      outputs: OUTPUTS,
      replies: ["I think these are fine."],
    });

    await $.session.start(SESSION);
    await $.command.run(councilCommand());
    await world.clock.settle();
    await $.command.run(councilCommand("send"));
    await world.clock.settle();

    const sent = world.kept.submitted[0] ?? "";
    expect(sent).toContain("## Unique findings");
    expect(sent).toContain(
      "(codex) src/cache.ts:12 [high] Cache never invalidated",
    );
    expect(sent).toContain("was not JSON");
  });

  test("Claude not answering: the same fallback", async ($, on) => {
    const world = councilWorld(on, { installed: TWO, outputs: OUTPUTS });

    await $.session.start(SESSION);
    await $.command.run(councilCommand());
    await world.clock.settle();

    expect(world.kept.toasts.at(-1)).toBe(
      "council: 4 findings — /council status",
    );
  });

  test(
    "Jev scores with the key as a Bearer header; Claude writes prose",
    JEV,
    async ($, on) => {
      const world = councilWorld(on, {
        installed: TWO,
        outputs: OUTPUTS,
        jev: jevAnswers,
        replies: [
          '{"texts":["cache bug, both agree","typo","dropped promise"]}',
        ],
      });

      await $.session.start(SESSION);
      await $.command.run(councilCommand());
      await world.clock.settle();

      expect(world.kept.fetches.length).toBeGreaterThan(0);
      expect(world.kept.fetches[0]?.url).toBe(
        "https://api.typesafe.ai/v1/systemone",
      );
      expect(world.kept.fetches[0]?.auth).toBe("Bearer ts-key");
      expect(JSON.parse(world.kept.fetches[0]?.body ?? "{}")).toMatchObject({
        model: "jev-latest",
      });

      await $.command.run(councilCommand("send"));
      await world.clock.settle();

      const sent = world.kept.submitted[0] ?? "";
      expect(sent).toContain(
        "## Agreements\n- (codex, pi) cache bug, both agree",
      );
    },
  );

  test("Jev failing: Claude merges alone and says why", JEV, async ($, on) => {
    const world = councilWorld(on, {
      installed: TWO,
      outputs: OUTPUTS,
      jev: () => ({ status: 401, text: "{}" }),
      replies: ['{"unique":[{"members":["pi"],"text":"x"}]}'],
    });

    await $.session.start(SESSION);
    await $.command.run(councilCommand());
    await world.clock.settle();
    await $.command.run(councilCommand("send"));
    await world.clock.settle();

    expect(world.kept.submitted[0]).toContain(
      "Jev unavailable (Jev answered HTTP 401)",
    );
  });

  test(
    "jev without a key is Claude alone, nothing sent to TypeSafe",
    { options: { summarizer: "jev" } },
    async ($, on) => {
      const world = councilWorld(on, {
        installed: TWO,
        outputs: OUTPUTS,
        replies: ['{"unique":[]}'],
      });

      await $.session.start(SESSION);
      await $.command.run(councilCommand());
      await world.clock.settle();

      expect(world.kept.fetches).toEqual([]);
    },
  );
});
