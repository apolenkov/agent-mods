import type { Elements, RenderElement } from "claude-code";

import type {
  CouncilMember,
  CouncilRun,
  CouncilSummary,
} from "../../types/index.d.ts";
import { memberLine, tailLines } from "../model/format.ts";

const TAIL_LINES = 3;

const SECTIONS = [
  ["agreements", "Agreements"],
  ["disagreements", "Disagreements"],
  ["unique", "Unique findings"],
] as const;

/** What the pane's buttons do. */
export type PaneActs = Readonly<{
  onSend: () => void;
  onRerun: () => void;
  onClose: () => void;
}>;

/** What the pane draws with: the surface's elements and the buttons' acts. */
export type PaneKit = Readonly<{
  ui: Readonly<Pick<Elements["terminal"], "Box" | "Text" | "Button">>;
  acts: PaneActs;
}>;

const memberView = (
  kit: PaneKit,
  member: CouncilMember,
  nowMs: number,
): Readonly<RenderElement> => {
  const { Box, Text } = kit.ui;
  return (
    <Box flexDirection="column" key={`member:${member.name}`}>
      <Text>{memberLine(member, nowMs)}</Text>
      {member.status === "running" &&
        tailLines(member.tail, TAIL_LINES).map((line) => (
          <Text dimColor wrap="truncate">{`  ${line}`}</Text>
        ))}
    </Box>
  );
};

const summaryView = (
  kit: PaneKit,
  summary: CouncilSummary,
): readonly Readonly<RenderElement>[] => {
  const { Box, Text } = kit.ui;
  return [
    ...SECTIONS.filter(([key]) => summary[key].length > 0).map(
      ([key, title]) => (
        <Box flexDirection="column" key={`section:${key}`}>
          <Text bold>{title}</Text>
          {summary[key].map((item) => (
            <Text>{`• (${item.members.join(", ")}) ${item.text}`}</Text>
          ))}
        </Box>
      ),
    ),
    ...summary.notes.map((note) => <Text dimColor>{`note: ${note}`}</Text>),
  ];
};

const buttonsView = (
  kit: PaneKit,
  run: CouncilRun,
): Readonly<RenderElement> => {
  const { Box, Button } = kit.ui;
  const isBusy = run.phase === "running" || run.phase === "summarizing";
  return (
    <Box flexDirection="row" gap={1}>
      {run.summary !== undefined && (
        <Button
          key="send"
          label="send to model"
          variant="primary"
          onPress={kit.acts.onSend}
        />
      )}
      {!isBusy && (
        <Button key="rerun" label="rerun" onPress={kit.acts.onRerun} />
      )}
      <Button
        key="close"
        label="close"
        role="dismiss"
        onPress={kit.acts.onClose}
      />
    </Box>
  );
};

/**
 * The council's pane: each member with its status and time (and the tail
 * of a running one), then the summary, then the buttons.
 * @param kit the elements and the buttons' acts
 * @param run the run to draw
 * @param nowMs the time now
 * @returns the tree
 */
export const paneView = (
  kit: PaneKit,
  run: CouncilRun,
  nowMs: number,
): Readonly<RenderElement> => {
  const { Box, Text } = kit.ui;
  return (
    <Box flexDirection="column">
      {run.phase === "idle" && (
        <Text dimColor>No council has run yet. /council starts one.</Text>
      )}
      {run.question !== undefined && (
        <Text italic>{`Question: ${run.question}`}</Text>
      )}
      {run.members.map((member) => memberView(kit, member, nowMs))}
      {run.phase === "summarizing" && (
        <Text dimColor>Writing the summary…</Text>
      )}
      {run.note !== undefined && <Text>{run.note}</Text>}
      {run.summary !== undefined && summaryView(kit, run.summary)}
      {buttonsView(kit, run)}
    </Box>
  );
};
