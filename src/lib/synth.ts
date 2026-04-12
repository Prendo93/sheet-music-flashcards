let ctx: AudioContext | null = null

/** Ensure AudioContext is created and running (call on user gesture) */
export function ensureAudioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
  }
  if (ctx.state === 'suspended') {
    ctx.resume()
  }
  return ctx
}

/** Convert MIDI note number to frequency: 440 * 2^((midi - 69) / 12) */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** Play a synthesized note using a triangle oscillator with natural decay */
export async function playNote(midi: number, durationMs = 500): Promise<void> {
  try {
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.value = midiToFrequency(midi)

    gain.gain.setValueAtTime(0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + durationMs / 1000)
  } catch {
    // Audio is an enhancement — silent failure
  }
}

/** Check if audio is available/enabled */
export function isAudioReady(): boolean {
  return ctx !== null
}
