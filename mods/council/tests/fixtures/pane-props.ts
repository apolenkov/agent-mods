import type { RenderPropsOf } from "claude-code";

/** The council's pane docked, 80 columns of body. */
export const PANE_PROPS: RenderPropsOf["Pane"] = {
  title: "Council",
  isFocused: false,
  bodyColumns: 80,
  placement: "dock",
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
};
