import type { PromptSubmitInput } from "claude-code";

/** A prompt the person typed and sent with Enter. */
export const TYPED_PROMPT: PromptSubmitInput = {
  text: "next thing",
  wait: false,
  origin: { kind: "composer" },
};
