import { readFileSync, writeFileSync } from "node:fs";

const TOKEN_HOST = "https://zoom.us";
const API_HOST = "https://api.zoom.us";

function basicAuth(clientId, clientSecret) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

async function postForm(tokenUrl, clientId, clientSecret, params) {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { authorization: basicAuth(clientId, clientSecret), "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Zoom token exchange failed: ${payload.reason ?? payload.message ?? response.status}`);
  }
  if (!payload.access_token) throw new Error("Zoom token exchange returned no access token");
  return withExpiry(payload);
}

function withExpiry(payload) {
  return { ...payload, expires_at: Date.now() + (Number(payload.expires_in ?? 3600) - 60) * 1000 };
}

export function exchangeCode({ tokenUrl = `${TOKEN_HOST}/oauth/token`, clientId, clientSecret, code, redirectUri }) {
  return postForm(tokenUrl, clientId, clientSecret, {
    grant_type: "authorization_code", code, redirect_uri: redirectUri,
  });
}

export function refreshTokens({ tokenUrl = `${TOKEN_HOST}/oauth/token`, clientId, clientSecret, refreshToken }) {
  return postForm(tokenUrl, clientId, clientSecret, {
    grant_type: "refresh_token", refresh_token: refreshToken,
  });
}

export function loadStoredTokens(storePath) {
  try {
    return JSON.parse(readFileSync(storePath, "utf8"));
  } catch {
    return null;
  }
}

export function storeTokens(storePath, tokens) {
  writeFileSync(storePath, `${JSON.stringify(tokens)}\n`, { encoding: "utf8", mode: 0o600 });
}

function isExpired(tokens) {
  return !tokens?.access_token || (tokens.expires_at ?? 0) <= Date.now();
}

async function freshAccessToken({ tokenUrl, clientId, clientSecret, storePath }) {
  let tokens = loadStoredTokens(storePath);
  if (!tokens?.refresh_token) throw new Error("No stored Zoom OAuth tokens; visit /zoom/oauth to connect");
  if (isExpired(tokens)) {
    tokens = await refreshTokens({ tokenUrl, clientId, clientSecret, refreshToken: tokens.refresh_token });
    storeTokens(storePath, tokens);
  }
  return tokens;
}

export async function zoomApi({ baseUrl = API_HOST, tokenUrl, clientId, clientSecret, storePath }, path, options = {}) {
  const attempt = async (accessToken) => fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { authorization: `Bearer ${accessToken}`, ...(options.headers ?? {}) },
  });
  let tokens = await freshAccessToken({ tokenUrl, clientId, clientSecret, storePath });
  let response = await attempt(tokens.access_token);
  if (response.status === 401) {
    tokens = await refreshTokens({ tokenUrl, clientId, clientSecret, refreshToken: tokens.refresh_token });
    storeTokens(storePath, tokens);
    response = await attempt(tokens.access_token);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Zoom API ${path} failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  return response.json();
}
