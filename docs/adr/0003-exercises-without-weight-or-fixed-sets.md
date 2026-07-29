# 0003. Support exercises without weight or fixed sets

- Status: Accepted
- Date: 2026-07-29

## Context

ADR-0002 modelled every exercise as `sets` × `reps` with a working weight. The
actual programs do not fit that shape:

- Warm-up is five minutes on a bike — no sets, no reps, no weight.
- Bird dog and side plank carry no external load.
- Side plank is prescribed in seconds, suitcase carry in metres.
- Several exercises carry technique notes that exist for a specific reason:
  the user trains around a disc herniation, and the cue ("stop before the
  pelvis tucks") is the difference between the exercise helping and hurting.

## Decision

Extend the exercise definition from ADR-0002 with three optional fields rather
than introducing exercise subtypes:

```jsonc
{ "id": "side-plank", "name": "Side Plank (from knees)",
  "sets": 3, "reps": "20-30 sec per side", "tracksWeight": false,
  "note": "Keep hips stacked, body in a straight line" }
```

- **`sets` is optional.** When absent, the row shows the prescription alone
  ("5 min") instead of "1×5 min".
- **`tracksWeight` defaults to `true`.** When `false`, the row renders without
  weight controls and the exercise never appears in a session's entries.
  The flag is explicit rather than inferred from a missing `initialWeight`,
  so that a new loaded exercise is not silently treated as bodyweight.
- **`note` is an optional single line** rendered under the exercise name.
  Long-form coaching text is deliberately out of scope: nothing longer than one
  line gets read between sets.

`reps` stays a display string (ADR-0002), which already absorbs "10-12",
"8 per side", "20-30 sec per side" and "30 m per side" without new fields.

Set counts given as a range ("2-3 carries") are stored as a single number; the
user decides on the day. Making `sets` a range would break the per-set weight
array, whose length is tied to it.

## Consequences

- One exercise shape covers loaded, bodyweight, timed and distance work.
- Bodyweight exercises produce no history, which is correct — there is no
  progression variable to record.
- A prescription that genuinely needs a variable set count, or a bodyweight
  exercise that later gains added load, would need another look at this model.
