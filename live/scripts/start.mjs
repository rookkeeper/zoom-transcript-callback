import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Compatibility entry point: normal deployment always starts the shared server.
const root = fileURLToPath(new URL('../../', import.meta.url));
const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envPath)) process.loadEnvFile(envPath);
process.chdir(root);
await import('../../src/index.mjs');
