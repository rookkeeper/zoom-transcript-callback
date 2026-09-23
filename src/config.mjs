import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { ZOOM_TRANSCRIPT_PROMPT } from "./zoomPrompt.mjs";
import { loadPiSkills } from "./pi.mjs";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function loadConfig() {
  const repoRoot = process.cwd();
  const repoSkillDirectory = join(repoRoot, ".agents", "skills", "how-to-use-this-repo");
  const piSkillsRoot = process.env.PI_SKILLS_ROOT?.trim() || "/Users/johnberryman/projects/github/JnBrymn/agent-skills/skills";
  return {
    host: process.env.CALLBACK_HOST?.trim() || "127.0.0.1",
    port: Number.parseInt(process.env.CALLBACK_PORT ?? "8787", 10),
    eventsPort: Number.parseInt(process.env.EVENTS_PORT ?? "8788", 10),
    eventsDatabasePath: process.env.EVENTS_DATABASE_PATH?.trim() || join(process.cwd(), 'data', 'events.sqlite'),
    zoomSecret: required("ZOOM_WEBHOOK_SECRET"),
    piCli: process.env.PI_CLI_PATH?.trim() || "pi",
    piModel: process.env.PI_MODEL?.trim() || "",
    piSkills: loadPiSkills(piSkillsRoot, repoSkillDirectory),
    repoSkillDirectory,
    piLogPath: process.env.PI_EXECUTION_LOG_PATH?.trim() || join(process.cwd(), "logs", "zoom-transcript-pi.jsonl"),
    successLogPath: process.env.ZOOM_SUCCESS_LOG_PATH?.trim() || join(process.cwd(), "logs", "zoom-transcript-success.jsonl"),
    piWorkRoot: process.env.PI_WORK_ROOT?.trim() || join(tmpdir(), "zoom-transcript-callback"),
    piTimeoutMs: Number.parseInt(process.env.PI_TIMEOUT_MS ?? String(10 * 60 * 1000), 10),
    piIdleTimeoutMs: Number.parseInt(process.env.PI_IDLE_TIMEOUT_MS ?? String(10 * 60 * 1000), 10),
    piMaxAttempts: Math.max(1, Number.parseInt(process.env.PI_MAX_ATTEMPTS ?? "2", 10) || 2),
    piRetryDelayMs: Math.max(0, Number.parseInt(process.env.PI_RETRY_DELAY_MS ?? String(60 * 1000), 10) || 0),
    titlePrefix: process.env.PI_SESSION_TITLE_PREFIX?.trim() || "Zoom transcript",
    promptTemplate: ZOOM_TRANSCRIPT_PROMPT,
    maxBodyBytes: Number.parseInt(process.env.MAX_WEBHOOK_BODY_BYTES ?? String(256 * 1024), 10),
    maxTimestampAgeSeconds: Number.parseInt(process.env.MAX_WEBHOOK_AGE_SECONDS ?? "300", 10),
    zoomClientId: process.env.ZOOM_CLIENT_ID?.trim() || "",
    zoomClientSecret: process.env.ZOOM_CLIENT_SECRET?.trim() || "",
    zoomTokenUrl: process.env.ZOOM_TOKEN_URL?.trim() || "https://zoom.us/oauth/token",
    zoomRedirectUri: process.env.ZOOM_REDIRECT_URI?.trim() || "https://dev-callbacks.arcturus-labs.com/zoom/oauth",
    zoomOAuthStorePath: process.env.ZOOM_OAUTH_STORE_PATH?.trim() || join(process.cwd(), 'data', 'zoom-oauth.json'),
  };
}
