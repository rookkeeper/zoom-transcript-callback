import { test, expect } from '@playwright/test';

test('literal selectable colored text, refresh snapshot, pause/selection, copy and clear', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/live');
  await expect(page.locator('#status')).toHaveText('Live');
  await expect.poll(() => page.locator('.utterance').count()).toBeGreaterThanOrEqual(100);
  await expect(page.getByText('<script>Literal synthetic text, not HTML.</script>', { exact: true })).toBeVisible();
  expect(await page.locator('#transcript script').count()).toBe(0);
  const colors = await page.locator('.utterance').evaluateAll(rows => rows.slice(0, 4).map(row => ({
    name: getComputedStyle(row.querySelector('strong')).color, text: getComputedStyle(row.querySelector('span')).color
  })));
  expect(colors[0].name).toBe(colors[0].text);
  expect(colors[0].name).toBe(colors[3].name);
  expect(colors[0].name).not.toBe(colors[1].name);
  await page.getByRole('button', { name: 'Pause auto-scroll' }).click();
  await expect(page.locator('#scroll-status')).toHaveText('Auto-scroll paused');
  await page.getByRole('button', { name: 'Resume auto-scroll' }).click();
  await page.locator('#transcript').evaluate(el => { el.scrollTop = 0; });
  await expect(page.locator('#scroll-status')).toHaveText('Auto-scroll paused');
  await page.getByRole('button', { name: 'Resume auto-scroll' }).click();
  await page.locator('.utterance').first().evaluate(el => {
    const range = document.createRange(); range.selectNodeContents(el);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
  });
  await expect(page.locator('#scroll-status')).toHaveText('Auto-scroll paused');
  await page.getByRole('button', { name: 'Copy transcript' }).click();
  await expect(page.locator('#notice')).toHaveText('Copied transcript.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Literal synthetic text');
  await page.reload();
  await expect(page.locator('#status')).toHaveText('Live');
  await expect(page.getByText('<script>Literal synthetic text, not HTML.</script>', { exact: true })).toBeAttached();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Clear transcript' }).click();
  await expect(page.getByText('<script>Literal synthetic text, not HTML.</script>', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('<script>Literal synthetic text, not HTML.</script>', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a new process snapshot cannot retain old rows with reused numeric IDs', async ({ page }) => {
  const row = text => ({ id: 1, speaker: 'fake', name: 'Fake speaker', text, timestamp: 1 });
  await page.route('**/api/live/stream', route => route.fulfill({ contentType: 'text/event-stream', body:
    `data: ${JSON.stringify({ type: 'snapshot', epoch: 'old-process', rows: [row('Synthetic old process')], status: 'live', detail: '', dropped: 0 })}\n\n` +
    `data: ${JSON.stringify({ type: 'snapshot', epoch: 'new-process', rows: [row('Synthetic new process')], status: 'live', detail: '', dropped: 0 })}\n\n`
  }));
  await page.goto('/live');
  await expect(page.getByText('Synthetic new process', { exact: true })).toBeVisible();
  await expect(page.getByText('Synthetic old process', { exact: true })).toHaveCount(0);
});
