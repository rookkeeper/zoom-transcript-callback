import { statuses } from './activities.mjs';
export function activityApi(service, url) {
  if (url.pathname === '/api/events') {
    const q = url.searchParams;
    const limit = Number(q.get('limit') ?? 50), offset = Number(q.get('offset') ?? 0);
    const status = q.get('status') || '', endpoint = q.get('endpoint') || '';
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0 || (status && !statuses.includes(status))) return { status:400, body:{ error:'Invalid query' } };
    return { status:200, body:{ items:service.list({ limit,offset,status,endpoint }), limit,offset } };
  }
  const match = url.pathname.match(/^\/api\/events\/([^/]+)$/);
  const row = match && service.get(decodeURIComponent(match[1]));
  return row ? { status:200, body:row } : { status:404, body:{ error:'Activity not found' } };
}
