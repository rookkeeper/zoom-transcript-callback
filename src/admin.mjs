import http from 'node:http';
import { readFileSync } from 'node:fs';
import { activityApi } from './api.mjs';
const assets=new Map(['app','model','routes','client','state','components'].map(name=>[`/${name}.mjs`,'text/javascript']).concat([['/style.css','text/css']]));
export function adminServer(service) {
  return http.createServer((req,res)=>{
    const send=(status,type,body)=>res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; frame-ancestors 'none'"}).end(body);
    // Separate listener, exact local Host, and no forwarding headers: reject tunnel/proxy and DNS-rebinding access.
    const port=req.socket.localPort;
    if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)||Object.keys(req.headers).some(k=>/^(forwarded|x-forwarded-|cf-)/.test(k))){send(403,'text/plain','Local access only');return;}
    if(req.method!=='GET'){send(405,'text/plain','GET required');return;}
    try{
      const url=new URL(req.url,'http://localhost');
      if(url.pathname.startsWith('/api/')){const result=activityApi(service,url);send(result.status,'application/json',JSON.stringify(result.body));return;}
      const type=assets.get(url.pathname),file=type?url.pathname.slice(1):/^\/(events(?:\/[^/]+)?|)$/.test(url.pathname)?'index.html':null;
      if(!file){send(404,'text/plain','Not found');return;}
      send(200,type||'text/html',readFileSync(new URL('../ui/'+file,import.meta.url)));
    }catch{send(500,'application/json',JSON.stringify({error:'Unable to load activity'}));}
  });
}
