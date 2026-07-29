import { describe, expect, it } from 'vitest'
import type { Exercise, WorkoutLog } from './types'
import {
  collapseToSingle,
  expandToSets,
  lastTrainedDate,
  latestEntry,
  normalizeWeights,
  resolveWeights,
} from './weights'

const press: Exercise = { id: 'leg-press', name: 'Leg Press', sets: 3, reps: '10-12' }

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

describe('normalizeWeights', () => {
  it('leaves a single weight alone regardless of set count', () => {
    expect(normalizeWeights([80], 4)).toEqual([80])
  })

  it('pads a per-set array with its last value when sets grew', () => {
    expect(normalizeWeights([60, 70, 80], 5)).toEqual([60, 70, 80, 80, 80])
  })

  it('truncates a per-set array when sets shrank', () => {
    expect(normalizeWeights([60, 70, 80, 80], 2)).toEqual([60, 70])
  })

  it('leaves weights alone when the exercise has no set count', () => {
    expect(normalizeWeights([60, 70], undefined)).toEqual([60, 70])
  })
})

describe('latestEntry', () => {
  it('takes the most recent session by date, not array order', () => {
    const data = log(
      session('2026-07-21', 'a', { 'leg-press': [70] }),
      session('2026-07-14', 'a', { 'leg-press': [65] }),
    )
    expect(latestEntry(data, 'a', 'leg-press')?.weights).toEqual([70])
  })

  it('falls back to an older session when the newest one lacks the exercise', () => {
    const data = log(
      session('2026-07-14', 'a', { 'leg-press': [65] }),
      session('2026-07-21', 'a', { squat: [100] }),
    )
    expect(latestEntry(data, 'a', 'leg-press')?.weights).toEqual([65])
  })

  it('ignores sessions of another program', () => {
    const data = log(session('2026-07-25', 'b', { 'leg-press': [90] }))
    expect(latestEntry(data, 'a', 'leg-press')).toBeUndefined()
  })

  it('ignores entries with no weights', () => {
    const data = log(session('2026-07-25', 'a', { 'leg-press': [] }))
    expect(latestEntry(data, 'a', 'leg-press')).toBeUndefined()
  })
})

describe('resolveWeights', () => {
  it('prefers the logged weight over initialWeight', () => {
    const data = log(session('2026-07-21', 'a', { 'leg-press': [80] }))
    expect(resolveWeights(data, 'a', { ...press, initialWeight: 60 })).toEqual([80])
  })

  it('fits the logged weight to the current set count', () => {
    const data = log(session('2026-07-21', 'a', { 'leg-press': [60, 70, 80] }))
    expect(resolveWeights(data, 'a', { ...press, sets: 2 })).toEqual([60, 70])
  })

  it('falls back to initialWeight with no history', () => {
    expect(resolveWeights(emptyLog(), 'a', { ...press, initialWeight: 60 })).toEqual([60])
  })

  it('returns null when nothing is known yet', () => {
    expect(resolveWeights(emptyLog(), 'a', press)).toBeNull()
  })

  it('returns null for exercises that carry no load', () => {
    const bodyweight: Exercise = {
      id: 'bird-dog',
      name: 'Bird Dog',
      sets: 3,
      reps: '8 per side',
      tracksWeight: false,
      initialWeight: 10,
    }
    expect(resolveWeights(emptyLog(), 'a', bodyweight)).toBeNull()
  })

  it('detaches history when the exercise id changes', () => {
    const data = log(session('2026-07-21', 'a', { 'leg-press': [80] }))
    expect(resolveWeights(data, 'a', { ...press, id: 'leg-press-machine' })).toBeNull()
  })
})

describe('lastTrainedDate', () => {
  it('returns the newest date for the program', () => {
    const data = log(
      session('2026-07-14', 'a', { 'leg-press': [65] }),
      session('2026-07-25', 'b', { squat: [100] }),
      session('2026-07-21', 'a', { 'leg-press': [70] }),
    )
    expect(lastTrainedDate(data, 'a')).toBe('2026-07-21')
  })

  it('returns undefined when the program was never trained', () => {
    expect(lastTrainedDate(emptyLog(), 'a')).toBeUndefined()
  })
})

describe('per-set toggle', () => {
  it('expands one weight into one per set', () => {
    expect(expandToSets([80], 3)).toEqual([80, 80, 80])
  })

  it('keeps existing per-set weights while fitting the set count', () => {
    expect(expandToSets([60, 70], 3)).toEqual([60, 70, 70])
  })

  it('collapses back to the first set', () => {
    expect(collapseToSingle([60, 70, 80])).toEqual([60])
  })
})

function emptyLog(): WorkoutLog {
  return { version: 1, sessions: [] }
}
