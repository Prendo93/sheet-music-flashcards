import { test, expect } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  await context.clearCookies()
  await context.clearPermissions()
})

test.describe('Settings', () => {
  test('can navigate to settings and see controls', async ({ page }) => {
    await page.goto('/')

    // Wait for the app to fully load and stabilize
    await expect(page.getByText('Sheet Music Flashcards')).toBeVisible({ timeout: 15000 })

    // The nav might be hidden during initial session load — wait for Settings button
    // to be stable (not detaching due to re-renders)
    await page.waitForTimeout(2000)

    await page.getByRole('button', { name: 'Settings' }).click({ timeout: 10000 })

    // Should see settings sections
    await expect(page.getByText('Clefs')).toBeVisible()
    await expect(page.getByText('Accidentals')).toBeVisible()
    await expect(page.getByText('Note Range')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Session' })).toBeVisible()

    // Should see toggle buttons
    await expect(page.getByRole('button', { name: 'Treble Clef' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Bass Clef' })).toBeVisible()
    await expect(page.getByText('Sharps (♯)')).toBeVisible()
    await expect(page.getByText('Flats (♭)')).toBeVisible()

    // Default range
    await expect(page.getByText('E4 – F5')).toBeVisible()

    // Preset buttons
    await expect(page.getByRole('button', { name: 'One Octave' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Two Octaves' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Full Range' })).toBeVisible()
  })

  test('enabling bass clef produces bass clef cards in study', { timeout: 120000 }, async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Sheet Music Flashcards')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2000)

    // Go to settings
    await page.getByRole('button', { name: 'Settings' }).click({ timeout: 10000 })
    await expect(page.getByText('Clefs')).toBeVisible()

    // Enable bass clef
    await page.getByRole('button', { name: 'Bass Clef' }).click()
    await expect(page.getByRole('button', { name: 'Bass Clef' })).toHaveAttribute('aria-pressed', 'true')

    // Switch to Two Octaves so we get bass-range notes
    await page.getByRole('button', { name: 'Two Octaves' }).click()
    await expect(page.getByText('C3 – C5')).toBeVisible()

    // Go back to study
    await page.getByRole('button', { name: 'Study' }).click()

    // Wait for cards to load
    await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible({ timeout: 15000 })

    // Go through cards looking for a bass clef card
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

      // Skip to next card
      const skipBtn = page.getByText("I don't know")
      if (await skipBtn.isVisible().catch(() => false)) {
        await skipBtn.click()
        // Wait for auto-advance
        await page.waitForTimeout(4500)
      } else {
        break
      }
    }

    expect(foundBass).toBe(true)
  })

  test('enabling accidentals shows accidental picker buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Sheet Music Flashcards')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2000)

    // Go to settings and enable sharps
    await page.getByRole('button', { name: 'Settings' }).click({ timeout: 10000 })
    await expect(page.getByText('Sharps (♯)')).toBeVisible()
    await page.getByText('Sharps (♯)').click()

    // Go back to study
    await page.getByRole('button', { name: 'Study' }).click()

    // Wait for study to reload
    await expect(page.getByRole('button', { name: 'Submit answer' })).toBeVisible({ timeout: 15000 })

    // Now the accidental row should be visible
    await expect(page.getByRole('button', { name: 'Natural' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sharp' })).toBeVisible()
  })

  test('changing range preset updates displayed range', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Sheet Music Flashcards')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2000)

    await page.getByRole('button', { name: 'Settings' }).click({ timeout: 10000 })
    await expect(page.getByText('E4 – F5')).toBeVisible()

    await page.getByRole('button', { name: 'Two Octaves' }).click()
    await expect(page.getByText('C3 – C5')).toBeVisible()

    await page.getByRole('button', { name: 'Full Range' }).click()
    await expect(page.getByText('A0 – C8')).toBeVisible()

    await page.getByRole('button', { name: 'One Octave' }).click()
    await expect(page.getByText('E4 – F5')).toBeVisible()
  })
})
