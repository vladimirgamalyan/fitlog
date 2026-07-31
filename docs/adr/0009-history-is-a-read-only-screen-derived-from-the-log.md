# 0009. History is a read-only screen derived from the log

- Status: Accepted
- Date: 2026-07-31

## Context

Every workout is already recorded in `localStorage` (ADR-0002), but the app
showed only the last session's weights, on the exercise being trained. Whether
a weight went up over the last month, or which day a program was last trained
in full, could only be answered by exporting the log and reading the JSON.

## Decision

A **History** screen lists the logged sessions, newest first, one line each:
date with weekday and program name. Tapping a line expands it into one row per
exercise with the weights recorded for it. It is opened from a link in the
picker's header and is read-only — the log is written by training, and a
second way to edit it would be a second source of truth for the same numbers.

The list is a summary first because that is how it is read: months of training
scanned for the day being looked for, then one session opened. The rows are
`<details>` elements, so the open state is the browser's and the screen keeps
none of its own; any number of sessions can stand open at once, and entering
the screen renders fresh markup, which is what makes every session start
collapsed.

The screen renders `buildJournal(log, programs)`, a pure function over the
saved log; nothing new is stored. Ids are resolved to the names the *current*
program uses, and a session whose program or exercise is no longer installed
falls back to the stored id rather than being dropped, so importing another
program never hides past work.

Sets and reps are not shown. They live in the program, not in the log, so the
only value available is today's prescription — which may not be what was done
on the day being read.

Navigation reuses ADR-0006: the screen is a history entry, `{ journal: true }`,
a separate variant of the state rather than another optional field, so entries
pushed before this screen existed still describe a workout.

## Consequences

- Progress over time is readable on the phone, without an export.
- The open sessions are forgotten on the way out, since nothing records them.
  Leaving the screen and coming back means opening a session again.
- The link is hidden while the log is empty, so a fresh install is not offered
  a screen with nothing on it.
- Renaming an exercise rewrites its name throughout the journal, including
  sessions logged under the old name; renaming an `id` splits the journal in
  two, the same way it splits the weights (ADR-0002).
- Whatever the log does not hold — sets actually completed, reps, notes — is
  not recoverable here. Recording it would mean widening `SessionEntry` and a
  migration of stored logs.
