import http from "node:http";
import { spawn } from "node:child_process";
import { loadConfig } from "./config.mjs";
import { transcriptDetails, validationResponse, verifyZoomSignature } from "./zoom.mjs";

const config = loadConfig();

const server = http.createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/zoom/transcripts") {
    response.writeHead(404).end();
    return;
  }

  try {
    const rawBody = await readBody(request, config.maxBodyBytes);
    const timestamp = request.headers["x-zm-request-timestamp"];
    const signature = request.headers["x-zm-signature"];
    if (typeof timestamp !== "string" || typeof signature !== "string" || !verifyZoomSignature({
      secret: config.zoomSecret,
      timestamp,
      signature,
      rawBody,
      maxAgeSeconds: config.maxTimestampAgeSeconds,
    })) {
      response.writeHead(401).end();
      return;
    }

    const body = JSON.parse(rawBody);
    if (body.event === "endpoint.url_validation") {
      const plainToken = body.payload?.plainToken;
      if (typeof plainToken !== "string" || !plainToken) throw new Error("Missing validation token");
      sendJson(response, 200, validationResponse(config.zoomSecret, plainToken));
      return;
    }

    if (body.event !== "recording.transcript_completed") {
      sendJson(response, 204);
      return;
    }

    const details = transcriptDetails(body);
    const prompt = renderPrompt(config.promptTemplate, details);
    const args = ["exec", "--runtime", config.runtimeId, "--title", `${config.titlePrefix} · ${details.topic}`, "--server-url", config.rookServerUrl, "--auth-token", config.rookAuthToken];
    for (const environment of config.environments) args.push("--join", environment);
    args.push(prompt);
    const child = spawn(config.rookCli, args, { detached: true, stdio: ["ignore", "ignore", "pipe"], env: process.env });
    child.stderr.on("data", () => {
      // Do not log CLI output: prompts can contain temporary Zoom download tokens.
    });
    child.once("error", (error) => {
      console.error(JSON.stringify({ event: body.event, meetingUuid: details.meetingUuid, pid: child.pid, status: "spawn_failed", code: error.code ?? "unknown" }));
    });
    child.once("exit", (code, signal) => {
      if (code !== 0 || signal) {
        console.error(JSON.stringify({ event: body.event, meetingUuid: details.meetingUuid, pid: child.pid, status: "rook_exec_failed", code, signal }));
      }
    });
    child.unref();
    console.log(JSON.stringify({ event: body.event, meetingUuid: details.meetingUuid, pid: child.pid, status: "rook_exec_started" }));
    sendJson(response, 202, { accepted: true });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    sendJson(response, 400, { error: "Invalid webhook" });
  }
});

server.listen(config.port, config.host, () => {
  console.log(`Zoom callback listening on http://${config.host}:${config.port}/zoom/transcripts`);
});

function renderPrompt(template, details) {
  return template.replace(/{{([A-Za-z0-9]+)}}/g, (placeholder, name) => details[name] ?? placeholder);
}

function readBody(request, maxBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Request body too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
}
