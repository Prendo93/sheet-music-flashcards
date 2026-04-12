import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/preact'
import { SettingsPage } from '../../src/components/SettingsPage.tsx'
import { DEFAULT_SETTINGS } from '../../src/types.ts'
import type { UserSettings } from '../../src/types.ts'
import { App } from '../../src/app.tsx'

// Mock matchMedia before anything else
const matchMediaListeners: Array<(e: { matches: boolean }) => void> = []
let matchMediaMatches = false

beforeEach(() => {
  matchMediaListeners.length = 0
  matchMediaMatches = false
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matchMediaMatches,
      media: query,
      addEventListener: vi.fn((_, handler) => {
        matchMediaListeners.push(handler)
      }),
      removeEventListener: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  // Clear dark class before each test
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
})

function makeSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    ...DEFAULT_SETTINGS,
    updated_at: new Date('2025-01-01'),
    ...overrides,
  }
}

// Mock the db module to avoid IndexedDB issues in these tests
vi.mock('../../src/lib/db.ts', () => ({
  getCard: vi.fn().mockResolvedValue(null),
  putCard: vi.fn().mockResolvedValue(undefined),
  getCardsDue: vi.fn().mockResolvedValue([]),
  getCardsByState: vi.fn().mockResolvedValue([]),
  addReviewLog: vi.fn().mockResolvedValue(undefined),
  putCards: vi.fn().mockResolvedValue(undefined),
  requestPersistentStorage: vi.fn().mockResolvedValue(undefined),
}))

// Mock useSettings to control settings directly
vi.mock('../../src/hooks/useSettings.ts', () => ({
  useSettings: vi.fn(),
}))

import { useSettings } from '../../src/hooks/useSettings.ts'
const mockUseSettings = vi.mocked(useSettings)

describe('Dark Mode', () => {
  describe('Theme class on document.documentElement', () => {
    it("theme 'dark' adds 'dark' class to document.documentElement", async () => {
      const settings = makeSettings({ theme: 'dark' })
      mockUseSettings.mockReturnValue({
        settings,
        updateSettings: vi.fn(),
        loading: false,
      })

      render(<App />)

      // Wait for useEffect to fire
      await vi.waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
      })
    })

    it("theme 'light' removes 'dark' class", async () => {
      // Pre-add dark class
      document.documentElement.classList.add('dark')

      const settings = makeSettings({ theme: 'light' })
      mockUseSettings.mockReturnValue({
        settings,
        updateSettings: vi.fn(),
        loading: false,
      })

      render(<App />)

      await vi.waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false)
      })
    })

    it("theme 'system' with dark preference adds 'dark' class", async () => {
      matchMediaMatches = true

      const settings = makeSettings({ theme: 'system' })
      mockUseSettings.mockReturnValue({
        settings,
        updateSettings: vi.fn(),
        loading: false,
      })

      render(<App />)

      await vi.waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
      })
    })

    it("theme 'system' with light preference removes 'dark' class", async () => {
      matchMediaMatches = false
      document.documentElement.classList.add('dark')

      const settings = makeSettings({ theme: 'system' })
      mockUseSettings.mockReturnValue({
        settings,
        updateSettings: vi.fn(),
        loading: false,
      })

      render(<App />)

      await vi.waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false)
      })
    })
  })

  describe('SettingsPage theme controls', () => {
    it('renders theme toggle buttons (System, Light, Dark)', () => {
      const settings = makeSettings({ theme: 'system' })
      render(<SettingsPage settings={settings} onUpdate={vi.fn()} />)

      expect(screen.getByRole('button', { name: /system/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^light$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^dark$/i })).toBeInTheDocument()
    })

    it("clicking Dark button calls onUpdate with theme: 'dark'", () => {
      const onUpdate = vi.fn()
      const settings = makeSettings({ theme: 'system' })
      render(<SettingsPage settings={settings} onUpdate={onUpdate} />)

      fireEvent.click(screen.getByRole('button', { name: /^dark$/i }))

      expect(onUpdate).toHaveBeenCalledWith({ theme: 'dark' })
    })

    it("clicking Light button calls onUpdate with theme: 'light'", () => {
      const onUpdate = vi.fn()
      const settings = makeSettings({ theme: 'dark' })
      render(<SettingsPage settings={settings} onUpdate={onUpdate} />)

      fireEvent.click(screen.getByRole('button', { name: /^light$/i }))

      expect(onUpdate).toHaveBeenCalledWith({ theme: 'light' })
    })

    it("active theme button is visually highlighted", () => {
      const settings = makeSettings({ theme: 'dark' })
      render(<SettingsPage settings={settings} onUpdate={vi.fn()} />)

      const darkBtn = screen.getByRole('button', { name: /^dark$/i })
      expect(darkBtn).toHaveAttribute('aria-pressed', 'true')

      const lightBtn = screen.getByRole('button', { name: /^light$/i })
      expect(lightBtn).toHaveAttribute('aria-pressed', 'false')
    })
  })
})
