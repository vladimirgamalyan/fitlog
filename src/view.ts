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

function renderBackup(log: WorkoutLog, shareable: boolean): string {
  const count = log.sessions.length
  const summary =
    count === 0
      ? 'No workouts logged yet'
      : `${count} workout${count === 1 ? '' : 's'} logged`
  // History and program are exported the same way, so the buttons name what
  // they carry rather than how: "Save file" alone would be ambiguous here.
  const send = (action: string, label: string) =>
    shareable ? `<button class="secondary" data-action="${action}">${label}</button>` : ''
  // Nothing to lose on an empty log, so the destructive button stays out of the way.
  const clear =
    count === 0 ? '' : `<button class="secondary" data-action="clear-history">Clear history</button>`
  return `
    <footer class="backup">
      ${send('share-backup', 'Send history')}
      <button class="secondary" data-action="save-backup">Save history</button>
      ${send('share-program', 'Send program')}
      <button class="secondary" data-action="save-program">Save program</button>
      <button class="secondary" data-action="load-program">Load program</button>
      ${clear}
      <p class="backup-note">${summary}</p>
    </footer>`
}

export function renderPicker(programs: Program[], log: WorkoutLog, shareable: boolean): string {
  const cards = programs
    .map((program) => {
      const last = lastTrainedDate(log, program.id)
      const subtitle = last ? `Last session · ${formatDate(last)}` : 'No sessions yet'
      return `
        <button class="program" data-action="open" data-program="${escapeHtml(program.id)}">
          <span class="program-day">${escapeHtml(program.day)}</span>
          <span class="program-name">${escapeHtml(program.name)}</span>
          <span class="program-sub">${escapeHtml(subtitle)}</span>
        </button>`
    })
    .join('')
  return `<header class="app-header"><h1 class="wordmark">fitlog</h1></header><main class="picker">${cards}${renderBackup(
    log,
    shareable,
  )}</main>`
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

/**
 * Thumbnail reusing the guide's first photo, so a machine is recognisable
 * without reading the name. Exercises without a photo keep the same footprint
 * so the list stays aligned. The whole thumbnail opens the guide — a finger
 * needs a bigger target than the "?" badge drawn on it.
 */
function renderThumb(exercise: Exercise): string {
  const image = exercise.guide?.images?.[0]
  const id = escapeHtml(exercise.id)
  const inner = image
    ? `<img class="thumb" src="${escapeHtml(image)}"
            alt="" loading="lazy" />`
    : `<span class="thumb thumb-empty" aria-hidden="true">${escapeHtml(
        exercise.name.slice(0, 1),
      )}</span>`

  if (!exercise.guide) return `<div class="thumb-wrap">${inner}</div>`
  return `
    <button class="thumb-wrap" data-action="info" data-ex="${id}" aria-label="How to do it">
      ${inner}<span class="info" aria-hidden="true">?</span>
    </button>`
}

function renderExercise(exercise: Exercise, weights: number[] | null): string {
  const id = escapeHtml(exercise.id)
  const note = exercise.note ? `<p class="note">${escapeHtml(exercise.note)}</p>` : ''
  const perSet = weights !== null && weights.length > 1
  const canSplit = isWeighted(exercise) && exercise.sets !== undefined && exercise.sets > 1
  const toggle = canSplit
    ? `<button class="mode" data-action="toggle-sets" data-ex="${id}">${
        perSet ? 'same weight' : 'per-set weights'
      }</button>`
    : ''
  let rows = ''
  if (isWeighted(exercise)) {
    rows = perSet
      ? weights.map((weight, index) => renderSetRow(id, weight, index)).join('')
      : renderSetRow(id, weights === null ? null : weights[0]!, null)
  }
  // The toggle sits under the weights, not beside them: the stepper row alone
  // is wider than the space next to the thumbnail on narrow phones, so a
  // side-by-side toggle would overlap it.
  const body = rows ? `<div class="sets">${rows}${toggle}</div>` : ''

  return `
    <section class="exercise">
      ${renderThumb(exercise)}
      <div class="exercise-body">
        <div class="exercise-head">
          <span class="exercise-name">${escapeHtml(exercise.name)}</span>
          <span class="prescription">${escapeHtml(prescription(exercise))}</span>
        </div>
        ${note}
        ${body}
      </div>
    </section>`
}

export function renderGuide(exercise: Exercise): string {
  const guide = exercise.guide
  if (!guide) return ''
  const photos = (guide.images ?? [])
    .map(
      (image, index) =>
        `<img src="${escapeHtml(image)}" loading="lazy"
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
