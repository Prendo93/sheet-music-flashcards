import { test, expect } from '@playwright/test'
import { clearIndexedDB, completeOnboarding, goToSettings } from './helpers'

test.beforeEach(async ({ page }) => {
  await clearIndexedDB(page)
  await page.goto('/')
})

test.describe('Settings', () => {
  test('can navigate to settings and see controls', async ({ page }) => {
    await goToSettings(page)

    await expect(page.getByText('Clefs')).toBeVisible()
    await expect(page.getByText('Accidentals')).toBeVisible()
    await expect(page.getByText('Note Range')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Session' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Treble Clef' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Bass Clef' })).toBeVisible()
    await expect(page.getByText('Sharps (♯)')).toBeVisible()
    await expect(page.getByText('Flats (♭)')).toBeVisible()
    await expect(page.getByText('E4 – F5')).toBeVisible()
    await expect(page.getByRole('button', { name: 'One Octave' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Two Octaves' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Full Range' })).toBeVisible()
  })

  test('enabling bass clef produces bass clef cards in study', { timeout: 120000 }, async ({ page }) => {
    await goToSettings(page)

    await page.getByRole('button', { name: 'Bass Clef' }).click()
    await expect(page.getByRole('button', { name: 'Bass Clef' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Two Octaves' }).click()
    await expect(page.getByText('C3 – C5')).toBeVisible()

    await page.getByRole('button', { name: 'Study' }).click()
    await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible({ timeout: 15000 })

    let foundBass = false
    for (let i = 0; i < 15; i++) {
      const imgEl = page.locator('[role="img"]')
      if (await imgEl.count() > 0) {
        const ariaLabel = await imgEl.first().getAttribute('aria-label', { timeout: 2000 })
        if (ariaLabel && ariaLabel.includes('bass')) {
          foundBass = true
          break
        }
      }

      const skipBtn = page.getByText("I don't know")
      if (await skipBtn.isVisible().catch(() => false)) {
        await skipBtn.click()
        await page.waitForTimeout(2200)
      } else {
        break
      }
    }

    expect(foundBass).toBe(true)
  })

  test('enabling accidentals shows accidental picker buttons', async ({ page }) => {
    await goToSettings(page)

    await expect(page.getByText('Sharps (♯)')).toBeVisible()
    await page.getByText('Sharps (♯)').click()

    await page.getByRole('button', { name: 'Study' }).click()
    await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible({ timeout: 15000 })

    await expect(page.getByRole('button', { name: 'Natural' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sharp' })).toBeVisible()
  })

  test('changing range preset updates displayed range', async ({ page }) => {
    await goToSettings(page)

    await expect(page.getByText('E4 – F5')).toBeVisible()

    await page.getByRole('button', { name: 'Two Octaves' }).click()
    await expect(page.getByText('C3 – C5')).toBeVisible()

    await page.getByRole('button', { name: 'Full Range' }).click()
    await expect(page.getByText('A0 – C8')).toBeVisible()

    await page.getByRole('button', { name: 'One Octave' }).click()
    await expect(page.getByText('E4 – F5')).toBeVisible()
  })

  test('export data button is visible in settings', async ({ page }) => {
    await goToSettings(page)

    await expect(page.getByRole('button', { name: 'Export Data' })).toBeVisible()
  })
})
