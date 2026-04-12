export interface BottomNavProps {
  activeTab: 'study' | 'settings'
  onTabChange: (tab: 'study' | 'settings') => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      class="flex border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <button
        type="button"
        onClick={() => onTabChange('study')}
        class={`flex-1 min-h-[48px] py-3 text-sm font-medium transition-colors ${
          activeTab === 'study'
            ? 'text-blue-600 dark:text-blue-400 border-t-2 border-blue-600'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        Study
      </button>
      <button
        type="button"
        onClick={() => onTabChange('settings')}
        class={`flex-1 min-h-[48px] py-3 text-sm font-medium transition-colors ${
          activeTab === 'settings'
            ? 'text-blue-600 dark:text-blue-400 border-t-2 border-blue-600'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        Settings
      </button>
    </nav>
  )
}
