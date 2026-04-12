import { getAllCards, getSettings, getAllReviewLogs } from './db.ts'
import type { CardRecord, ReviewLogRecord, UserSettings } from '../types.ts'

export interface ExportData {
  version: 1
  exportedAt: string
  settings: UserSettings
  cards: CardRecord[]
  reviewLogs: ReviewLogRecord[]
}

export async function buildExportData(): Promise<ExportData> {
  const settings = await getSettings()
  const cards = await getAllCards()
  const reviewLogs = await getAllReviewLogs()

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    cards,
    reviewLogs,
  }
}

export function downloadExportData(data: ExportData): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const dateStr = data.exportedAt.slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `flashcards-backup-${dateStr}.json`
  a.click()

  URL.revokeObjectURL(url)
}

export async function exportAllData(): Promise<void> {
  const data = await buildExportData()
  downloadExportData(data)
}
