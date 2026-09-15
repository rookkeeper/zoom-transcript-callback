import http from 'node:http';
import { callbackHandler } from './callback.mjs';
import { adminServer } from './admin.mjs';
export function createApplication(config, service, processor) {
  return { callback:http.createServer(callbackHandler(config,service,processor)), admin:adminServer(service) };
}
