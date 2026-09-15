export function apiClient(fetcher=fetch) {
  const get=async url=>{const response=await fetcher(url);if(!response.ok)throw new Error(`Request failed (${response.status})`);return response.json();};
  return {list:query=>get('/api/events?'+new URLSearchParams(query)),detail:id=>get('/api/events/'+encodeURIComponent(id))};
}
