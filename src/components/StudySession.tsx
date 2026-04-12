import { useEffect } from 'preact/hooks'
import { useStudySession } from '../hooks/useStudySession.ts'
import type { DbApi } from '../hooks/useStudySession.ts'
import type { UserSettings } from '../types.ts'
import { SheetMusicDisplay } from './SheetMusicDisplay.tsx'
import { NotePicker } from './NotePicker.tsx'
import { ResultFeedback } from './ResultFeedback.tsx'
import { SessionSummary } from './SessionSummary.tsx'
import { PianoKeyboard } from './PianoKeyboard.tsx'
import { parseNote, noteToMidi } from '../lib/music.ts'
import { playNote } from '../lib/synth.ts'

interface StudySessionProps {
  db: DbApi
  settings: UserSettings
  onSessionActive?: (active: boolean) => void
}

export function StudySession({ db, settings, onSessionActive }: StudySessionProps) {
  const { state, startSession, submitAnswer, skip, undoLastGrade, nextCard } = useStudySession(db, settings)

  // Auto-start session on mount
  useEffect(() => {
    if (state.phase === 'idle') {
      startSession()
    }
  }, [state.phase, startSession])

  // Notify parent about active session (to hide nav)
  useEffect(() => {
    const active = state.phase === 'showing_card' || state.phase === 'revealing'
    onSessionActive?.(active)
  }, [state.phase, onSessionActive])

  // Play audio + auto-advance after reveal
  useEffect(() => {
    if (state.phase === 'revealing' && state.currentCard) {
      try { playNote(noteToMidi(state.currentCard.note)) } catch { /* silent */ }
      const timer = setTimeout(() => {
        nextCard()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [state.phase, nextCard, state.currentCard])

  // Compute octave range from settings
  const lowOctave = parseNote(settings.noteRange.low).octave
  const highOctave = parseNote(settings.noteRange.high).octave
  const octaveRange: [number, number] = [lowOctave, highOctave]

  if (state.phase === 'loading') {
    return (
      <div class="flex items-center justify-center py-12">
        <p class="text-gray-500">Loading cards...</p>
      </div>
    )
  }

  if (state.phase === 'session_complete') {
    return (
      <SessionSummary
        reviewed={state.reviewed}
        correct={state.correct}
        onNewSession={startSession}
      />
    )
  }

  if (!state.currentCard) {
    return (
      <div class="flex items-center justify-center py-12">
        <p class="text-gray-500">No cards to study. Adjust your settings.</p>
      </div>
    )
  }

  const card = state.currentCard

  return (
    <div class="flex flex-col gap-4">
      {/* Card counter */}
      <div class="text-center text-sm text-gray-500">
        Card {state.reviewed + 1} · {state.correct}/{state.reviewed} correct
      </div>

      {/* Sheet music display */}
      <SheetMusicDisplay
        note={card.note}
        clef={card.clef}
        accidental={parseNote(card.note).accidental}
      />

      {/* Input or result */}
      {state.phase === 'showing_card' && (
        <div class="flex flex-col gap-3">
          <NotePicker
            onSubmit={submitAnswer}
            showAccidentals={settings.accidentals.sharps || settings.accidentals.flats}
            octaveRange={octaveRange}
          />
          <button
            type="button"
            class="w-full py-3 text-sm text-gray-500 underline"
            onClick={skip}
          >
            I don't know
          </button>
        </div>
      )}

      {state.phase === 'revealing' && state.lastRating !== null && (
        <div class="flex flex-col gap-3">
          <PianoKeyboard
            highlightNote={card.note}
            lowNote={settings.noteRange.low}
            highNote={settings.noteRange.high}
          />
          <ResultFeedback
            correct={state.lastCorrect ?? false}
            rating={state.lastRating}
            correctAnswer={card.note}
            userAnswer={state.lastAnswer ?? ''}
            onUndo={undoLastGrade}
          />
        </div>
      )}
    </div>
  )
}
