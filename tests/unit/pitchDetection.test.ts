import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  frequencyToMidi,
  frequencyToNoteName,
  detectPitch,
  MicrophoneInput,
} from '../../src/lib/pitchDetection'

// ============================================================
// Test helper: generate a pure sine wave
// ============================================================

function generateSineWave(frequency: number, sampleRate: number, duration: number): Float32Array {
  const samples = Math.floor(sampleRate * duration)
  const buffer = new Float32Array(samples)
  for (let i = 0; i < samples; i++) {
    buffer[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate)
  }
  return buffer
}

// ============================================================
// frequencyToMidi
// ============================================================

describe('frequencyToMidi', () => {
  it('converts 440 Hz to MIDI 69 (A4)', () => {
    expect(frequencyToMidi(440)).toBe(69)
  })

  it('converts 261.63 Hz to MIDI 60 (C4)', () => {
    expect(frequencyToMidi(261.63)).toBe(60)
  })

  it('converts 523.25 Hz to MIDI 72 (C5)', () => {
    expect(frequencyToMidi(523.25)).toBe(72)
  })

  it('converts 329.63 Hz to MIDI 64 (E4)', () => {
    expect(frequencyToMidi(329.63)).toBe(64)
  })
})

// ============================================================
// frequencyToNoteName
// ============================================================

describe('frequencyToNoteName', () => {
  it('converts 440 Hz to A4', () => {
    expect(frequencyToNoteName(440)).toBe('A4')
  })

  it('converts 261.63 Hz to C4', () => {
    expect(frequencyToNoteName(261.63)).toBe('C4')
  })

  it('converts 523.25 Hz to C5', () => {
    expect(frequencyToNoteName(523.25)).toBe('C5')
  })
})

// ============================================================
// detectPitch
// ============================================================

describe('detectPitch', () => {
  const sampleRate = 44100

  it('returns null for silence (all zeros)', () => {
    const silence = new Float32Array(4096)
    expect(detectPitch(silence, sampleRate)).toBeNull()
  })

  it('detects a 440 Hz sine wave within 5 Hz', () => {
    const buffer = generateSineWave(440, sampleRate, 0.1)
    const result = detectPitch(buffer, sampleRate)
    expect(result).not.toBeNull()
    expect(Math.abs(result! - 440)).toBeLessThan(5)
  })

  it('detects a 261.63 Hz sine wave within 5 Hz', () => {
    const buffer = generateSineWave(261.63, sampleRate, 0.1)
    const result = detectPitch(buffer, sampleRate)
    expect(result).not.toBeNull()
    expect(Math.abs(result! - 261.63)).toBeLessThan(5)
  })
})

// ============================================================
// MicrophoneInput
// ============================================================

describe('MicrophoneInput', () => {
  let mockAnalyser: {
    fftSize: number
    getFloatTimeDomainData: ReturnType<typeof vi.fn>
    connect: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
  }
  let mockSource: { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }
  let mockContext: {
    createAnalyser: ReturnType<typeof vi.fn>
    createMediaStreamSource: ReturnType<typeof vi.fn>
    sampleRate: number
    close: ReturnType<typeof vi.fn>
  }
  let mockTrackStop: ReturnType<typeof vi.fn>
  let mockStream: { getTracks: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockAnalyser = {
      fftSize: 0,
      getFloatTimeDomainData: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
    mockSource = { connect: vi.fn(), disconnect: vi.fn() }
    mockContext = {
      createAnalyser: vi.fn(() => mockAnalyser),
      createMediaStreamSource: vi.fn(() => mockSource),
      sampleRate: 44100,
      close: vi.fn(),
    }
    vi.stubGlobal('AudioContext', function () { return mockContext })

    mockTrackStop = vi.fn()
    mockStream = { getTracks: vi.fn(() => [{ stop: mockTrackStop }]) }
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('isActive() returns false before start', () => {
    const mic = new MicrophoneInput()
    expect(mic.isActive()).toBe(false)
  })

  it('start() calls getUserMedia with audio', async () => {
    const mic = new MicrophoneInput()
    await mic.start()
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
  })

  it('isActive() returns true after start', async () => {
    const mic = new MicrophoneInput()
    await mic.start()
    expect(mic.isActive()).toBe(true)
  })

  it('stop() stops stream tracks and closes context', async () => {
    const mic = new MicrophoneInput()
    await mic.start()
    mic.stop()
    expect(mockTrackStop).toHaveBeenCalled()
    expect(mockSource.disconnect).toHaveBeenCalled()
    expect(mockContext.close).toHaveBeenCalled()
  })

  it('isActive() returns false after stop', async () => {
    const mic = new MicrophoneInput()
    await mic.start()
    mic.stop()
    expect(mic.isActive()).toBe(false)
  })

  it('getCurrentNote() returns null when not active', () => {
    const mic = new MicrophoneInput()
    expect(mic.getCurrentNote()).toBeNull()
  })
})
