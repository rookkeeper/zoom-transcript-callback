import http from "node:http";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { loadConfig } from "./config.mjs";
import { appendJsonLine, jobDirectory, piArgs, readCompletionMarker, redactPiOutput } from "./pi.mjs";
import { transcriptDetails, validationResponse, verifyZoomSignature } from "./zoom.mjs";

const config = loadConfig();

const server = http.createServer(async (request, response) => {
  const requestId = randomUUID();
  const path = request.url?.split("?", 1)[0] ?? "";
  log({ event: "request_received", requestId, method: request.method, path, remoteAddress: request.socket.remoteAddress });

  if (request.method !== "POST" || path !== "/zoom/transcripts") {
    log({ event: "request_rejected", requestId, status: 404, reason: "unsupported_route" });
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
      log({ event: "request_rejected", requestId, status: 401, reason: "invalid_signature_or_timestamp" });
      response.writeHead(401).end();
      return;
    }

    const body = JSON.parse(rawBody);
    log({ event: "zoom_event_received", requestId, zoomEvent: body.event ?? "missing" });
    if (body.event === "endpoint.url_validation") {
      const plainToken = body.payload?.plainToken;
      if (typeof plainToken !== "string" || !plainToken) throw new Error("Missing validation token");
      log({ event: "request_completed", requestId, status: 200, zoomEvent: body.event });
      sendJson(response, 200, validationResponse(config.zoomSecret, plainToken));
      return;
    }

    if (body.event !== "recording.transcript_completed") {
      log({ event: "request_completed", requestId, status: 204, zoomEvent: body.event, reason: "unsupported_zoom_event" });
      sendJson(response, 204);
      return;
    }

    const details = transcriptDetails(body);
    const title = `${config.titlePrefix} · ${details.topic}`;
    const jobDir = jobDirectory(config.piWorkRoot, requestId);
    const prompt = renderPrompt(config.promptTemplate, { ...details, jobDirectory: jobDir, peepsSkillDirectory: config.piSkills[0] });
    const args = piArgs({ model: config.piModel, skills: config.piSkills, title, prompt });
    appendJsonLine(config.piLogPath, { event: "pi_started", requestId, meetingUuid: details.meetingUuid, meetingId: details.meetingId, recordingFileId: details.recordingFileId, title, cwd: jobDir, model: config.piModel || "default" });
    const childEnvironment = { ...process.env, PATH: [config.piPathPrefix, process.env.PATH].filter(Boolean).join(":") };
    const child = spawn(config.piCli, args, { detached: true, stdio: ["ignore", "pipe", "pipe"], cwd: jobDir, env: childEnvironment });
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      appendJsonLine(config.piLogPath, { event: "pi_timed_out", requestId, meetingUuid: details.meetingUuid, meetingId: details.meetingId, recordingFileId: details.recordingFileId, pid: child.pid, timeoutMs: config.piTimeoutMs });
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch (error) {
        appendJsonLine(config.piLogPath, { event: "pi_timeout_kill_failed", requestId, pid: child.pid, message: error instanceof Error ? error.message : String(error) });
      }
    }, config.piTimeoutMs);
    timeout.unref();
    child.stdout.on("data", (chunk) => {
      appendJsonLine(config.piLogPath, { event: "pi_stdout", requestId, output: redactPiOutput(chunk, details.downloadToken) });
    });
    child.stderr.on("data", (chunk) => {
      appendJsonLine(config.piLogPath, { event: "pi_stderr", requestId, output: redactPiOutput(chunk, details.downloadToken) });
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      appendJsonLine(config.piLogPath, { event: "pi_spawn_failed", requestId, meetingUuid: details.meetingUuid, code: error.code ?? "unknown", message: error.message });
      console.error(JSON.stringify({ event: body.event, meetingUuid: details.meetingUuid, pid: child.pid, status: "pi_spawn_failed", code: error.code ?? "unknown" }));
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      if (code !== 0 || signal) {
        appendJsonLine(config.piLogPath, { event: "pi_failed", requestId, meetingUuid: details.meetingUuid, meetingId: details.meetingId, recordingFileId: details.recordingFileId, pid: child.pid, code, signal, timedOut });
        console.error(JSON.stringify({ event: body.event, meetingUuid: details.meetingUuid, pid: child.pid, status: timedOut ? "pi_timed_out" : "pi_failed", code, signal }));
        return;
      }
      const completion = readCompletionMarker(jobDir);
      if (!completion) {
        appendJsonLine(config.piLogPath, { event: "pi_incomplete", requestId, meetingUuid: details.meetingUuid, meetingId: details.meetingId, recordingFileId: details.recordingFileId, pid: child.pid, reason: "missing_completion_marker" });
        console.error(JSON.stringify({ event: body.event, meetingUuid: details.meetingUuid, pid: child.pid, status: "pi_incomplete" }));
        return;
      }
      const success = { event: "transcript_processed", requestId, meetingUuid: details.meetingUuid, meetingId: details.meetingId, recordingFileId: details.recordingFileId, recordingFileName: details.recordingFileName, pid: child.pid, summary: typeof completion.summary === "string" ? completion.summary : "" };
      appendJsonLine(config.piLogPath, { ...success, event: "pi_succeeded" });
      appendJsonLine(config.successLogPath, success);
    });
    child.unref();
    log({ event: "pi_started", requestId, zoomEvent: body.event, pid: child.pid });
    log({ event: "request_completed", requestId, status: 202, zoomEvent: body.event });
    sendJson(response, 202, { accepted: true });
  } catch (error) {
    log({ event: "request_failed", requestId, status: 400, reason: error instanceof Error ? error.message : String(error) });
    sendJson(response, 400, { error: "Invalid webhook" });
  }
});

function log(entry) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...entry }));
}

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
