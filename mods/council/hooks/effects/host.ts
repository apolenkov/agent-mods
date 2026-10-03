import type {
  HookStream,
  HttpInit,
  HttpResponse,
  ModelCompleteRequest,
  ModelCompleteResult,
  ProcessRunInit,
  ProcessRunResult,
  ProcessSpawnChunk,
  ProcessSpawnRequest,
  ProcessSpawnResult,
  Timer,
} from "claude-code";

import type { CouncilReviewed, CouncilRun } from "../../types/index.d.ts";

/**
 * The engine as a hook in register.tsx bound it from its `$`, each member
 * spelled `$.noun.event(...)` there (the engine follows `$` into no
 * import); what the effects and the timers they start call.
 */
export type Host = Readonly<{
  /** `$.clock.now`. */
  now: () => Promise<number>;
  /** `$.clock.after`. */
  after: (ms: number, callback: () => void) => Timer;
  /** `$.process.run`. */
  run: (
    argv: readonly string[],
    init?: Readonly<ProcessRunInit>,
  ) => Promise<ProcessRunResult>;
  /** `$.process.spawn`. */
  spawn: (
    request: Readonly<ProcessSpawnRequest>,
  ) => HookStream<ProcessSpawnChunk, ProcessSpawnResult>;
  /** `$.fs.read`. */
  readFile: (path: string) => Promise<string>;
  /** `$.fs.write`. */
  writeFile: (path: string, text: string) => Promise<void>;
  /** Best-effort `rm -f` through `$.process.run`; never rejects. */
  removeFile: (path: string) => Promise<void>;
  /** `$.env.get("TMPDIR")`. */
  tmpdir: () => Promise<string | undefined>;
  /** `$.fs.stat`: the kind and size. */
  stat: (path: string) => Promise<Readonly<{ kind: string; size: number }>>;
  /** `$.env.get("HOME")`. */
  home: () => Promise<string | undefined>;
  /** `$.env.get("TYPESAFE_API_KEY")`. */
  typesafeKey: () => Promise<string | undefined>;
  /** `$.env.get("TYPESAFE_MODEL")`. */
  typesafeModel: () => Promise<string | undefined>;
  /** `$.session.cwd`. */
  cwd: () => Promise<string>;
  /** `$.model.complete`. */
  complete: (
    request: Readonly<ModelCompleteRequest>,
  ) => Promise<ModelCompleteResult>;
  /** `$.http.fetch`. */
  fetch: (url: string, init: Readonly<HttpInit>) => Promise<HttpResponse>;
  /** `$.prompt.submit` with the text. */
  submit: (text: string) => Promise<unknown>;
  /** `$.ui.open` of the council's pane. */
  openPane: () => Promise<unknown>;
  /** `$.ui.close` of the council's pane. */
  closePane: () => Promise<unknown>;
  /** `$.ui.status`. */
  status: (text: string | undefined) => void;
  /** `$.ui.toast`. */
  toast: (text: string) => void;
  /** Reads the run (`read($, RUN)`). */
  readRun: () => Promise<CouncilRun>;
  /** Changes the run (`update($, RUN, change)`). */
  updateRun: (change: (run: CouncilRun) => CouncilRun) => Promise<CouncilRun>;
  /** Reads the last review (`read($, REVIEWED)`). */
  readReviewed: () => Promise<CouncilReviewed>;
  /** Writes the last review. */
  writeReviewed: (reviewed: CouncilReviewed) => Promise<unknown>;
  /** Reads the prompt count (`read($, AUTO_TOKEN)`). */
  readToken: () => Promise<number>;
}>;
