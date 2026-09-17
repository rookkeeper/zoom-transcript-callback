import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPiSkills, piArgs, readCompletionMarker, redactPiOutput } from "../src/pi.mjs";

test("loads the Peeps and general Obsidian skills", () => {
  const root = mkdtempSync(join(tmpdir(), "pi-skills-"));
  for (const name of ["how-to-use-peeps-obsidian", "obsidian-general-usage"]) {
    mkdirSync(join(root, name));
    writeFileSync(join(root, name, "SKILL.md"), "# Skill\n");
  }
  assert.deepEqual(loadPiSkills(root), [join(root, "how-to-use-peeps-obsidian"), join(root, "obsidian-general-usage")]);
});

test("builds an unattended Pi command with explicit skills", () => {
  const args = piArgs({ model: "anthropic/claude-sonnet", skills: ["/skills/peeps", "/skills/obsidian"], title: "Zoom transcript · Demo", prompt: "Process this transcript" });
  assert.deepEqual(args, ["--print", "--thinking", "off", "--no-extensions", "--no-skills", "--no-context-files", "--tools", "bash,read,edit,write", "--name", "Zoom transcript · Demo", "--skill", "/skills/peeps", "--skill", "/skills/obsidian", "--model", "anthropic/claude-sonnet", "Process this transcript"]);
});

test("redacts Zoom bearer tokens from Pi output", () => {
  assert.equal(redactPiOutput("curl -H 'Authorization: Bearer secret-token' secret-token", "secret-token"), "curl -H 'Authorization: Bearer [REDACTED]' [REDACTED_ZOOM_DOWNLOAD_TOKEN]");
});

test("accepts only an explicit completed processing marker", () => {
  const directory = mkdtempSync(join(tmpdir(), "pi-result-"));
  assert.equal(readCompletionMarker(directory), null);
  writeFileSync(join(directory, "zoom-processing-result.json"), '{"status":"incomplete"}');
  assert.equal(readCompletionMarker(directory), null);
  writeFileSync(join(directory, "zoom-processing-result.json"), '{"status":"completed","summary":"Updated one event"}');
  assert.deepEqual(readCompletionMarker(directory), { status: "completed", summary: "Updated one event" });
});
