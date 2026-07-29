import { describe, expect, it } from 'vitest'
import { backupName, serializeLog } from './backup'
import { emptyLog, recordSession } from './storage'

describe('backupName', () => {
  it('uses .txt for shares, since Chromium rejects .json in the share sheet', () => {
    expect(backupName('2026-07-29', 'txt')).toBe('fitlog-2026-07-29.txt')
  })

  it('uses .json for downloads', () => {
    expect(backupName('2026-07-29', 'json')).toBe('fitlog-2026-07-29.json')
  })
})

describe('serializeLog', () => {
  it('round-trips a log without losing sessions', () => {
    const log = emptyLog()
    recordSession(log, 'a', '2026-07-29', [{ exerciseId: 'leg-press', weights: [80, 82.5] }])
    expect(JSON.parse(serializeLog(log))).toEqual(log)
  })

  it('produces readable output rather than one line', () => {
    expect(serializeLog(emptyLog())).toContain('\n')
  })
})
