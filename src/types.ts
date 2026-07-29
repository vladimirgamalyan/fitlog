/** Technique reference shown behind the "?" button. See ADR-0004. */
export interface ExerciseGuide {
  /** Self-contained data URLs; omitted when no accurate photo exists. */
  images?: string[]
  steps: string[]
}

/** A single exercise as prescribed by a program. See ADR-0002 and ADR-0003. */
export interface Exercise {
  /** Stable key; history is attached to it, so it must never be reused or renamed. */
  id: string
  name: string
  /** Absent for prescriptions that have no set count, e.g. a warm-up. */
  sets?: number
  /** Display only: "10-12", "8 per side", "20-30 sec per side", "30 m per side". */
  reps: string
  /** Defaults to true. When false the exercise carries no external load. */
  tracksWeight?: boolean
  /** Used when the log holds no weight for this exercise yet. */
  initialWeight?: number
  /** One-line technique cue shown under the name. */
  note?: string
  /** When present, the exercise gets a "?" button opening the guide screen. */
  guide?: ExerciseGuide
}

export interface Program {
  id: string
  name: string
  /** Weekday this program is normally trained on; shown on the picker. */
  day: string
  exercises: Exercise[]
}

export interface ProgramsFile {
  /** Increment used by the -/+ buttons, in kg. */
  weightStep: number
  programs: Program[]
}

/**
 * Weights used for one exercise in one session.
 * Length 1 means the same weight for every set; otherwise one weight per set.
 */
export interface SessionEntry {
  exerciseId: string
  weights: number[]
}

export interface Session {
  /** Derived from date and program, so a day cannot hold two sessions of one program. */
  id: string
  /** Local calendar date, YYYY-MM-DD. */
  date: string
  programId: string
  entries: SessionEntry[]
}

export interface WorkoutLog {
  version: 1
  sessions: Session[]
}
