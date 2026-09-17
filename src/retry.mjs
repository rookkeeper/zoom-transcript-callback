import { randomUUID } from "node:crypto";

// Failures raised before Pi spawns are not transient: retrying cannot help.
function isRetryable(result) {
  if (!result || result.status === "succeeded") return false;
  return !/could not start/i.test(result.error ?? "");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runTranscriptJob({
  activities,
  details,
  endpoint,
  type,
  title,
  firstActivityId = null,
  maxAttempts = 2,
  retryDelayMs = 60 * 1000,
  processor,
  sleepFn = sleep,
}) {
  const attempts = Math.max(1, maxAttempts);
  let firstId = firstActivityId;
  let lastResult = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let id;
    if (attempt === 1 && firstId) {
      id = firstId;
      activities.update(id, { type, title: title ?? details.topic ?? "Zoom meeting" });
    } else {
      id = randomUUID();
      if (attempt === 1) firstId = id;
      activities.receive({
        id,
        endpoint,
        type,
        title: title ?? details.topic ?? "Zoom meeting",
        metadata:
          attempt === 1
            ? { method: "POST" }
            : { method: "AUTO_RETRY", retryOf: firstId, attempt },
      });
    }
    // eslint-disable-next-line no-await-in-loop
    lastResult = await activities.run(id, () => processor(details, id));
    if (lastResult.status === "succeeded" || !isRetryable(lastResult) || attempt === attempts) {
      return { ...lastResult, activityId: id, attempts: attempt };
    }
    // eslint-disable-next-line no-await-in-loop
    await sleepFn(retryDelayMs);
  }
  return { ...lastResult, activityId: firstId, attempts: attempts };
}
