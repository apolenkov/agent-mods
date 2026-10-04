/**
 * The user row that ends a background task, as the transcript holds it
 * (recorded from a real session, paths shortened).
 * @param id the task's id
 * @param status how it ended
 * @returns the row's text
 */
export const taskNotification = (id: string, status = "completed"): string =>
  [
    "<task-notification>",
    `<task-id>${id}</task-id>`,
    "<tool-use-id>toolu_01JmgK49sPE5HEC2MW5ngws3</tool-use-id>",
    `<output-file>/tmp/tasks/${id}.output</output-file>`,
    `<status>${status}</status>`,
    '<summary>Background command "Run tests" finished</summary>',
    "</task-notification>",
  ].join("\n");
