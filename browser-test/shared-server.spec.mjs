import { test, expect } from '@playwright/test';

test('one origin serves both mini-apps and rejects forwarded access to both', async ({ page, request }) => {
  await page.goto('/events');
  await expect(page.locator('body')).toContainText('Meeting');
  await page.goto('/live');
  await expect(page.locator('#status')).toHaveText('Live');
  await expect(page.getByText('Synthetic shared-server live text', {exact:true})).toBeVisible();
  for (const path of ['/events','/api/events','/live','/api/live/stream','/live/app.mjs']) {
    expect((await request.get(path,{headers:{'cf-ray':'synthetic-forwarded-request'}})).status()).toBe(403);
    expect((await request.get(path,{headers:{host:'public.example'}})).status()).toBe(403);
  }
});
