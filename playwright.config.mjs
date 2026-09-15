import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./browser-test',use:{baseURL:'http://127.0.0.1:18788',headless:true},
  webServer:{command:'node browser-test/fixture.mjs',url:'http://127.0.0.1:18788/events',reuseExistingServer:false},
});
