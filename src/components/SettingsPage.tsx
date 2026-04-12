import type { UserSettings } from '../types.ts'
import { exportAllData } from '../lib/export.ts'

export interface SettingsPageProps {
  settings: UserSettings
  onUpdate: (partial: Partial<UserSettings>) => void
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
      {children}
    </h2>
  )
}

function ToggleButton({
  label,
  pressed,
  disabled,
  onClick,
}: {
  label: string
  pressed: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      class={`min-h-[48px] px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        pressed
          ? 'bg-blue-600 text-white'
          : 'bg-gray-200 text-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {label}
    </button>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function SettingsPage({ settings, onUpdate }: SettingsPageProps) {
  const { clefs, accidentals, noteRange, sessionSize, newCardsPerDay } = settings

  const bothClefsOn = clefs.treble && clefs.bass

  function handleClefToggle(clef: 'treble' | 'bass') {
    // Guard: don't allow disabling the only enabled clef
    if (clefs[clef] && !bothClefsOn) return
    const newClefs = { ...clefs, [clef]: !clefs[clef] }
    onUpdate({ clefs: newClefs })
  }

  function handleAccidentalToggle(type: 'sharps' | 'flats') {
    const newAccidentals = { ...accidentals, [type]: !accidentals[type] }
    onUpdate({ accidentals: newAccidentals })
  }

  function handleRangePreset(low: string, high: string) {
    onUpdate({ noteRange: { low, high } })
  }

  function handleSessionSize(value: string) {
    const num = clamp(parseInt(value, 10) || 5, 5, 100)
    onUpdate({ sessionSize: num })
  }

  function handleNewCardsPerDay(value: string) {
    const num = clamp(parseInt(value, 10) || 1, 1, 50)
    onUpdate({ newCardsPerDay: num })
  }

  return (
    <div class="space-y-6">
      {/* Clefs */}
      <section>
        <SectionHeading>Clefs</SectionHeading>
        <div class="flex gap-3">
          <ToggleButton
            label="Treble Clef"
            pressed={clefs.treble}
            disabled={clefs.treble && !bothClefsOn}
            onClick={() => handleClefToggle('treble')}
          />
          <ToggleButton
            label="Bass Clef"
            pressed={clefs.bass}
            disabled={clefs.bass && !bothClefsOn}
            onClick={() => handleClefToggle('bass')}
          />
        </div>
      </section>

      {/* Accidentals */}
      <section>
        <SectionHeading>Accidentals</SectionHeading>
        <div class="flex gap-3">
          <ToggleButton
            label="Sharps (♯)"
            pressed={accidentals.sharps}
            onClick={() => handleAccidentalToggle('sharps')}
          />
          <ToggleButton
            label="Flats (♭)"
            pressed={accidentals.flats}
            onClick={() => handleAccidentalToggle('flats')}
          />
        </div>
      </section>

      {/* Note Range */}
      <section>
        <SectionHeading>Note Range</SectionHeading>
        <p class="text-lg font-semibold mb-3">
          {noteRange.low} – {noteRange.high}
        </p>
        <div class="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => handleRangePreset('E4', 'F5')}
            class={`min-h-[48px] px-4 py-2 rounded-lg text-sm font-medium border ${
              noteRange.low === 'E4' && noteRange.high === 'F5'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-700'
            }`}
          >
            One Octave
          </button>
          <button
            type="button"
            onClick={() => handleRangePreset('C3', 'C5')}
            class={`min-h-[48px] px-4 py-2 rounded-lg text-sm font-medium border ${
              noteRange.low === 'C3' && noteRange.high === 'C5'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-700'
            }`}
          >
            Two Octaves
          </button>
          <button
            type="button"
            onClick={() => handleRangePreset('A0', 'C8')}
            class={`min-h-[48px] px-4 py-2 rounded-lg text-sm font-medium border ${
              noteRange.low === 'A0' && noteRange.high === 'C8'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-700'
            }`}
          >
            Full Range
          </button>
        </div>
      </section>

      {/* Session */}
      <section>
        <SectionHeading>Session</SectionHeading>
        <div class="space-y-4">
          <div>
            <label for="new-cards-per-day" class="block text-sm text-gray-700 mb-1">
              New cards per day
            </label>
            <input
              id="new-cards-per-day"
              type="number"
              min={1}
              max={50}
              value={newCardsPerDay}
              onChange={(e) => handleNewCardsPerDay((e.target as HTMLInputElement).value)}
              class="min-h-[48px] w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
            />
          </div>
          <div>
            <label for="session-size" class="block text-sm text-gray-700 mb-1">
              Session size
            </label>
            <input
              id="session-size"
              type="number"
              min={5}
              max={100}
              value={sessionSize}
              onChange={(e) => handleSessionSize((e.target as HTMLInputElement).value)}
              class="min-h-[48px] w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
            />
          </div>
        </div>
      </section>

      {/* Data */}
      <section>
        <SectionHeading>Data</SectionHeading>
        <button
          type="button"
          onClick={() => exportAllData()}
          class="min-h-[48px] px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700"
        >
          Export Data
        </button>
      </section>
    </div>
  )
}
