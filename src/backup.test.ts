import { describe, expect, it } from 'vitest'
import { backupName, programName, serialize } from './backup'
import { parseProgramsFile } from './programImport'
import programsData from './programs.json'
import { emptyLog, recordSession } from './storage'

describe('backupName', () => {
  it('uses .txt for shares, since Chromium rejects .json in the share sheet', () => {
    expect(backupName('2026-07-29', 'txt')).toBe('fitlog-2026-07-29.txt')
  })

  it('uses .json for downloads', () => {
    expect(backupName('2026-07-29', 'json')).toBe('fitlog-2026-07-29.json')
  })
})

describe('programName', () => {
  it('does not collide with a history backup of the same day', () => {
    expect(programName('2026-07-29', 'json')).not.toBe(backupName('2026-07-29', 'json'))
    expect(programName('2026-07-29', 'json')).toBe('fitlog-program-2026-07-29.json')
  })
})

describe('serialize', () => {
  it('round-trips a log without losing sessions', () => {
    const log = emptyLog()
    recordSession(log, 'a', '2026-07-29', [{ exerciseId: 'leg-press', weights: [80, 82.5] }])
    expect(JSON.parse(serialize(log))).toEqual(log)
  })

  it('produces readable output rather than one line', () => {
    expect(serialize(emptyLog())).toContain('\n')
  })

  it('writes a program file the app can import again', () => {
    // Over the bundled demo rather than a stub: it carries the guides and
    // data-URL photos an exported file has to survive.
    const active = parseProgramsFile(JSON.stringify(programsData))
    expect(parseProgramsFile(serialize(active))).toEqual(active)
  })
})
