import { midiToNoteName } from './music'

// ============================================================
// Frequency → MIDI conversion
// ============================================================

/**
 * Convert a frequency in Hz to the nearest MIDI note number.
 * A4 (440 Hz) = MIDI 69.
 */
export function frequencyToMidi(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / 440))
}

// ============================================================
// Frequency → Note Name
// ============================================================

/**
 * Convert a frequency in Hz to a note name in scientific pitch notation.
 * Uses sharp names (e.g. C#4 not Db4).
 */
export function frequencyToNoteName(frequency: number): string {
  const midi = frequencyToMidi(frequency)
  return midiToNoteName(midi, true)
}

// ============================================================
// Autocorrelation-based pitch detection
// ============================================================

/**
 * Detect the fundamental frequency from audio samples using autocorrelation.
 *
 * @param buffer Float32Array of audio samples
 * @param sampleRate The sample rate in Hz (e.g. 44100)
 * @returns The detected frequency in Hz, or null if no clear pitch
 */
export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const n = buffer.length

  // Compute the autocorrelation for each lag
  // We only need lags corresponding to the piano range (~27.5 Hz to ~4186 Hz)
  // Max lag = sampleRate / minFreq, but we cap at half the buffer
  const maxLag = Math.floor(n / 2)

  // Step 1: compute autocorrelation values
  const correlation = new Float32Array(maxLag)
  for (let lag = 0; lag < maxLag; lag++) {
    let sum = 0
    for (let i = 0; i < n - lag; i++) {
      sum += buffer[i] * buffer[i + lag]
    }
    correlation[lag] = sum
  }

  // Normalize by the zero-lag (energy) value
  const energy = correlation[0]
  if (energy === 0) return null // silence

  for (let lag = 0; lag < maxLag; lag++) {
    correlation[lag] /= energy
  }

  // Step 2: Find the first positive-going zero crossing in the autocorrelation
  // (skip lag 0 which is always 1.0)
  let firstZeroCrossing = -1
  for (let lag = 1; lag < maxLag; lag++) {
    if (correlation[lag - 1] < 0 && correlation[lag] >= 0) {
      firstZeroCrossing = lag
      break
    }
  }

  if (firstZeroCrossing === -1) return null

  // Step 3: Find the peak after the zero crossing
  let peakLag = firstZeroCrossing
  let peakValue = correlation[firstZeroCrossing]

  for (let lag = firstZeroCrossing; lag < maxLag; lag++) {
    if (correlation[lag] > peakValue) {
      peakValue = correlation[lag]
      peakLag = lag
    } else if (correlation[lag] < peakValue) {
      // We've passed the peak — stop searching
      break
    }
  }

  // Step 4: Check if the correlation peak is strong enough
  if (peakValue < 0.5) return null

  return sampleRate / peakLag
}

// ============================================================
// Microphone Input Manager
// ============================================================

export class MicrophoneInput {
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | null = null

  /**
   * Request microphone permission and start capturing audio.
   */
  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.audioContext = new AudioContext()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 2048
    this.source = this.audioContext.createMediaStreamSource(this.stream)
    this.source.connect(this.analyser)
  }

  /**
   * Get the currently detected note name, or null if no clear pitch.
   */
  getCurrentNote(): string | null {
    if (!this.analyser || !this.audioContext) return null

    const buffer = new Float32Array(this.analyser.fftSize)
    this.analyser.getFloatTimeDomainData(buffer)

    const frequency = detectPitch(buffer, this.audioContext.sampleRate)
    if (frequency === null) return null

    return frequencyToNoteName(frequency)
  }

  /**
   * Stop capturing and release the microphone.
   */
  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
    }
    if (this.source) {
      this.source.disconnect()
    }
    if (this.audioContext) {
      this.audioContext.close()
    }
    this.stream = null
    this.audioContext = null
    this.analyser = null
    this.source = null
  }

  /**
   * Check if the microphone is currently active.
   */
  isActive(): boolean {
    return this.audioContext !== null
  }
}
