import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const REQUIRED_SKILLS = ["how-to-use-peeps-obsidian"];

export function loadPiSkills(skillsRoot) {
  const skills = REQUIRED_SKILLS.map((name) => join(skillsRoot, name));
  for (const skill of skills) {
    if (!existsSync(join(skill, "SKILL.md"))) throw new Error(`Missing Pi skill: ${skill}`);
  }
  return skills;
}

export function piArgs({ model, skills, title, prompt }) {
  const args = ["--print", "--thinking", "off", "--no-extensions", "--no-skills", "--no-context-files", "--tools", "bash,read,edit,write", "--name", title];
  for (const skill of skills) args.push("--skill", skill);
  if (model) args.push("--model", model);
  args.push(prompt);
  return args;
}

export function jobDirectory(root, requestId) {
  const directory = join(root, requestId);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return directory;
}

export function appendJsonLine(path, entry) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  appendFileSync(path, `${JSON.stringify({ timestamp: new Date().toISOString(), ...entry })}\n`, { encoding: "utf8", mode: 0o600 });
}

export function readCompletionMarker(jobDir) {
  try {
    const marker = JSON.parse(readFileSync(join(jobDir, "zoom-processing-result.json"), "utf8"));
    return marker?.status === "completed" ? marker : null;
  } catch {
    return null;
  }
}

// Pi output can echo a tool command. Keep operational evidence while never
// persisting the temporary Zoom bearer token or Authorization header.
export function redactPiOutput(text, downloadToken) {
  let result = String(text).replace(/(Authorization:\s*Bearer\s+)[^\s'"`]+/gi, "$1[REDACTED]");
  if (downloadToken) result = result.split(downloadToken).join("[REDACTED_ZOOM_DOWNLOAD_TOKEN]");
  return result;
}
