import { describe, expect, it } from 'vitest'
import { buildJournal } from './journal'
import type { Program, WorkoutLog } from './types'

const upper: Program = {
  id: 'upper',
  name: 'Upper Body',
  day: 'Monday',
  exercises: [
    { id: 'leg-press', name: 'Leg Press', sets: 3, reps: '10-12' },
    { id: 'row', name: 'Seated Row', sets: 3, reps: '10' },
  ],
}

function log(...sessions: WorkoutLog['sessions']): WorkoutLog {
  return { version: 1, sessions }
}

function session(date: string, programId: string, entries: Record<string, number[]>) {
  return {
    id: `${date}-${programId}`,
    date,
    programId,
    entries: Object.entries(entries).map(([exerciseId, weights]) => ({ exerciseId, weights })),
  }
}

describe('buildJournal', () => {
  it('puts the newest session first', () => {
    const built = buildJournal(
      log(
        session('2026-07-20', 'upper', {}),
        session('2026-07-29', 'upper', {}),
        session('2026-07-24', 'upper', {}),
      ),
      [upper],
    )
    expect(built.map((entry) => entry.date)).toEqual(['2026-07-29', '2026-07-24', '2026-07-20'])
  })

  it('resolves program and exercise ids to their current names', () => {
    const built = buildJournal(log(session('2026-07-29', 'upper', { 'leg-press': [80, 82.5] })), [
      upper,
    ])
    expect(built).toEqual([
      {
        date: '2026-07-29',
        program: 'Upper Body',
        lines: [{ name: 'Leg Press', weights: [80, 82.5] }],
      },
    ])
  })

  it('falls back to the stored ids when the program is no longer installed', () => {
    const built = buildJournal(log(session('2026-07-29', 'legs', { squat: [60] })), [upper])
    expect(built[0]).toEqual({
      date: '2026-07-29',
      program: 'legs',
      lines: [{ name: 'squat', weights: [60] }],
    })
  })

  it('falls back to the stored id for an exercise dropped from the program', () => {
    const built = buildJournal(log(session('2026-07-29', 'upper', { curl: [15] })), [upper])
    expect(built[0]!.lines).toEqual([{ name: 'curl', weights: [15] }])
  })

  it('keeps a session that logged no weights', () => {
    const built = buildJournal(log(session('2026-07-29', 'upper', {})), [upper])
    expect(built).toEqual([{ date: '2026-07-29', program: 'Upper Body', lines: [] }])
  })

  it('leaves the log untouched', () => {
    const stored = log(session('2026-07-20', 'upper', {}), session('2026-07-29', 'upper', {}))
    buildJournal(stored, [upper])
    expect(stored.sessions.map((entry) => entry.date)).toEqual(['2026-07-20', '2026-07-29'])
  })
})
