import type { Exercise, SessionEntry, WorkoutLog } from './types'

export function isWeighted(exercise: Exercise): boolean {
  return exercise.tracksWeight !== false
}

/**
 * Fits a stored weight array to the exercise's current set count.
 * A single weight applies to every set and is left alone; a per-set array is
 * padded with its last value or truncated when `sets` changed in programs.json.
 */
export function normalizeWeights(weights: number[], sets?: number): number[] {
  if (weights.length <= 1 || sets === undefined) return [...weights]
  if (weights.length === sets) return [...weights]
  if (weights.length > sets) return weights.slice(0, sets)
  const last = weights[weights.length - 1]!
  return [...weights, ...Array<number>(sets - weights.length).fill(last)]
}

/** Most recent entry for this exercise across all sessions of the program. */
export function latestEntry(
  log: WorkoutLog,
  programId: string,
  exerciseId: string,
): SessionEntry | undefined {
  let best: { date: string; entry: SessionEntry } | undefined
  for (const session of log.sessions) {
    if (session.programId !== programId) continue
    const entry = session.entries.find((e) => e.exerciseId === exerciseId)
    if (!entry || entry.weights.length === 0) continue
    if (!best || session.date >= best.date) best = { date: session.date, entry }
  }
  return best?.entry
}

/**
 * The weights to show for an exercise: last logged -> initialWeight -> unset.
 * Returns null when the exercise carries no load or has no weight yet.
 */
export function resolveWeights(
  log: WorkoutLog,
  programId: string,
  exercise: Exercise,
): number[] | null {
  if (!isWeighted(exercise)) return null
  const entry = latestEntry(log, programId, exercise.id)
  if (entry) return normalizeWeights(entry.weights, exercise.sets)
  if (exercise.initialWeight !== undefined) return [exercise.initialWeight]
  return null
}

/** Date of the most recent session of a program, or undefined if never trained. */
export function lastTrainedDate(log: WorkoutLog, programId: string): string | undefined {
  let latest: string | undefined
  for (const session of log.sessions) {
    if (session.programId !== programId) continue
    if (!latest || session.date > latest) latest = session.date
  }
  return latest
}

/** Expands a single weight to one per set, so each set can be edited on its own. */
export function expandToSets(weights: number[], sets: number): number[] {
  const value = weights[0] ?? 0
  return weights.length > 1 ? normalizeWeights(weights, sets) : Array<number>(sets).fill(value)
}

/** Collapses per-set weights back to one value, keeping the first set's weight. */
export function collapseToSingle(weights: number[]): number[] {
  return weights.length === 0 ? [] : [weights[0]!]
}
