import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import process from "node:process";

const promptPath = fileURLToPath(new URL("../prompts/zoom-transcript.md", import.meta.url));

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function csv(name) {
  return (process.env[name] ?? "").split(",").map((value) => value.trim()).filter(Boolean);
}

export function readPromptFile(filePath) {
  const source = readFileSync(filePath, "utf8");
  const prompt = source.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (!prompt) throw new Error(`Prompt file is empty: ${filePath}`);
  return prompt;
}

export function loadConfig() {
  return {
    host: process.env.CALLBACK_HOST?.trim() || "127.0.0.1",
    port: Number.parseInt(process.env.CALLBACK_PORT ?? "8787", 10),
    zoomSecret: required("ZOOM_WEBHOOK_SECRET"),
    rookServerUrl: process.env.ROOK_SERVER_URL?.trim() || "http://127.0.0.1:7665",
    rookAuthToken: required("ROOK_AUTH_TOKEN"),
    rookCli: process.env.ROOK_CLI_PATH?.trim() || "rook",
    runtimeId: required("ROOK_RUNTIME_ID"),
    titlePrefix: process.env.ROOK_SESSION_TITLE_PREFIX?.trim() || "Zoom",
    environments: csv("ROOK_ENVIRONMENTS"),
    promptTemplate: readPromptFile(promptPath),
    maxBodyBytes: Number.parseInt(process.env.MAX_WEBHOOK_BODY_BYTES ?? String(256 * 1024), 10),
    maxTimestampAgeSeconds: Number.parseInt(process.env.MAX_WEBHOOK_AGE_SECONDS ?? "300", 10),
  };
}
