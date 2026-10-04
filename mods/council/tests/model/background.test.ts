import type { SessionMessage } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { runningBackgroundTasks } from "../../hooks/model/background.ts";
import { backgroundBash } from "../fixtures/background-bash.ts";
import { taskNotification } from "../fixtures/task-notification.ts";

const user = (text: string): SessionMessage => ({
  role: "user",
  text,
  toolUses: [],
});
const B1_DONE = user(taskNotification("b1"));
const STILL_RUNNING = user(taskNotification("b1", "running"));
const STUCK = user(
  [
    "<task-notification>",
    "<task-id>b1</task-id>",
    "<summary>Background command may be waiting for input</summary>",
    "</task-notification>",
  ].join("\n"),
);
const B3_KILLED = user(taskNotification("b3", "killed"));

const stop = (
  input: Record<string, unknown>,
  isError?: true,
): SessionMessage => ({
  role: "assistant",
  text: "",
  toolUses: [
    {
      tool_use_id: "toolu_stop",
      tool: "TaskStop",
      input,
      ...(isError === undefined
        ? {
            result: {
              message: "stopped",
              task_id: "x",
              task_type: "local_bash",
            },
          }
        : { isError, text: "No task found" }),
    },
  ],
});

describe("background", () => {
  test("none: no background task in the transcript", () => {
    expect(runningBackgroundTasks([user("hi")])).toEqual([]);
  });

  test("a task with no notification yet is running", () => {
    expect(runningBackgroundTasks([backgroundBash("b1")])).toEqual(["b1"]);
  });

  test("a notification, whatever its status, ends it", () => {
    expect(
      runningBackgroundTasks([
        backgroundBash("b1"),
        backgroundBash("b2"),
        backgroundBash("b3"),
        B1_DONE,
        B3_KILLED,
      ]),
    ).toEqual(["b2"]);
  });

  test("malformed rows are ignored", () => {
    const malformed: SessionMessage = {
      role: "assistant",
      text: "",
      toolUses: [
        { tool_use_id: "t1", tool: "Bash", input: {}, result: "denied" },
        {
          tool_use_id: "t2",
          tool: "Bash",
          input: {},
          result: { backgroundTaskId: 7 },
        },
        {
          tool_use_id: "t3",
          tool: "Read",
          input: {},
          result: { backgroundTaskId: "r1" },
        },
        { tool_use_id: "t4", tool: "Bash", input: {} },
      ],
    };
    expect(
      runningBackgroundTasks([
        malformed,
        user("<task-id>b9</task-id> without a notification frame"),
      ]),
    ).toEqual([]);
  });

  test("an id quoted by the assistant does not end the task", () => {
    expect(
      runningBackgroundTasks([
        backgroundBash("b1"),
        { role: "assistant", text: taskNotification("b1"), toolUses: [] },
      ]),
    ).toEqual(["b1"]);
  });

  test("a successful TaskStop ends the task; a refused one does not", () => {
    expect(
      runningBackgroundTasks([
        backgroundBash("b1"),
        backgroundBash("b2"),
        backgroundBash("b3"),
        stop({ task_id: "b1" }),
        stop({ shell_id: "b2" }),
        stop({ task_id: "b3" }, true),
      ]),
    ).toEqual(["b3"]);
  });

  test("a notification without a terminal status leaves the task running", () => {
    expect(runningBackgroundTasks([backgroundBash("b1"), STUCK])).toEqual([
      "b1",
    ]);
    expect(
      runningBackgroundTasks([backgroundBash("b1"), STILL_RUNNING]),
    ).toEqual(["b1"]);
  });
});
