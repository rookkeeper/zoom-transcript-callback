export function loadConfig(env, { demo = false } = {}) {
  const required = name => {
    if (typeof env[name] !== 'string' || !env[name].trim()) throw new Error(`Missing ${name}`);
    return env[name];
  };
  const port = (name, fallback) => {
    const value = env[name] ?? String(fallback);
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) throw new Error(`Invalid ${name}`);
    return Number(value);
  };
  const config = {
    clientId: demo ? 'fake-demo-client' : required('ZOOM_CLIENT_ID'),
    clientSecret: demo ? 'fake-demo-client-secret' : required('ZOOM_CLIENT_SECRET'),
    webhookSecret: demo ? 'fake-demo-webhook-secret' : required('ZOOM_WEBHOOK_SECRET'),
    webhookHost: demo ? '127.0.0.1' : (env.LIVE_WEBHOOK_HOST ?? '127.0.0.1'),
    webhookPort: port('LIVE_WEBHOOK_PORT', demo ? 18789 : 8789),
    uiPort: port('LIVE_UI_PORT', demo ? 18790 : 8790),
  };
  if (!['127.0.0.1', '0.0.0.0', '::1'].includes(config.webhookHost)) throw new Error('Invalid LIVE_WEBHOOK_HOST');
  if (config.webhookPort === config.uiPort) throw new Error('Live ports must be different');
  return config;
}
