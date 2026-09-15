import {test,expect} from '@playwright/test';
test('list, expanded details, direct link and back navigation preserve the current view',async({page})=>{
  await page.goto('/events');
  await expect(page.locator('tbody a')).toHaveCount(50);
  const details=page.locator('details').first();const id=await details.getAttribute('data-id');
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open','');
  const second=page.locator('details').nth(1),secondId=await second.getAttribute('data-id');
  await second.locator('summary').click();
  await page.locator('tbody a').first().click();
  await expect(page).toHaveURL(new RegExp(`/events/${id}$`));
  await expect(page.locator('tbody a')).toHaveCount(1);
  await page.goBack();
  await expect(page.locator('tbody a')).toHaveCount(50);
  await expect(page.locator(`details[data-id="${id}"]`)).toHaveAttribute('open','');
  await expect(page.locator(`details[data-id="${secondId}"]`)).toHaveAttribute('open','');
  await page.locator('#next').click();await expect(page.locator('tbody a')).toHaveCount(5);
  await page.reload();await expect(page.locator('tbody a')).toHaveCount(5);
  await page.locator('[name=endpoint]').fill('/future');await page.getByRole('button',{name:'Apply'}).click();
  await expect(page.locator('tbody a')).toHaveCount(28);
  await page.waitForTimeout(5200);await expect(page.locator('tbody a')).toHaveCount(28);
  await page.screenshot({path:'test-results/events-screen.png',fullPage:true});
  await page.goto('/events/missing');await expect(page.locator('#content')).toContainText('404');
});

test('custom page size and unfinished filter edits survive navigation and refresh',async({page})=>{
  await page.goto('/events?limit=10');await expect(page.locator('tbody a')).toHaveCount(10);
  await page.locator('#next').click();await expect(page).toHaveURL(/offset=10/);
  await page.locator('[name=endpoint]').fill('/draft-filter');
  await page.waitForTimeout(5200);
  await expect(page.locator('[name=endpoint]')).toHaveValue('/draft-filter');
});
