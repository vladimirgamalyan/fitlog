import type { Session, SessionEntry, WorkoutLog } from './types'

const STORAGE_KEY = 'fitlog.log.v1'

export function emptyLog(): WorkoutLog {
  return { version: 1, sessions: [] }
}

/** Local calendar date as YYYY-MM-DD; UTC would shift the day for evening workouts. */
export function todayISO(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function loadLog(): WorkoutLog {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return emptyLog()
  try {
    const parsed = JSON.parse(raw) as WorkoutLog
    if (!Array.isArray(parsed?.sessions)) return emptyLog()
    return { version: 1, sessions: parsed.sessions }
  } catch {
    // Corrupted storage: start over rather than block the app in the gym.
    return emptyLog()
  }
}

export function saveLog(log: WorkoutLog): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
}

/** Drops every recorded session and returns the log to work with from now on. */
export function clearLog(): WorkoutLog {
  localStorage.removeItem(STORAGE_KEY)
  return emptyLog()
}

function sessionId(date: string, programId: string): string {
  return `${date}-${programId}`
}

/**
 * Writes the weights of a workout into the log, creating the session on first
 * write. Called on every edit and on Finish, so nothing is lost by closing the
 * app; a program that is only viewed never reaches this and records nothing.
 */
export function recordSession(
  log: WorkoutLog,
  programId: string,
  date: string,
  entries: SessionEntry[],
): Session {
  const id = sessionId(date, programId)
  const existing = log.sessions.find((s) => s.id === id)
  if (existing) {
    existing.entries = entries
    return existing
  }
  const session: Session = { id, date, programId, entries }
  log.sessions.push(session)
  return session
}
