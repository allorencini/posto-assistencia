import { test, expect } from '@playwright/test';

test('redirects to login when not authenticated', async ({ page }) => {
  await page.goto('/chamada');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('h1')).toContainText('Presença');
});

test('login form shows validation errors', async ({ page }) => {
  await page.goto('/login');
  await page.click('button[type=submit]');
  await expect(page.getByText('Email inválido')).toBeVisible();
});

test('privacidade page is public', async ({ page }) => {
  await page.goto('/privacidade');
  await expect(page.locator('h1')).toContainText('Política de Privacidade');
});
