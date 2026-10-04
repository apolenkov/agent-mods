import type { CouncilConfig } from "../model/config.ts";
import { sendText } from "../model/summary.ts";
import { canClaim, convene, didCancel } from "./council.ts";
import type { Host } from "./host.ts";

/**
 * Submits the last summary to the model: the one way findings reach it.
 * @param host the engine
 * @returns what to tell the owner
 */
export const sendSummary = async (host: Host): Promise<string> => {
  const { summary } = await host.readRun();
  if (summary === undefined) {
    return "No council summary to send yet.";
  }
  const text = sendText(summary);
  // Seen and sent: the line gives way to other plugins' status lines.
  host.status(undefined);
  // Submitted once this hook has returned: a prompt waits on the turn.
  host.after(0, () => {
    void host.submit(text);
  });
  return "Sent the council's summary to the model.";
};

/**
 * Starts a run unless one is under way: claims the council, opens the
 * pane, and schedules the work on the clock so no hook waits on it.
 * @param host the engine
 * @param config the plugin's config
 * @param question the owner's question, when there is one
 * @returns what to tell the owner
 */
export const startRun = async (
  host: Host,
  config: CouncilConfig,
  question: string | undefined,
): Promise<string> => {
  const request = {
    isAuto: false,
    ...(question !== undefined && { question }),
  };
  if (!(await canClaim(host, request))) {
    return "The council is already reviewing; /council status shows it.";
  }
  await host.openPane();
  host.after(0, () => {
    void convene(host, config, request);
  });
  return "The council is reviewing the working diff; /council status shows it.";
};

/**
 * Opens the pane; a finished run's status line is cleared, it was seen.
 * @param host the engine
 * @returns what to tell the owner
 */
const showPane = async (host: Host): Promise<string> => {
  const { phase } = await host.readRun();
  if (phase === "done") {
    host.status(undefined);
  }
  await host.openPane();
  return "Council pane opened.";
};

const cancelText = async (host: Host): Promise<string> =>
  (await didCancel(host))
    ? "Cancelled the council's review."
    : "No council review is running.";

/**
 * `/council`, `/council <question>`, `/council send`, `/council status`,
 * `/council cancel`.
 * @param host the engine
 * @param args what followed the command
 * @param config the plugin's config
 * @returns the command's output line
 */
export const councilCommand = async (
  host: Host,
  args: string,
  config: CouncilConfig,
): Promise<string> => {
  const word = args.trim();
  if (word === "send") {
    return sendSummary(host);
  }
  if (word === "status") {
    return showPane(host);
  }
  if (word === "cancel") {
    return cancelText(host);
  }
  return startRun(host, config, word === "" ? undefined : word);
};
