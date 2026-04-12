import type { ComponentChildren } from 'preact'
import { BottomNav } from './BottomNav.tsx'

export interface AppShellProps {
  children: ComponentChildren
  activeTab: 'study' | 'settings'
  onTabChange: (tab: 'study' | 'settings') => void
  showNav?: boolean
}

export function AppShell({ children, activeTab, onTabChange, showNav = true }: AppShellProps) {
  return (
    <div
      class="flex flex-col h-full max-w-[480px] mx-auto"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <header class="px-4 py-3 border-b border-gray-200 bg-white">
        <h1 class="text-lg font-semibold">Sheet Music Flashcards</h1>
      </header>

      <main class="flex-1 overflow-y-auto p-4">
        {children}
      </main>

      {showNav && (
        <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
      )}
    </div>
  )
}
