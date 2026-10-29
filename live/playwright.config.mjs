import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './test/browser', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:19790', viewport: { width: 1100, height: 760 }, permissions: ['clipboard-read', 'clipboard-write'] },
  webServer: { command: 'node scripts/demo.mjs', url: 'http://127.0.0.1:19790/live', reuseExistingServer: false,
    env: { LIVE_WEBHOOK_PORT: '19789', LIVE_UI_PORT: '19790' } },
});
