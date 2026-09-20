import http from 'node:http';
import { callbackHandler } from './callback.mjs';
import { oauthHandler } from './oauthCallback.mjs';
import { adminServer } from './admin.mjs';
export function createApplication(config, service, processor) {
  return { callback:http.createServer((req,res)=>{
    if (req.method === 'GET' && new URL(req.url,'http://localhost').pathname === '/zoom/oauth') return oauthHandler(config)(req,res);
    return callbackHandler(config,service,processor)(req,res);
  }), admin:adminServer(service) };
}
