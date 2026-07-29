import type { ProgramsFile, WorkoutLog } from './types'

/** Indented so an exported file can be read and edited by hand. */
export function serialize(value: WorkoutLog | ProgramsFile): string {
  return JSON.stringify(value, null, 2)
}

export function backupName(date: string, extension: 'json' | 'txt'): string {
  return `fitlog-${date}.${extension}`
}

/** Distinct from the history's name: both land in the same download folder. */
export function programName(date: string, extension: 'json' | 'txt'): string {
  return `fitlog-program-${date}.${extension}`
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

export function downloadFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Returns false when the share failed for a reason other than the user cancelling. */
export async function shareFile(text: string, filename: string, title: string): Promise<boolean> {
  const file = new File([text], filename, { type: 'text/plain' })
  try {
    await navigator.share({ files: [file], title })
    return true
  } catch (error) {
    return (error as Error).name === 'AbortError'
  }
}
