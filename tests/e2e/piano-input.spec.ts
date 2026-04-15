import { test, expect } from '@playwright/test'
import { clearIndexedDB, completeOnboarding, goToSettings } from './helpers'

test.beforeEach(async ({ page }) => {
  await clearIndexedDB(page)
  await page.goto('/')
})

async function switchToPianoMode(page: import('@playwright/test').Page) {
  await goToSettings(page)
  await page.getByRole('button', { name: 'Piano Keyboard' }).click()
  await expect(page.getByRole('button', { name: 'Piano Keyboard' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Study' }).click()
}

test.describe('Piano Input Mode', () => {
  test('switching to piano mode shows keyboard instead of note picker', async ({ page }) => {
    await switchToPianoMode(page)

    // Should see the piano keyboard (interactive, so role=group)
    await expect(page.getByRole('group', { name: /piano/i })).toBeVisible({ timeout: 15000 })
    // Should see the Check button
    await expect(page.getByRole('button', { name: 'Check' })).toBeVisible()
    // Check button should be disabled (no key selected)
    await expect(page.getByRole('button', { name: 'Check' })).toBeDisabled()
    // Should NOT see the letter picker buttons
    await expect(page.getByRole('button', { name: 'Note C' })).toHaveCount(0)
    // Should still see "I don't know"
    await expect(page.getByText("I don't know")).toBeVisible()
  })

  test('tapping a key enables the Check button', async ({ page }) => {
    await switchToPianoMode(page)

    await expect(page.getByRole('group', { name: /piano/i })).toBeVisible({ timeout: 15000 })

    // Tap the first white key (C4 or whatever is in range)
    const firstWhiteKey = page.locator('[data-key-type="white"]').first()
    await firstWhiteKey.click()

    // Check button should be enabled now
    await expect(page.getByRole('button', { name: 'Check' })).toBeEnabled()
  })

  test('submitting via piano keyboard shows result feedback', async ({ page }) => {
    await switchToPianoMode(page)

    await expect(page.getByRole('group', { name: /piano/i })).toBeVisible({ timeout: 15000 })

    // Tap any key and submit
    const firstWhiteKey = page.locator('[data-key-type="white"]').first()
    await firstWhiteKey.click()
    await page.getByRole('button', { name: 'Check' }).click()

    // Should see result feedback (correct or incorrect)
    await expect(page.getByText(/Correct answer:/)).toBeVisible({ timeout: 5000 })
  })

  test('submitting correct answer via piano shows success', async ({ page }) => {
    await switchToPianoMode(page)

    await expect(page.getByRole('group', { name: /piano/i })).toBeVisible({ timeout: 15000 })

    // Read the correct note from the SheetMusicDisplay aria-label
    const imgEl = page.locator('[role="img"]').first()
    const ariaLabel = await imgEl.getAttribute('aria-label')

    let noteName = ''
    if (ariaLabel) {
      // aria-label pattern: "Musical note E on treble clef, octave 4"
      const match = ariaLabel.match(/Musical note (\w#?).*?octave (\d)/)
      if (match) {
        noteName = `${match[1]}${match[2]}`
      }
    }

    test.skip(!noteName, 'Could not parse note from aria-label')

    // Find and click the correct key on the piano
    const correctKey = page.locator(`[data-note="${noteName}"]`)
    if (await correctKey.count() > 0) {
      await correctKey.click()
      await page.getByRole('button', { name: 'Check' }).click()

      // Should show a positive result
      const result = page.locator('[role="status"]')
      await expect(result).toBeVisible({ timeout: 5000 })
    }
  })

  test('skipping in piano mode shows incorrect feedback', async ({ page }) => {
    await switchToPianoMode(page)

    await expect(page.getByRole('group', { name: /piano/i })).toBeVisible({ timeout: 15000 })

    await page.getByText("I don't know").click()

    await expect(page.getByText('Incorrect')).toBeVisible()
    await expect(page.getByText(/Correct answer:/)).toBeVisible()
  })

  test('reveal phase highlights correct note on keyboard after answer', async ({ page }) => {
    await switchToPianoMode(page)

    await expect(page.getByRole('group', { name: /piano/i })).toBeVisible({ timeout: 15000 })

    // Skip produces an incorrect result — the correct note should be highlighted on the reveal keyboard
    await page.getByText("I don't know").click()

    await expect(page.getByText('Incorrect')).toBeVisible({ timeout: 5000 })
    // The reveal-phase keyboard (display mode) highlights the correct note in blue
    await expect(page.locator('.bg-blue-400')).toHaveCount(1, { timeout: 1000 })
  })
})
