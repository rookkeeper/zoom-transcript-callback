import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { loadPiSkills } from "./pi.mjs";

const promptPath = fileURLToPath(new URL("../prompts/zoom-transcript.md", import.meta.url));

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function readPromptFile(filePath) {
  const source = readFileSync(filePath, "utf8");
  const prompt = source.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (!prompt) throw new Error(`Prompt file is empty: ${filePath}`);
  return prompt;
}

export function loadConfig() {
  const piSkillsRoot = process.env.PI_SKILLS_ROOT?.trim() || "/Users/johnberryman/projects/github/JnBrymn/agent-skills/skills";
  return {
    host: process.env.CALLBACK_HOST?.trim() || "127.0.0.1",
    port: Number.parseInt(process.env.CALLBACK_PORT ?? "8787", 10),
    zoomSecret: required("ZOOM_WEBHOOK_SECRET"),
    piCli: process.env.PI_CLI_PATH?.trim() || "pi",
    piPathPrefix: process.env.PI_PATH_PREFIX?.trim() || "/Applications/Obsidian.app/Contents/MacOS",
    piModel: process.env.PI_MODEL?.trim() || "",
    piSkills: loadPiSkills(piSkillsRoot),
    piLogPath: process.env.PI_EXECUTION_LOG_PATH?.trim() || join(process.cwd(), "logs", "zoom-transcript-pi.jsonl"),
    successLogPath: process.env.ZOOM_SUCCESS_LOG_PATH?.trim() || join(process.cwd(), "logs", "zoom-transcript-success.jsonl"),
    piWorkRoot: process.env.PI_WORK_ROOT?.trim() || join(tmpdir(), "zoom-transcript-callback"),
    piTimeoutMs: Number.parseInt(process.env.PI_TIMEOUT_MS ?? String(10 * 60 * 1000), 10),
    titlePrefix: process.env.PI_SESSION_TITLE_PREFIX?.trim() || "Zoom transcript",
    promptTemplate: readPromptFile(promptPath),
    maxBodyBytes: Number.parseInt(process.env.MAX_WEBHOOK_BODY_BYTES ?? String(256 * 1024), 10),
    maxTimestampAgeSeconds: Number.parseInt(process.env.MAX_WEBHOOK_AGE_SECONDS ?? "300", 10),
  };
}
