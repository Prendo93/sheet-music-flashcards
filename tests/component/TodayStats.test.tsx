import { render, screen, cleanup } from '@testing-library/preact'
import { describe, it, expect, afterEach } from 'vitest'
import { TodayStats } from '../../src/components/TodayStats.tsx'

describe('TodayStats', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders streak, reviewed count, and accuracy', () => {
    render(<TodayStats streak={3} reviewedToday={12} accuracyToday={85} />)
    expect(screen.getByText(/3/)).toBeInTheDocument()
    expect(screen.getByText(/12/)).toBeInTheDocument()
    expect(screen.getByText(/85%/)).toBeInTheDocument()
  })

  it('returns null when streak is 0 and reviewedToday is 0', () => {
    const { container } = render(<TodayStats streak={0} reviewedToday={0} accuracyToday={0} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows 0% accuracy when reviewed but none correct', () => {
    render(<TodayStats streak={0} reviewedToday={5} accuracyToday={0} />)
    expect(screen.getByText(/0%/)).toBeInTheDocument()
    expect(screen.getByText(/5/)).toBeInTheDocument()
  })

  it('shows 100% accuracy when all correct', () => {
    render(<TodayStats streak={1} reviewedToday={10} accuracyToday={100} />)
    expect(screen.getByText(/100%/)).toBeInTheDocument()
  })

  it('renders with accessible text content', () => {
    render(<TodayStats streak={5} reviewedToday={20} accuracyToday={92} />)
    // The widget should contain text that communicates the stat values
    const widget = screen.getByText(/5/).closest('div')
    expect(widget).toBeInTheDocument()
    expect(screen.getByText(/20/)).toBeInTheDocument()
    expect(screen.getByText(/92%/)).toBeInTheDocument()
  })
})
