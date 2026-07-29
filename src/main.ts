import { registerSW } from 'virtual:pwa-register'
import './style.css'
import { canShareFiles, downloadBackup, shareBackup } from './backup'
import programsData from './programs.json'
import { loadLog, recordSession, saveLog, todayISO } from './storage'
import type { Program, ProgramsFile, SessionEntry } from './types'
import { collapseToSingle, expandToSets, isWeighted, resolveWeights } from './weights'
import { type Draft, renderGuide, renderPicker, renderWorkout } from './view'

const { weightStep, programs } = programsData as ProgramsFile
const app = document.querySelector<HTMLDivElement>('#app')!

let log = loadLog()
let activeProgram: Program | null = null
let activeExerciseId: string | null = null
let draft: Draft = new Map()
/** Restored when returning from a guide, so the list does not jump to the top. */
let workoutScrollY = 0

function activeExercise() {
  return activeProgram?.exercises.find((candidate) => candidate.id === activeExerciseId)
}

function render(): void {
  const exercise = activeExercise()
  if (activeProgram && exercise) app.innerHTML = renderGuide(exercise)
  else if (activeProgram) app.innerHTML = renderWorkout(activeProgram, draft)
  else app.innerHTML = renderPicker(programs, log, canShareFiles())
}

function openProgram(programId: string): void {
  const program = programs.find((candidate) => candidate.id === programId)
  if (!program) return
  activeProgram = program
  activeExerciseId = null
  draft = new Map(
    program.exercises.map((exercise) => [exercise.id, resolveWeights(log, program.id, exercise)]),
  )
  render()
}

function entriesFromDraft(program: Program): SessionEntry[] {
  return program.exercises
    .filter(isWeighted)
    .map((exercise) => ({ exerciseId: exercise.id, weights: draft.get(exercise.id) ?? [] }))
    .filter((entry) => entry.weights.length > 0)
}

/** Persists the whole workout, so the log always holds a complete snapshot. */
function persist(): void {
  if (!activeProgram) return
  recordSession(log, activeProgram.id, todayISO(), entriesFromDraft(activeProgram))
  saveLog(log)
}

function weightAt(weights: number[] | null, setIndex: number): number {
  if (!weights || weights.length === 0) return 0
  return weights[Math.min(setIndex, weights.length - 1)]!
}

function updateWeight(exerciseId: string, setIndex: number, value: number): number[] {
  const current = draft.get(exerciseId)
  const weights = current && current.length > 0 ? [...current] : [0]
  weights[Math.min(setIndex, weights.length - 1)] = value
  draft.set(exerciseId, weights)
  return weights
}

function step(exerciseId: string, setIndex: number, direction: 1 | -1): void {
  const current = weightAt(draft.get(exerciseId) ?? null, setIndex)
  const next = Math.max(0, Math.round((current + direction * weightStep) * 100) / 100)
  updateWeight(exerciseId, setIndex, next)
  const input = app.querySelector<HTMLInputElement>(
    `input[data-ex="${exerciseId}"][data-set="${setIndex}"]`,
  )
  // Update the field in place: a re-render here would swallow the button click.
  if (input) input.value = String(next)
  persist()
}

function toggleSets(exerciseId: string): void {
  const exercise = activeProgram?.exercises.find((candidate) => candidate.id === exerciseId)
  if (!exercise?.sets) return
  const weights = draft.get(exerciseId) ?? null
  draft.set(
    exerciseId,
    weights && weights.length > 1 ? collapseToSingle(weights) : expandToSets(weights ?? [0], exercise.sets),
  )
  render()
  persist()
}

app.addEventListener('click', (event) => {
  const trigger = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')
  if (!trigger) return
  const { action, program, ex, set } = trigger.dataset

  switch (action) {
    case 'open':
      if (program) openProgram(program)
      break
    case 'back':
      if (activeExerciseId) {
        activeExerciseId = null
        render()
        window.scrollTo(0, workoutScrollY)
      } else {
        activeProgram = null
        render()
      }
      break
    case 'info':
      if (ex) {
        workoutScrollY = window.scrollY
        activeExerciseId = ex
        render()
        window.scrollTo(0, 0)
      }
      break
    case 'finish':
      persist()
      activeProgram = null
      render()
      break
    case 'inc':
    case 'dec':
      if (ex) step(ex, Number(set), action === 'inc' ? 1 : -1)
      break
    case 'toggle-sets':
      if (ex) toggleSets(ex)
      break
    case 'share-backup':
      // Fall back to a download if the share sheet refuses the file.
      void shareBackup(log, todayISO()).then((ok) => {
        if (!ok) downloadBackup(log, todayISO())
      })
      break
    case 'save-backup':
      downloadBackup(log, todayISO())
      break
  }
})

app.addEventListener('change', (event) => {
  const input = event.target as HTMLInputElement
  if (!input.matches('input[data-ex]')) return
  const exerciseId = input.dataset.ex!
  const setIndex = Number(input.dataset.set)
  const value = Number.parseFloat(input.value)

  if (!Number.isFinite(value) || value < 0) {
    const weights = draft.get(exerciseId) ?? null
    input.value = weights === null ? '' : String(weightAt(weights, setIndex))
    return
  }
  updateWeight(exerciseId, setIndex, value)
  persist()
})

render()
registerSW({ immediate: true })
