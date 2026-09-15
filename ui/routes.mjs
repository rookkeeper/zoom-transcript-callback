export function route(path) {
  if(path==='/')return {id:null};
  const match=path.match(/^\/events(?:\/([^/]+))?\/?$/);
  try {return match ? {id:match[1] ? decodeURIComponent(match[1]) : null} : null;} catch {return null;}
}
