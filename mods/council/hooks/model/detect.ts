import type { CouncilMemberName } from "../../types/index.d.ts";
import { MEMBER_NAMES } from "./config.ts";

/** What each member's `--version` prints first, as checked on 2026-10-04. */
const SIGNATURES: Readonly<Record<CouncilMemberName, RegExp>> = {
  codex: /^codex-cli \d/mu,
  pi: /^\d+\.\d+\.\d+\s*$/mu,
  devin: /^devin \d/mu,
  ocr: /^open-code-review v\d/mu,
};

/**
 * Whether a `--version` output is that member's own, not another tool of
 * the same name (an `ocr` that is Tesseract, say).
 * @param name the member
 * @param output what `<bin> --version` printed
 * @returns true when the signature matches
 */
export const isMemberVersion = (
  name: CouncilMemberName,
  output: string,
): boolean => SIGNATURES[name].test(output);

/**
 * The members to run: the configured list in its order, or every member in
 * the default order, each only when installed.
 * @param installed the members found on this machine
 * @param configured the `members` option, possibly empty
 * @returns the members to run
 */
export const pickMembers = (
  installed: readonly CouncilMemberName[],
  configured: readonly CouncilMemberName[],
): readonly CouncilMemberName[] =>
  (configured.length > 0 ? configured : MEMBER_NAMES).filter((name) =>
    installed.includes(name),
  );
