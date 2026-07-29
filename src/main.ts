import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/space-grotesk'
import './style.css'
import { backupName, canShareFiles, downloadFile, programName, serialize, shareFile } from './backup'
import { parseProgramsFile } from './programImport'
import programsData from './programs.json'
import { loadImportedPrograms, saveImportedPrograms, takeSharedProgram } from './programStore'
import { clearLog, loadLog, recordSession, saveLog, todayISO } from './storage'
import type { Program, ProgramsFile, SessionEntry } from './types'
import { collapseToSingle, expandToSets, isWeighted, resolveWeights } from './weights'
import { type Draft, renderGuide, renderPicker, renderWorkout } from './view'

/** Kilograms added or removed by one tap of the -/+ buttons. See ADR-0008. */
const WEIGHT_STEP = 0.5

// The bundled file is a demo; an imported program replaces it at startup.
let { programs } = programsData as ProgramsFile
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

/**
 * The program data as an importable file. Exporting it lets a phone hand the
 * program on to another device, or back to a computer that lost the original.
 */
function currentPrograms(): ProgramsFile {
  return { programs }
}

function render(): void {
  const exercise = activeExercise()
  if (activeProgram && exercise) app.innerHTML = renderGuide(exercise)
  else if (activeProgram) app.innerHTML = renderWorkout(activeProgram, draft)
  else app.innerHTML = renderPicker(programs, log, canShareFiles())
}

/** History entry describing a screen. null (the initial entry) is the picker. */
type NavState = { programId: string; exerciseId?: string } | null

/**
 * Navigation lives in the browser history: entering a workout or a guide
 * pushes an entry, so the phone's system back button walks back through the
 * app's screens instead of closing the app. The entry's state, not the click
 * path, decides what is on screen — a back/forward jump of any length lands
 * on a consistent screen.
 */
function applyHistoryState(state: NavState): void {
  const program = state
    ? programs.find((candidate) => candidate.id === state.programId)
    : undefined
  if (!state || !program) {
    activeProgram = null
    activeExerciseId = null
    render()
    return
  }
  const returningToWorkout =
    activeProgram?.id === program.id && activeExerciseId !== null && state.exerciseId === undefined
  if (activeProgram?.id !== program.id) {
    activeProgram = program
    draft = new Map(
      program.exercises.map((exercise) => [exercise.id, resolveWeights(log, program.id, exercise)]),
    )
  }
  activeExerciseId = state.exerciseId ?? null
  render()
  // Coming back from a guide restores the list position; every other
  // transition starts at the top.
  window.scrollTo(0, returningToWorkout ? workoutScrollY : 0)
}

function navigate(state: NavState): void {
  history.pushState(state, '')
  applyHistoryState(state)
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

let flashTimer: number | undefined

/**
 * Confirms a backup on the button itself. A download is otherwise invisible:
 * the file lands in the download folder with no sign the tap registered.
 */
function flash(button: HTMLElement, message: string, isError = false): void {
  window.clearTimeout(flashTimer)
  // Keep the original label in a data attribute so a second tap mid-flash
  // does not adopt "Saved" as the button's name.
  const original = button.dataset.label ?? button.textContent ?? ''
  button.dataset.label = original
  button.textContent = message
  button.classList.add(isError ? 'flash-error' : 'flash')
  // Errors carry a reason worth reading, so they stay up longer.
  flashTimer = window.setTimeout(() => {
    button.textContent = original
    button.classList.remove('flash', 'flash-error')
  }, isError ? 4000 : 2000)
}

/**
 * Hands a file to the share sheet, falling back to a download when the sheet
 * refuses it. The two destinations need different extensions, so the name is
 * built per destination rather than passed in ready-made.
 */
function sendFile(
  button: HTMLElement,
  text: string,
  name: (date: string, extension: 'json' | 'txt') => string,
  title: string,
): void {
  void shareFile(text, name(todayISO(), 'txt'), title).then((ok) => {
    if (ok) return
    downloadFile(text, name(todayISO(), 'json'))
    flash(button, 'Saved instead')
  })
}

/**
 * Replaces the active programs with the contents of an imported file.
 * Returns null on success or a message describing why the file was refused.
 */
async function importPrograms(text: string): Promise<string | null> {
  let file: ProgramsFile
  try {
    file = parseProgramsFile(text)
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid file'
  }
  try {
    await saveImportedPrograms(file)
  } catch {
    return 'Could not save the program on this device'
  }
  ;({ programs } = file)
  return null
}

/** Flashes the import outcome on the "Load program" button, if it is on screen. */
function reportImport(error: string | null): void {
  const button = app.querySelector<HTMLElement>('[data-action="load-program"]')
  if (button) flash(button, error ?? 'Program loaded ✓', error !== null)
}

async function importProgramsFromFile(file: File): Promise<void> {
  const error = await importPrograms(await file.text())
  render()
  reportImport(error)
}

/**
 * Wiping the history cannot be undone, so it takes two taps: the first arms the
 * button, the second erases. The armed state lives on the element rather than in
 * a variable, so any re-render disarms it; it also lapses on its own, so a
 * button left armed and forgotten does not erase the log on the next tap.
 */
function armClearHistory(button: HTMLElement): void {
  const original = button.textContent ?? ''
  button.classList.add('armed')
  button.textContent = 'Tap again to clear'
  window.setTimeout(() => {
    button.classList.remove('armed')
    button.textContent = original
  }, 4000)
}

function pickProgramFile(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,.txt,application/json,text/plain'
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) void importProgramsFromFile(file)
  })
  input.click()
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
  const next = Math.max(0, Math.round((current + direction * WEIGHT_STEP) * 100) / 100)
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
      if (program && programs.some((candidate) => candidate.id === program)) {
        navigate({ programId: program })
      }
      break
    case 'back':
      history.back()
      break
    case 'info':
      if (ex && activeProgram) {
        workoutScrollY = window.scrollY
        navigate({ programId: activeProgram.id, exerciseId: ex })
      }
      break
    case 'finish':
      persist()
      history.back()
      break
    case 'inc':
    case 'dec':
      if (ex) step(ex, Number(set), action === 'inc' ? 1 : -1)
      break
    case 'toggle-sets':
      if (ex) toggleSets(ex)
      break
    case 'share-backup':
      sendFile(trigger, serialize(log), backupName, 'fitlog history')
      break
    case 'save-backup':
      downloadFile(serialize(log), backupName(todayISO(), 'json'))
      flash(trigger, 'Saved ✓')
      break
    case 'share-program':
      sendFile(trigger, serialize(currentPrograms()), programName, 'fitlog program')
      break
    case 'save-program':
      downloadFile(serialize(currentPrograms()), programName(todayISO(), 'json'))
      flash(trigger, 'Saved ✓')
      break
    case 'load-program':
      pickProgramFile()
      break
    case 'clear-history':
      if (!trigger.classList.contains('armed')) {
        armClearHistory(trigger)
        break
      }
      log = clearLog()
      // The re-drawn footer says "No workouts logged yet": the confirmation is
      // the picker itself, so no flash is needed.
      render()
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

window.addEventListener('popstate', (event) => {
  applyHistoryState(event.state as NavState)
})

async function init(): Promise<void> {
  try {
    const stored = await loadImportedPrograms()
    if (stored) ({ programs } = stored)
  } catch {
    // IndexedDB unavailable (e.g. private mode): keep the bundled demo.
  }

  // A file shared into the app arrives via the service worker, which stashes
  // its text and redirects here; undefined means nothing was shared.
  let sharedError: string | null | undefined
  try {
    const shared = await takeSharedProgram()
    if (shared !== null) sharedError = await importPrograms(shared)
  } catch {
    // Same: without IndexedDB there is nothing stashed to pick up.
  }

  // A reload lands on the entry it left, so the screen survives it; a fresh
  // launch has a null entry and shows the picker.
  applyHistoryState(history.state as NavState)
  if (sharedError !== undefined) reportImport(sharedError)
  registerSW({ immediate: true })
}

void init()
