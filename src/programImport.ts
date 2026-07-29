import type { Exercise, ExerciseGuide, Program, ProgramsFile } from './types'

/**
 * Validates an imported program file. Imported files come from outside the
 * bundle (file picker, share target), so every field the app reads is checked
 * before the file replaces the bundled programs.
 */
export function parseProgramsFile(text: string): ProgramsFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Not a JSON file')
  }
  if (!isRecord(data)) throw new Error('Expected a JSON object')

  const { weightStep, programs } = data
  if (typeof weightStep !== 'number' || !Number.isFinite(weightStep) || weightStep <= 0) {
    throw new Error('weightStep must be a positive number')
  }
  if (!Array.isArray(programs) || programs.length === 0) {
    throw new Error('programs must be a non-empty array')
  }
  const parsed = programs.map(parseProgram)
  if (new Set(parsed.map((program) => program.id)).size !== parsed.length) {
    throw new Error('program ids must be unique')
  }
  return { weightStep, programs: parsed }
}

function parseProgram(value: unknown, index: number): Program {
  if (!isRecord(value)) throw new Error(`programs[${index}] is not an object`)
  const { id, name, day, exercises } = value
  if (!isNonEmptyString(id)) throw new Error(`programs[${index}].id must be a string`)
  if (!isNonEmptyString(name)) throw new Error(`program "${id}": name must be a string`)
  if (!isNonEmptyString(day)) throw new Error(`program "${id}": day must be a string`)
  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new Error(`program "${id}": exercises must be a non-empty array`)
  }
  const parsed = exercises.map((exercise) => parseExercise(exercise, id))
  if (new Set(parsed.map((exercise) => exercise.id)).size !== parsed.length) {
    throw new Error(`program "${id}": exercise ids must be unique`)
  }
  return { id, name, day, exercises: parsed }
}

function parseExercise(value: unknown, programId: string): Exercise {
  if (!isRecord(value)) throw new Error(`program "${programId}": exercise is not an object`)
  const { id, name, sets, reps, tracksWeight, initialWeight, note, guide } = value
  if (!isNonEmptyString(id)) throw new Error(`program "${programId}": exercise id must be a string`)
  const label = `exercise "${id}"`
  if (!isNonEmptyString(name)) throw new Error(`${label}: name must be a string`)
  if (!isNonEmptyString(reps)) throw new Error(`${label}: reps must be a string`)
  if (sets !== undefined && (!Number.isInteger(sets) || (sets as number) < 1)) {
    throw new Error(`${label}: sets must be a positive integer`)
  }
  if (tracksWeight !== undefined && typeof tracksWeight !== 'boolean') {
    throw new Error(`${label}: tracksWeight must be a boolean`)
  }
  if (initialWeight !== undefined && typeof initialWeight !== 'number') {
    throw new Error(`${label}: initialWeight must be a number`)
  }
  if (note !== undefined && typeof note !== 'string') {
    throw new Error(`${label}: note must be a string`)
  }
  const exercise: Exercise = { id, name, reps }
  if (sets !== undefined) exercise.sets = sets as number
  if (tracksWeight !== undefined) exercise.tracksWeight = tracksWeight
  if (initialWeight !== undefined) exercise.initialWeight = initialWeight
  if (note !== undefined) exercise.note = note
  if (guide !== undefined) exercise.guide = parseGuide(guide, label)
  return exercise
}

function parseGuide(value: unknown, label: string): ExerciseGuide {
  if (!isRecord(value)) throw new Error(`${label}: guide is not an object`)
  const { images, steps } = value
  if (!Array.isArray(steps) || steps.length === 0 || !steps.every(isNonEmptyString)) {
    throw new Error(`${label}: guide.steps must be a non-empty array of strings`)
  }
  if (images !== undefined && (!Array.isArray(images) || !images.every(isNonEmptyString))) {
    throw new Error(`${label}: guide.images must be an array of strings`)
  }
  const guide: ExerciseGuide = { steps }
  if (images !== undefined) guide.images = images
  return guide
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}
