import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { downloadMeetingAssets } from "../src/zoomDownloads.mjs";
import { storeTokens } from "../src/zoomOAuth.mjs";

function meetingFixture() {
  return {
    topic: "Test meeting",
    start_time: "2026-09-24T12:00:00Z",
    recording_files: [
      { id: "transcript-id", file_type: "TRANSCRIPT", file_extension: "VTT", status: "completed", download_url: "https://assets.test/transcript" },
      { id: "video-id", file_type: "MP4", file_extension: "MP4", status: "completed", download_url: "https://assets.test/video" },
    ],
  };
}

function stubFetch(t, requests) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const method = options.method ?? "GET";
    requests.push({ url: String(url), method });
    if (String(url) === "https://api.zoom.us/v2/meetings/42/recordings") {
      return new Response(JSON.stringify(meetingFixture()), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (String(url).startsWith("https://assets.test/")) return new Response("asset bytes", { status: 200 });
    if (method === "DELETE") return new Response(null, { status: 204 });
    throw new Error(`Unexpected fetch: ${String(url)}`);
  };
  t.after(() => { globalThis.fetch = originalFetch; });
}

function stubConfig(directory) {
  const tokenPath = join(directory, "zoom-oauth.json");
  storeTokens(tokenPath, {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    expires_at: Date.now() + 60_000,
  });
  return {
    zoomClientId: "test-client",
    zoomClientSecret: "test-secret",
    zoomOAuthStorePath: tokenPath,
  };
}

test("deletes every completed non-transcript asset after verification when requested", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "zoom-download-delete-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const requests = [];
  stubFetch(t, requests);

  const result = await downloadMeetingAssets(stubConfig(directory), "42", { directory: join(directory, "assets"), deleteAssets: true });

  assert.equal(result.verified, true);
  assert.deepEqual(result.deleted.map((entry) => entry.id), ["video-id"]);
  const deletes = requests.filter((request) => request.method === "DELETE");
  assert.equal(deletes.length, 1);
  assert.match(deletes[0].url, /\/v2\/meetings\/42\/recordings\/video-id$/);
  assert.ok(!deletes.some((request) => request.url.includes("transcript-id")), "transcript must be preserved");
});

test("leaves cloud assets untouched without the delete flag", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "zoom-download-keep-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const requests = [];
  stubFetch(t, requests);

  const result = await downloadMeetingAssets(stubConfig(directory), "42", { directory: join(directory, "assets") });

  assert.equal(result.verified, true);
  assert.deepEqual(result.deleted, []);
  assert.deepEqual(requests.filter((request) => request.method === "DELETE"), []);
});

test("never deletes when downloads fail before verification", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "zoom-download-mismatch-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const method = options.method ?? "GET";
    requests.push({ url: String(url), method });
    if (String(url) === "https://api.zoom.us/v2/meetings/42/recordings") {
      return new Response(JSON.stringify(meetingFixture()), { status: 200, headers: { "content-type": "application/json" } });
    }
    // Simulate a failed video download so verification cannot pass.
    if (String(url) === "https://assets.test/video") return new Response("missing", { status: 404 });
    if (String(url).startsWith("https://assets.test/")) return new Response("asset bytes", { status: 200 });
    if (method === "DELETE") return new Response(null, { status: 204 });
    throw new Error(`Unexpected fetch: ${String(url)}`);
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  // The failed download throws before verification, so no deletion may fire.
  await assert.rejects(
    () => downloadMeetingAssets(stubConfig(directory), "42", { directory: join(directory, "assets"), deleteAssets: true }),
    /Asset mp4\.mp4 download failed/,
  );
  assert.deepEqual(requests.filter((request) => request.method === "DELETE"), []);
});

test("manual downloader requires double opt-in for deletion", () => {
  const result = spawnSync(process.execPath, [
    new URL("../scripts/zoom-download.mjs", import.meta.url).pathname,
    "--meeting", "42", "--delete",
  ], { encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--delete requires --yes/);
});
