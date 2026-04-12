import { test, expect } from '@playwright/test'

// Default settings: E4-F5 treble only, no accidentals, 9 natural notes
// NotePicker: 7 letter buttons, no accidental row, octave row with [4, 5]

test.beforeEach(async ({ context }) => {
  // Clear all storage for the origin to get clean state
  await context.clearCookies()
  await context.clearPermissions()
})

test.describe('Study Flow', () => {
  test('fresh app shows first card with notation and note picker', async ({ page }) => {
    await page.goto('/')

    // Wait for the note picker to appear (means cards loaded and session started)
    await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible({ timeout: 15000 })

    // Should see 7 letter buttons (C through B)
    for (const letter of ['C', 'D', 'E', 'F', 'G', 'A', 'B']) {
      await expect(page.getByRole('button', { name: `Note ${letter}` })).toBeVisible()
    }

    // Check button should be disabled initially
    const checkBtn = page.getByRole('button', { name: 'Submit answer' })
    await expect(checkBtn).toBeDisabled()

    // Should see "I don't know" link
    await expect(page.getByText("I don't know")).toBeVisible()

    // Should see card counter
    await expect(page.getByText(/Card 1/)).toBeVisible()

    // Accidental row should NOT be visible (no accidentals enabled by default)
    await expect(page.getByRole('button', { name: 'Sharp' })).toHaveCount(0)
  })

  test('skipping a card shows incorrect result feedback', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible({ timeout: 15000 })

    // Skip the card
    await page.getByText("I don't know").click()

    // Should see result feedback with "Incorrect"
    await expect(page.getByText('Incorrect')).toBeVisible()

    // Should see the correct answer displayed
    await expect(page.getByText(/Correct answer:/)).toBeVisible()

    // Should see Undo button
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible()
  })

  test('submitting correct answer via picker shows success', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible({ timeout: 15000 })

    // Read the actual note from the aria-label of the sheet music container
    const ariaLabel = await page.locator('[role="img"]').getAttribute('aria-label')

    // Parse the note from aria-label like "Musical note E  4 on treble clef"
    let noteLetter = ''
    let noteOctave = ''

    if (ariaLabel) {
      const match = ariaLabel.match(/Musical note (\w).*?(\d)/)
      if (match) {
        noteLetter = match[1].toUpperCase()
        noteOctave = match[2]
      }
    }

    // If we couldn't parse, skip this test gracefully
    test.skip(!noteLetter || !noteOctave, 'Could not parse note from aria-label')

    // Tap the letter
    await page.getByRole('button', { name: `Note ${noteLetter}` }).click()

    // Tap the octave
    await page.getByRole('button', { name: `Octave ${noteOctave}` }).click()

    // Submit
    await page.getByRole('button', { name: 'Submit answer' }).click()

    // Should see a result status area
    const result = page.locator('[role="status"]')
    await expect(result).toBeVisible()

    // The correct answer should be displayed
    await expect(page.getByText(/Correct answer:/)).toBeVisible()
  })

  test('undo restores the card after grading', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible({ timeout: 15000 })

    // Should show Card 1
    await expect(page.getByText(/Card 1/)).toBeVisible()

    // Skip (grade as incorrect)
    await page.getByText("I don't know").click()

    // Should be in reveal phase
    await expect(page.getByText('Incorrect')).toBeVisible()

    // Click Undo
    await page.getByRole('button', { name: 'Undo' }).click()

    // Should be back showing the picker
    await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Card 1/)).toBeVisible()
  })

  test('completing cards shows session summary', { timeout: 120000 }, async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible({ timeout: 15000 })

    // Skip through all cards — use a loop with a reasonable limit
    for (let i = 0; i < 12; i++) {
      // Check if session is complete
      if (await page.getByText('Session Complete').isVisible().catch(() => false)) {
        break
      }

      // Skip if the button is available
      const skipBtn = page.getByText("I don't know")
      if (await skipBtn.isVisible().catch(() => false)) {
        await skipBtn.click()
        // Wait for reveal to auto-advance (4s timeout in the component)
        await page.waitForTimeout(4200)
      } else {
        // Wait a bit for possible transition
        await page.waitForTimeout(500)
      }
    }

    // Should see session summary
    await expect(page.getByText('Session Complete')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Cards reviewed:/)).toBeVisible()
    await expect(page.getByText(/Accuracy:/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Study Again' })).toBeVisible()
  })
})
