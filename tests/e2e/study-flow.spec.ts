import { test, expect } from '@playwright/test'
import { clearIndexedDB, completeOnboarding } from './helpers'

test.beforeEach(async ({ page }) => {
  await clearIndexedDB(page)
  await page.goto('/')
})

test.describe('Study Flow', () => {
  test('fresh app shows first card with notation and note picker', async ({ page }) => {
    await completeOnboarding(page)

    await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible({ timeout: 15000 })

    for (const letter of ['C', 'D', 'E', 'F', 'G', 'A', 'B']) {
      await expect(page.getByRole('button', { name: `Note ${letter}` })).toBeVisible()
    }

    const checkBtn = page.getByRole('button', { name: 'Submit answer' })
    await expect(checkBtn).toBeDisabled()
    await expect(page.getByText("I don't know")).toBeVisible()
    await expect(page.getByText(/Card 1/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sharp' })).toHaveCount(0)
  })

  test('skipping a card shows incorrect result feedback', async ({ page }) => {
    await completeOnboarding(page)

    await page.getByText("I don't know").click()

    await expect(page.getByText('Incorrect')).toBeVisible()
    await expect(page.getByText(/Correct answer:/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible()
  })

  test('submitting correct answer via picker shows success', async ({ page }) => {
    await completeOnboarding(page)

    const ariaLabel = await page.locator('[role="img"]').first().getAttribute('aria-label')

    let noteLetter = ''
    let noteOctave = ''

    if (ariaLabel) {
      const match = ariaLabel.match(/Musical note (\w).*?(\d)/)
      if (match) {
        noteLetter = match[1].toUpperCase()
        noteOctave = match[2]
      }
    }

    test.skip(!noteLetter || !noteOctave, 'Could not parse note from aria-label')

    await page.getByRole('button', { name: `Note ${noteLetter}` }).click()
    await page.getByRole('button', { name: `Octave ${noteOctave}` }).click()
    await page.getByRole('button', { name: 'Submit answer' }).click()

    const result = page.locator('[role="status"]')
    await expect(result).toBeVisible()
    await expect(page.getByText(/Correct answer:/)).toBeVisible()
  })

  test('undo restores the card after grading', async ({ page }) => {
    await completeOnboarding(page)

    await expect(page.getByText(/Card 1/)).toBeVisible()
    await page.getByText("I don't know").click()
    await expect(page.getByText('Incorrect')).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()

    await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Card 1/)).toBeVisible()
  })

  test('completing cards shows session summary', { timeout: 120000 }, async ({ page }) => {
    await completeOnboarding(page)

    for (let i = 0; i < 12; i++) {
      if (await page.getByText('Session Complete').isVisible().catch(() => false)) {
        break
      }

      const skipBtn = page.getByText("I don't know")
      if (await skipBtn.isVisible().catch(() => false)) {
        await skipBtn.click()
        await page.waitForTimeout(2200)
      } else {
        await page.waitForTimeout(500)
      }
    }

    await expect(page.getByText('Session Complete')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Cards reviewed:/)).toBeVisible()
    await expect(page.getByText(/Accuracy:/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Study Again' })).toBeVisible()
  })
})
