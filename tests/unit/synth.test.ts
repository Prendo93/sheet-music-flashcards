import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ensureAudioContext,
  midiToFrequency,
  playNote,
  isAudioReady,
} from '../../src/lib/synth'

// --- Web Audio API mocks ---
function createMockOscillator() {
  return {
    type: '' as OscillatorType,
    frequency: { value: 0 },
    connect: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
  }
}

function createMockGain() {
  return {
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn().mockReturnThis(),
  }
}

let mockOscillator: ReturnType<typeof createMockOscillator>
let mockGain: ReturnType<typeof createMockGain>
let mockContext: {
  createOscillator: ReturnType<typeof vi.fn>
  createGain: ReturnType<typeof vi.fn>
  destination: Record<string, never>
  currentTime: number
  state: string
  resume: ReturnType<typeof vi.fn>
}

describe('synth', () => {
  beforeEach(() => {
    mockOscillator = createMockOscillator()
    mockGain = createMockGain()
    mockContext = {
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain),
      destination: {},
      currentTime: 0,
      state: 'running',
      resume: vi.fn().mockResolvedValue(undefined),
    }
    globalThis.AudioContext = vi.fn(function (this: typeof mockContext) {
      Object.assign(this, mockContext)
      return this
    }) as unknown as typeof AudioContext

    // Reset the module to clear singleton state between tests
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('midiToFrequency', () => {
    it('returns 440 for MIDI note 69 (A4)', () => {
      expect(midiToFrequency(69)).toBe(440)
    })

    it('returns approximately 261.63 for MIDI note 60 (C4)', () => {
      expect(midiToFrequency(60)).toBeCloseTo(261.63, 1)
    })

    it('returns approximately 523.25 for MIDI note 72 (C5)', () => {
      expect(midiToFrequency(72)).toBeCloseTo(523.25, 1)
    })
  })

  describe('ensureAudioContext', () => {
    it('creates AudioContext on first call', async () => {
      const { ensureAudioContext } = await import('../../src/lib/synth')
      ensureAudioContext()
      expect(globalThis.AudioContext).toHaveBeenCalledTimes(1)
    })

    it('returns the same instance on second call', async () => {
      const { ensureAudioContext } = await import('../../src/lib/synth')
      const ctx1 = ensureAudioContext()
      const ctx2 = ensureAudioContext()
      expect(ctx1).toBe(ctx2)
      expect(globalThis.AudioContext).toHaveBeenCalledTimes(1)
    })

    it('calls resume() if context is suspended', async () => {
      mockContext.state = 'suspended'
      const { ensureAudioContext } = await import('../../src/lib/synth')
      ensureAudioContext()
      expect(mockContext.resume).toHaveBeenCalled()
    })
  })

  describe('playNote', () => {
    it('creates oscillator with triangle type', async () => {
      const { ensureAudioContext, playNote } = await import('../../src/lib/synth')
      ensureAudioContext()
      await playNote(69)
      expect(mockOscillator.type).toBe('triangle')
    })

    it('sets correct frequency for the MIDI note', async () => {
      const { ensureAudioContext, playNote } = await import('../../src/lib/synth')
      ensureAudioContext()
      await playNote(69)
      expect(mockOscillator.frequency.value).toBe(440)
    })

    it('does not throw if AudioContext is unavailable', async () => {
      // Remove AudioContext entirely
      // @ts-expect-error intentionally deleting for test
      delete globalThis.AudioContext
      const { playNote } = await import('../../src/lib/synth')
      // Should resolve silently without throwing
      await expect(playNote(69)).resolves.toBeUndefined()
    })
  })

  describe('isAudioReady', () => {
    it('returns false before ensureAudioContext is called', async () => {
      const { isAudioReady } = await import('../../src/lib/synth')
      expect(isAudioReady()).toBe(false)
    })

    it('returns true after ensureAudioContext is called', async () => {
      const { ensureAudioContext, isAudioReady } = await import('../../src/lib/synth')
      ensureAudioContext()
      expect(isAudioReady()).toBe(true)
    })
  })
})
