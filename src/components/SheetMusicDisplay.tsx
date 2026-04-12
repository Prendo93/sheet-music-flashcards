import { useRef, useEffect, useState } from 'preact/hooks'
import { memo } from 'preact/compat'
import type { Clef, Accidental } from '../types.ts'

interface SheetMusicDisplayProps {
  note: string
  clef: Clef
  accidental?: Accidental
}

// Lazy-load VexFlow to keep initial bundle small
let vexflowPromise: Promise<typeof import('vexflow')> | null = null

function loadVexFlow() {
  if (!vexflowPromise) {
    vexflowPromise = import('vexflow')
  }
  return vexflowPromise
}

function SheetMusicDisplayInner({ note, clef, accidental }: SheetMusicDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false

    loadVexFlow()
      .then((VexFlow) => {
        if (cancelled || !containerRef.current) return

        // Clear previous render
        containerRef.current.replaceChildren()
        setError(null)

        try {
          const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental: VFAccidental } = VexFlow

          const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG)
          renderer.resize(450, 200)
          const context = renderer.getContext()

          // Create stave
          const stave = new Stave(10, 40, 430)
          stave.addClef(clef)
          stave.setContext(context).draw()

          // Create note — VexFlow format: "c#/5" from "C#5"
          const vfKey = note.toLowerCase().replace(/(\d)/, '/$1')
          const staveNote = new StaveNote({
            clef,
            keys: [vfKey],
            duration: 'w',
          })

          // Add accidental modifier if present
          if (accidental === '#') {
            staveNote.addModifier(new VFAccidental('#'))
          } else if (accidental === 'b') {
            staveNote.addModifier(new VFAccidental('b'))
          }

          // Format and draw
          const voice = new Voice({ numBeats: 4, beatValue: 4 })
          voice.addTickables([staveNote])
          new Formatter().joinVoices([voice]).format([voice], 350)
          voice.draw(context, stave)

          // Make SVG responsive
          const svg = containerRef.current.querySelector('svg')
          if (svg) {
            svg.removeAttribute('width')
            svg.removeAttribute('height')
            svg.setAttribute('viewBox', '0 0 450 200')
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
            svg.style.width = '100%'
            svg.style.height = 'auto'
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to render notation')
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load VexFlow')
        }
      })

    return () => {
      cancelled = true
      container.replaceChildren()
    }
  }, [note, clef, accidental])

  // Build aria-label
  const accidentalName = accidental === '#' ? ' sharp' : accidental === 'b' ? ' flat' : ''
  const ariaLabel = `Musical note ${note[0].toUpperCase()}${accidentalName} ${note.replace(/[^0-9]/g, '')} on ${clef} clef`

  if (error) {
    return (
      <div class="w-full max-w-[400px] mx-auto p-4 text-center text-incorrect" role="alert">
        Could not render notation. {error}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      class="w-full max-w-[400px] mx-auto"
      style={{ aspectRatio: '9/4' }}
      role="img"
      aria-label={ariaLabel}
    />
  )
}

export const SheetMusicDisplay = memo(SheetMusicDisplayInner)
