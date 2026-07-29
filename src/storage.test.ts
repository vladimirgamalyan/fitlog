import { beforeEach, describe, expect, it } from 'vitest'
import { clearLog, emptyLog, loadLog, recordSession, saveLog, todayISO } from './storage'

const KEY = 'fitlog.log.v1'

beforeEach(() => {
  localStorage.clear()
})

describe('todayISO', () => {
  it('formats the local calendar date', () => {
    expect(todayISO(new Date(2026, 6, 29, 23, 30))).toBe('2026-07-29')
  })

  it('pads single-digit months and days', () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('loadLog', () => {
  it('returns an empty log when storage is untouched', () => {
    expect(loadLog()).toEqual(emptyLog())
  })

  it('returns an empty log instead of throwing on corrupted storage', () => {
    localStorage.setItem(KEY, '{not json')
    expect(loadLog()).toEqual(emptyLog())
  })

  it('returns an empty log when the stored shape is wrong', () => {
    localStorage.setItem(KEY, '{"version":1}')
    expect(loadLog()).toEqual(emptyLog())
  })

  it('round-trips a saved log', () => {
    const stored = emptyLog()
    recordSession(stored, 'a', '2026-07-29', [{ exerciseId: 'leg-press', weights: [80] }])
    saveLog(stored)
    expect(loadLog()).toEqual(stored)
  })
})

describe('clearLog', () => {
  it('forgets every stored session', () => {
    const stored = emptyLog()
    recordSession(stored, 'a', '2026-07-29', [{ exerciseId: 'leg-press', weights: [80] }])
    saveLog(stored)
    expect(clearLog()).toEqual(emptyLog())
    expect(loadLog()).toEqual(emptyLog())
  })

  it('leaves nothing behind in storage', () => {
    saveLog(emptyLog())
    clearLog()
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})

describe('recordSession', () => {
  it('creates a session on the first write', () => {
    const stored = emptyLog()
    recordSession(stored, 'a', '2026-07-29', [{ exerciseId: 'leg-press', weights: [80] }])
    expect(stored.sessions).toHaveLength(1)
    expect(stored.sessions[0]).toMatchObject({ date: '2026-07-29', programId: 'a' })
  })

  it('overwrites the same day and program instead of duplicating it', () => {
    const stored = emptyLog()
    recordSession(stored, 'a', '2026-07-29', [{ exerciseId: 'leg-press', weights: [80] }])
    recordSession(stored, 'a', '2026-07-29', [{ exerciseId: 'leg-press', weights: [82.5] }])
    expect(stored.sessions).toHaveLength(1)
    expect(stored.sessions[0]!.entries[0]!.weights).toEqual([82.5])
  })

  it('keeps sessions of different programs on the same day apart', () => {
    const stored = emptyLog()
    recordSession(stored, 'a', '2026-07-29', [])
    recordSession(stored, 'b', '2026-07-29', [])
    expect(stored.sessions).toHaveLength(2)
  })

  it('records nothing until it is called', () => {
    loadLog()
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})
