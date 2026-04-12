import { type Page, expect } from '@playwright/test'

export async function clearIndexedDB(page: Page) {
  const client = await page.context().newCDPSession(page)
  await client.send('Storage.clearDataForOrigin', {
    origin: 'http://localhost:5173',
    storageTypes: 'indexeddb',
  })
}

export async function completeOnboarding(page: Page) {
  // Wait for the app to load (either onboarding or study view)
  await page.waitForLoadState('networkidle')

  // Check if onboarding is showing
  const welcomeHeading = page.getByRole('heading', { name: 'Welcome to Sheet Music Flashcards' })
  const isOnboarding = await welcomeHeading.isVisible({ timeout: 5000 }).catch(() => false)

  if (isOnboarding) {
    // Click the Skip button and wait for onboarding to disappear
    await page.getByRole('button', { name: 'Skip' }).click()
    await expect(welcomeHeading).not.toBeVisible({ timeout: 10000 })
  }

  await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible({ timeout: 20000 })
}

export async function goToSettings(page: Page) {
  await completeOnboarding(page)
  await page.getByRole('button', { name: 'Settings' }).click()
}
