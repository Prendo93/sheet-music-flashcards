import { useState } from 'preact/hooks'
import { SheetMusicDisplay } from './components/SheetMusicDisplay.tsx'

type Tab = 'study' | 'settings'

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('study')

  return (
    <div class="flex flex-col h-full max-w-[480px] mx-auto">
      <header class="px-4 py-3 border-b border-gray-200">
        <h1 class="text-lg font-semibold">Sheet Music Flashcards</h1>
      </header>

      <main class="flex-1 overflow-y-auto p-4">
        {activeTab === 'study' && (
          <div>
            <SheetMusicDisplay note="C4" clef="treble" />
          </div>
        )}
        {activeTab === 'settings' && <p>Settings (coming soon)</p>}
      </main>

      <nav class="flex border-t border-gray-200" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <button
          class={`flex-1 py-3 text-sm font-medium ${activeTab === 'study' ? 'text-blue-600 border-t-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('study')}
        >
          Study
        </button>
        <button
          class={`flex-1 py-3 text-sm font-medium ${activeTab === 'settings' ? 'text-blue-600 border-t-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </nav>
    </div>
  )
}
