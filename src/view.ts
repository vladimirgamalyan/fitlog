import type { Exercise, Program, WorkoutLog } from './types'
import { isWeighted, lastTrainedDate } from './weights'

/** Weights currently shown for each exercise; null means no weight is known yet. */
export type Draft = Map<string, number[] | null>

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
  )
}

/** "2026-07-26" -> "Jul 26", parsed as a local date to avoid a UTC day shift. */
function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year!, month! - 1, day!)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function prescription(exercise: Exercise): string {
  return exercise.sets === undefined ? exercise.reps : `${exercise.sets}×${exercise.reps}`
}

export function renderPicker(programs: Program[], log: WorkoutLog): string {
  const cards = programs
    .map((program) => {
      const last = lastTrainedDate(log, program.id)
      const subtitle = last ? `${program.day} · last ${formatDate(last)}` : program.day
      return `
        <button class="program" data-action="open" data-program="${escapeHtml(program.id)}">
          <span class="program-name">${escapeHtml(program.name)}</span>
          <span class="program-sub">${escapeHtml(subtitle)}</span>
        </button>`
    })
    .join('')
  return `<header class="app-header"><h1>fitlog</h1></header><main class="picker">${cards}</main>`
}

function renderSetRow(exerciseId: string, weight: number | null, setIndex: number | null): string {
  const label = setIndex === null ? '' : `<span class="set-index">${setIndex + 1}</span>`
  const value = weight === null ? '' : String(weight)
  const set = setIndex ?? 0
  return `
    <div class="set-row">
      ${label}
      <button class="step" data-action="dec" data-ex="${exerciseId}" data-set="${set}">−</button>
      <span class="weight">
        <input type="number" inputmode="decimal" step="0.5" min="0"
               value="${value}" placeholder="—"
               data-ex="${exerciseId}" data-set="${set}" aria-label="weight" />
        <span class="unit">kg</span>
      </span>
      <button class="step" data-action="inc" data-ex="${exerciseId}" data-set="${set}">+</button>
    </div>`
}

function renderExercise(exercise: Exercise, weights: number[] | null): string {
  const id = escapeHtml(exercise.id)
  const note = exercise.note ? `<p class="note">${escapeHtml(exercise.note)}</p>` : ''
  const perSet = weights !== null && weights.length > 1
  const canSplit = isWeighted(exercise) && exercise.sets !== undefined && exercise.sets > 1
  const toggle = canSplit
    ? `<button class="mode" data-action="toggle-sets" data-ex="${id}">${
        perSet ? 'same' : 'per set'
      }</button>`
    : ''
  const info = exercise.guide
    ? `<button class="info" data-action="info" data-ex="${id}" aria-label="How to do it">?</button>`
    : ''

  let body = ''
  if (isWeighted(exercise)) {
    body = perSet
      ? weights.map((weight, index) => renderSetRow(id, weight, index)).join('')
      : renderSetRow(id, weights === null ? null : weights[0]!, null)
  }

  return `
    <section class="exercise">
      <div class="exercise-head">
        <span class="exercise-name">${escapeHtml(exercise.name)}</span>
        <span class="prescription">${escapeHtml(prescription(exercise))}</span>
        ${info}
        ${toggle}
      </div>
      ${note}
      ${body}
    </section>`
}

export function renderGuide(exercise: Exercise): string {
  const guide = exercise.guide
  if (!guide) return ''
  const photos = (guide.images ?? [])
    .map(
      (image, index) =>
        `<img src="${import.meta.env.BASE_URL}${escapeHtml(image)}" loading="lazy"
              alt="${escapeHtml(exercise.name)}, position ${index + 1}" />`,
    )
    .join('')
  const steps = guide.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')
  const cue = exercise.note ? `<p class="cue">${escapeHtml(exercise.note)}</p>` : ''

  return `
    <header class="app-header">
      <button class="back" data-action="back" aria-label="Back">‹</button>
      <h1>${escapeHtml(exercise.name)}</h1>
    </header>
    <main class="guide">
      <p class="prescription-line">${escapeHtml(prescription(exercise))}</p>
      ${cue}
      ${photos ? `<div class="photos">${photos}</div>` : ''}
      <ol class="steps">${steps}</ol>
    </main>`
}

export function renderWorkout(program: Program, draft: Draft): string {
  const exercises = program.exercises
    .map((exercise) => renderExercise(exercise, draft.get(exercise.id) ?? null))
    .join('')
  return `
    <header class="app-header">
      <button class="back" data-action="back" aria-label="Back">‹</button>
      <h1>${escapeHtml(program.name)}</h1>
    </header>
    <main class="workout">
      ${exercises}
      <button class="finish" data-action="finish">Finish</button>
    </main>`
}
