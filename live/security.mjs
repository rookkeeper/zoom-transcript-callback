import { createHmac, timingSafeEqual } from 'node:crypto';

export const hmac = (secret, message) => createHmac('sha256', secret).update(message).digest('hex');
export const signature = (secret, timestamp, raw) => `v0=${hmac(secret, Buffer.concat([Buffer.from(`v0:${timestamp}:`), raw]))}`;

export function verifyWebhook(secret, timestamp, supplied, raw, now = Date.now() / 1000) {
  if (typeof timestamp !== 'string' || !/^\d{1,12}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 300 ||
      typeof supplied !== 'string' || !/^v0=[a-f0-9]{64}$/.test(supplied)) return false;
  return timingSafeEqual(Buffer.from(signature(secret, timestamp, raw)), Buffer.from(supplied));
}

// Only Zoom-owned TLS endpoints, with normal certificate verification and no redirects.
export function validateServerUrl(value) {
  try {
    if (typeof value !== 'string' || value.length > 2048 || /[\s\\]/.test(value)) throw 0;
    const url = new URL(value);
    if (url.protocol !== 'wss:' || !url.hostname.endsWith('.zoom.us') ||
        url.username || url.password || url.hash || (url.port && url.port !== '443')) throw 0;
    return url.href;
  } catch { throw new Error('Invalid RTMS server'); }
}

export function signalingUrl(value, validate = validateServerUrl) {
  if (typeof value !== 'string' || value.length > 8192) throw new Error('Invalid RTMS server');
  const urls = value.split(',');
  if (urls.length > 4) throw new Error('Invalid RTMS server');
  // Webhooks can advertise multiple protocols. Never connect to an unvalidated URL.
  const candidates = urls.filter(url => /^wss?:/.test(url.trim()));
  if (!candidates.length) throw new Error('Invalid RTMS server');
  return candidates.map(url => validate(url.trim()))[0];
}
