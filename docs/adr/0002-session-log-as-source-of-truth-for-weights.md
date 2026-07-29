# 0002. Session log is the source of truth for working weights

- Status: Accepted
- Date: 2026-07-29

## Context

The user trains twice a week against two fixed programs. The app must show the
weight used last time and let it be corrected when plates are added. Program
composition changes rarely and is edited by hand; weights change often and are
edited on the phone.

Usually one weight applies to every set of an exercise, but some exercises ramp
across sets (60/70/80). Both cases must be supported from the start.

## Decision

**Program definitions are static, weights are not stored on them.**

Programs live in a JSON file bundled with the app and are edited in the
repository:

```jsonc
{
  "weightStep": 2.5,
  "programs": [
    { "id": "a", "name": "Workout A", "exercises": [
      { "id": "bench-press", "name": "Bench Press", "sets": 3, "reps": "8" },
      { "id": "squat", "name": "Squat", "sets": 4, "reps": "8-12",
        "initialWeight": 60 }
    ]}
  ]
}
```

Workout history lives in `localStorage`:

```jsonc
{ "version": 1,
  "sessions": [
    { "id": "…", "date": "2026-07-29", "programId": "a",
      "entries": [
        { "exerciseId": "bench-press", "weights": [80] },
        { "exerciseId": "squat", "weights": [60, 70, 80, 80] }
      ] } ] }
```

Supporting rules:

- **The current weight is derived, never stored.** It is resolved as: the
  entry for this exercise in the most recent session of this program →
  `initialWeight` → unset, shown as `—`. There is no second place holding a
  "current weight" that could drift out of sync.
- **`weights` is always an array.** Length 1 means one weight for all sets;
  length equal to `sets` means a per-set weight. Modelling it as a number now
  and generalising later would touch every layer. If a stored length matches
  neither (because `sets` changed in the JSON), it is padded with its last
  value or truncated on read.
- **`exerciseId` is a stable string key**, not an array index, so reordering or
  inserting exercises in the JSON does not corrupt existing history.
- **`reps` is a display string** (`"8"`, `"8-12"`). Nothing computes over it.
- **A session is persisted only if it was touched.** Any weight edit writes to
  today's session for that program immediately, so nothing is lost by closing
  the app. The explicit *Finish* button exists for the case where the workout
  happened but no weight changed. Opening a program and leaving records
  nothing.

## Consequences

- Editing a program means editing JSON in the repository and deploying — there
  is no in-app editor. Acceptable for a single user whose programs are stable.
- Weight history accumulates for free and is available whenever a progress view
  becomes worth building. No history screen ships in the first version.
- Because history exists only in `localStorage` and no export ships in the
  first version, clearing browser data on the phone destroys it permanently. A
  JSON export is the intended remedy when the log becomes valuable.
- Renaming an `exerciseId` in the JSON detaches its history and resets the
  exercise to `initialWeight`. Names may change freely; ids must not.
- Per-set weights make the row layout variable-height: collapsed exercises are
  one row, expanded ones are one row per set.
