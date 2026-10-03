import type {
  EngineInterface,
  Register,
  RenderElement,
  RenderInput,
} from "claude-code";
import { atom, read, update } from "claude-code";

import { councilCommand, sendSummary, startRun } from "./effects/command.ts";
import { autoReview } from "./effects/council.ts";
import type { Host } from "./effects/host.ts";
import { configOf, type CouncilConfig } from "./model/config.ts";
import { paneView } from "./view/pane.tsx";

/** The last (or current) run; idle with no members before the first. */
const RUN = atom({ plugin: "council", key: "run" } as const, {
  phase: "idle",
  members: [],
});

/** The diff last reviewed and when. */
const REVIEWED = atom({ plugin: "council", key: "reviewed" } as const, {
  hash: "",
  at: 0,
});

/** Bumped by every prompt, so a waiting auto-review sees it is stale. */
const AUTO_TOKEN = atom({ plugin: "council", key: "autoToken" } as const, 0);

/** The pane's id. */
const PANE = "council";

/** How long the session must stay idle before an auto-review starts. */
const IDLE_MS = 15_000;

/**
 * Binds the engine for the effects: every `$` call is spelled here.
 * @param $ the hook's engine
 * @returns the host
 */
function hostOf($: Readonly<EngineInterface>): Host {
  return {
    now: () => $.clock.now(),
    after: (ms, callback) => $.clock.after(ms, callback),
    run: (argv, init) => $.process.run(argv, init),
    spawn: (request) => $.process.spawn(request),
    readFile: (path) => $.fs.read(path),
    stat: (path) => $.fs.stat(path),
    home: () => $.env.get("HOME"),
    typesafeKey: () => $.env.get("TYPESAFE_API_KEY"),
    typesafeModel: () => $.env.get("TYPESAFE_MODEL"),
    cwd: () => $.session.cwd(),
    complete: (request) => $.model.complete(request),
    fetch: (url, init) => $.http.fetch(url, init),
    submit: (text) => $.prompt.submit({ text }),
    openPane: () => $.ui.open({ id: PANE, title: "Council" }),
    closePane: () => $.ui.close({ id: PANE }),
    status: (text) => {
      $.ui.status(text);
    },
    toast: (text) => {
      $.ui.toast(text);
    },
    readRun: () => read($, RUN),
    updateRun: (change) => update($, RUN, change),
    readReviewed: () => read($, REVIEWED),
    writeReviewed: (reviewed) => update($, REVIEWED, () => reviewed),
    readToken: () => read($, AUTO_TOKEN),
  };
}

/**
 * Draws the pane from the run, its buttons bound to the effects.
 * @param $ the hook's engine
 * @param e the Pane's render input
 * @param config the plugin's config
 * @returns the tree
 */
async function drawPane(
  $: Readonly<EngineInterface>,
  e: Readonly<RenderInput<"Pane">>,
  config: CouncilConfig,
): Promise<Readonly<RenderElement>> {
  const { Box, Text, Button } = $.ui.resolve(e);
  const host = hostOf($);
  const run = await read($, RUN);
  const acts = {
    onSend: () => {
      void sendSummary(host);
    },
    onRerun: () => {
      void startRun(host, config, run.question);
    },
    onClose: () => {
      void host.closePane();
    },
  };
  return paneView(
    { ui: { Box, Text, Button }, acts },
    run,
    await $.clock.now(),
  );
}

/**
 * Wires the council: /council, its pane, and the auto-review that only
 * notifies.
 * @param on registers a hook
 * @param options the plugin's `userConfig` values
 */
export const register: Register = (on, options) => {
  const config = configOf(options);

  on("session.start", async ($, e, next) => {
    await $.command.register({
      name: "council",
      description:
        "Independent reviewers on the working diff, one summary (send, status)",
      argumentHint: "[question | send | status]",
    });
    return next(e);
  });

  on("command.run", { command: "council" }, async ($, e) => ({
    text: await councilCommand(hostOf($), e.args, config),
  }));

  // Any prompt makes a waiting auto-review stale: it runs only after idle.
  on("prompt.submit", async ($, e, next) => {
    await update($, AUTO_TOKEN, (token) => token + 1);
    return next(e);
  });

  on("turn.complete", async ($, e, next) => {
    if (
      config.autoReview === "notify" &&
      e.agentId === undefined &&
      e.reason === "answer"
    ) {
      const token = await read($, AUTO_TOKEN);
      const host = hostOf($);
      $.clock.after(IDLE_MS, () => {
        void autoReview(host, config, token);
      });
    }
    return next(e);
  });

  on("ui.render", { component: "Pane", requestId: PANE }, ($, e) =>
    drawPane($, e, config),
  );
};
