import type { Program, WorkoutLog } from './types'

/** One exercise of a past session: the name to show and the weights logged. */
export interface JournalLine {
  name: string
  weights: number[]
}

export interface JournalSession {
  /** Local calendar date, YYYY-MM-DD. */
  date: string
  program: string
  lines: JournalLine[]
}

/**
 * The log as a readable journal: newest session first, ids resolved to the
 * names the current program uses. A session whose program or exercise is no
 * longer installed keeps its stored id as the name, so importing another
 * program never hides past work.
 */
export function buildJournal(log: WorkoutLog, programs: Program[]): JournalSession[] {
  return [...log.sessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((session) => {
      const program = programs.find((candidate) => candidate.id === session.programId)
      return {
        date: session.date,
        program: program?.name ?? session.programId,
        lines: session.entries.map((entry) => ({
          name:
            program?.exercises.find((exercise) => exercise.id === entry.exerciseId)?.name ??
            entry.exerciseId,
          weights: entry.weights,
        })),
      }
    })
}
