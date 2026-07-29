import type { WorkoutLog } from './types'

export function serializeLog(log: WorkoutLog): string {
  return JSON.stringify(log, null, 2)
}

export function backupName(date: string, extension: 'json' | 'txt'): string {
  return `fitlog-${date}.${extension}`
}

/**
 * Chromium only shares files whose extension is on its permitted list, and
 * .json is not on it — navigator.canShare() reports true anyway, so the
 * rejection only shows up on the device. Shared backups therefore travel as
 * .txt with JSON inside; downloads have no such restriction and keep .json.
 */
export function canShareFiles(): boolean {
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false
  }
  try {
    return navigator.canShare({ files: [new File([''], 'probe.txt', { type: 'text/plain' })] })
  } catch {
    return false
  }
}

export function downloadBackup(log: WorkoutLog, date: string): void {
  const blob = new Blob([serializeLog(log)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = backupName(date, 'json')
  link.click()
  URL.revokeObjectURL(url)
}

/** Returns false when the share failed for a reason other than the user cancelling. */
export async function shareBackup(log: WorkoutLog, date: string): Promise<boolean> {
  const file = new File([serializeLog(log)], backupName(date, 'txt'), { type: 'text/plain' })
  try {
    await navigator.share({ files: [file], title: 'fitlog backup' })
    return true
  } catch (error) {
    return (error as Error).name === 'AbortError'
  }
}
