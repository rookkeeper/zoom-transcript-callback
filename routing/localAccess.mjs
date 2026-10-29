// Cloudflare also connects over loopback: peer address alone is not authorization.
export function localRequest(req) {
  const port = req.socket.localPort;
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return false;
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) return false;
  if (Object.keys(req.headers).some(key => ['forwarded', 'via', 'x-real-ip'].includes(key) || key.startsWith('x-forwarded-') || key.startsWith('cf-'))) return false;
  if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return false;
  return !req.headers['sec-fetch-site'] || ['same-origin', 'none'].includes(req.headers['sec-fetch-site']);
}
export function denyPrivate(res) {
  res.writeHead(403, { 'content-type': 'text/plain', 'cache-control': 'no-store' }).end('Local access only');
}
