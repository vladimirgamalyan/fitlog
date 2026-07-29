# 0008. The weight step is an app constant, not a program field

- Status: Accepted
- Date: 2026-07-29

## Context

[ADR-0002](0002-session-log-as-source-of-truth-for-weights.md) put `weightStep`
— the kilograms one tap of `−` / `+` adds or removes — at the top of the
program file, next to the programs themselves.

Personal programs are not in this repository. They are packed on a computer and
imported on the phone ([ADR-0007](0007-programs-imported-as-a-self-contained-file.md)),
photos inlined, which makes the file a few hundred kilobytes. Changing the step
therefore meant editing that file, re-packing it, moving it to the phone and
importing it again — the whole program data shuffled to change one number.

That number turns out to change on its own schedule: the step went 2.5 → 1 →
0.5 as the smallest plates in use changed, while the programs stood still. It
is a property of the user's gym and preference, not of any program. Nothing in
the file's purpose ties them together, and no second program ever wanted a
different step.

## Decision

**The step is a constant in the app; the file format no longer has a
`weightStep` field.**

```ts
/** Kilograms added or removed by one tap of the -/+ buttons. */
const WEIGHT_STEP = 0.5
```

Changing it is a one-line commit that deploys itself: the service worker
updates on its own (`registerType: 'autoUpdate'`), so an already-imported
program picks up the new step with no re-import.

Import validation drops the field rather than rejecting it. A file packed
before this change carries `weightStep` and is accepted unchanged — it falls
under the existing rule that unknown fields are ignored, so no migration and no
re-packing is needed.

The step applies only to the `−` / `+` buttons. Typing a weight is unaffected
and still accepts any value the input allows.

## Consequences

- Two programs cannot have different steps. No program ever asked for this, and
  a per-program step would return the maintenance problem the decision removes.
- Changing the step needs a deploy rather than a file edit. This is the cheaper
  direction: a commit and push against re-packing and re-importing a
  multi-megabyte file on a phone.
- The step is no longer visible in the program file, so the file no longer
  documents it. `src/programs.json` says where it went, and this ADR is
  referenced from the constant.
- ADR-0002's example still shows `weightStep`. It records the state at the time
  and is left alone; this ADR supersedes that part of it.
