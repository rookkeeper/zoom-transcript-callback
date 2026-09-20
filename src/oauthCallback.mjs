import { exchangeCode, storeTokens } from "./zoomOAuth.mjs";

export function oauthHandler(config) {
  return async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (request.method !== "GET" || url.pathname !== "/zoom/oauth") {
      response.writeHead(404).end();
      return;
    }
    const send = (status, body) => response.writeHead(status, { "content-type": "text/html; charset=utf-8" }).end(body);
    if (url.searchParams.get("error")) {
      send(400, `<p>Zoom authorization was declined (${url.searchParams.get("error")}). Close this tab and try again.</p>`);
      return;
    }
    const code = url.searchParams.get("code");
    if (!code) {
      send(400, `<p>Missing authorization code. Start from the Zoom app's authorize URL and approve access.</p>`);
      return;
    }
    try {
      const tokens = await exchangeCode({
        tokenUrl: config.zoomTokenUrl,
        clientId: config.zoomClientId,
        clientSecret: config.zoomClientSecret,
        code,
        redirectUri: config.zoomRedirectUri,
      });
      storeTokens(config.zoomOAuthStorePath, tokens);
      send(200, `<p>Zoom connected. Tokens stored; you can close this tab.</p>`);
    } catch (error) {
      console.error("Zoom OAuth exchange failed", error.code ?? error.name);
      send(502, `<p>Token exchange failed. Close this tab and try authorizing again.</p>`);
    }
  };
}
