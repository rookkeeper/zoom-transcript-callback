import test from "node:test";
import assert from "node:assert/strict";
import { ZOOM_TRANSCRIPT_PROMPT } from "../src/zoomPrompt.mjs";


test("contains a minimal internal callback prompt", () => {
  assert.match(ZOOM_TRANSCRIPT_PROMPT, /Zoom's recording\.transcript_completed callback/);
  assert.match(ZOOM_TRANSCRIPT_PROMPT, /how-to-use-this-repo/);
  assert.match(ZOOM_TRANSCRIPT_PROMPT, /{{callbackData}}/);
  assert.match(ZOOM_TRANSCRIPT_PROMPT, /zoom-processing-result\.json/);
});
