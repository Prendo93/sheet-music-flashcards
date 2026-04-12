import { test, expect, type Page } from '@playwright/test'

async function completeOnboarding(page: Page) {
  const skipBtn = page.getByText('Skip')
  if (await skipBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await skipBtn.first().click()
  }
  await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible({ timeout: 20000 })
}

test.describe('Key Signatures (v1.2)', () => {
  test('key signature settings section is visible', async ({ page }) => {
    await page.goto('/')
    await completeOnboarding(page)
    await page.getByRole('button', { name: 'Settings' }).click()

    await expect(page.getByText('Key Signatures')).toBeVisible()
    await expect(page.getByRole('button', { name: 'G', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'D', exact: true })).toBeVisible()
  })

  test('enabling G major key signature toggles it on', async ({ page }) => {
    await page.goto('/')
    await completeOnboarding(page)
    await page.getByRole('button', { name: 'Settings' }).click()

    const gBtn = page.getByRole('button', { name: 'G', exact: true })
    await expect(gBtn).toHaveAttribute('aria-pressed', 'false')
    await gBtn.click()
    await expect(gBtn).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('Dark Mode (v1.2)', () => {
  test('theme toggle buttons appear in settings', async ({ page }) => {
    await page.goto('/')
    await completeOnboarding(page)
    await page.getByRole('button', { name: 'Settings' }).click()

    await expect(page.getByText('Theme')).toBeVisible()
    await expect(page.getByRole('button', { name: 'System' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Light', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dark', exact: true })).toBeVisible()
  })

  test('clicking Dark applies dark theme', async ({ page }) => {
    await page.goto('/')
    await completeOnboarding(page)
    await page.getByRole('button', { name: 'Settings' }).click()

    await page.getByRole('button', { name: 'Dark', exact: true }).click()
    await page.waitForTimeout(500)

    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDark).toBe(true)
  })

  test('clicking Light removes dark theme', async ({ page }) => {
    await page.goto('/')
    await completeOnboarding(page)
    await page.getByRole('button', { name: 'Settings' }).click()

    await page.getByRole('button', { name: 'Dark', exact: true }).click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Light', exact: true }).click()
    await page.waitForTimeout(500)

    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDark).toBe(false)
  })
})
