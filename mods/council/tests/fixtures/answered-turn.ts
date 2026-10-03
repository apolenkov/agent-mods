import type { TurnCompleteInput } from "claude-code";

/** A main-loop turn the model answered. */
export const ANSWERED_TURN: TurnCompleteInput = {
  answer: "Done.",
  durationMs: 1000,
  isAborted: false,
  turnId: "turn-1",
  reason: "answer",
};
