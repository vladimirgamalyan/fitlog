# 0004. Bundle exercise photos from a public-domain database

- Status: Accepted
- Date: 2026-07-29

## Context

Each exercise needs a reference screen showing how it is performed, with
photos. Photos cannot be authored here, and pulling images off the web into a
public repository is a copyright problem regardless of how the app uses them.

Two open datasets were considered:

- [free-exercise-db](https://github.com/yuhonas/free-exercise-db) — 873
  exercises, two photos each, released under the Unlicense (public domain, no
  attribution required).
- [wger](https://github.com/wger-project/wger) — comparable catalogue under
  CC-BY-SA 4.0, which requires visible attribution and share-alike on
  derivatives.

Neither dataset contains every prescribed exercise, and some entries match the
movement but not the equipment (a barbell glute bridge where a dumbbell is
used, a two-handed farmer's walk where a one-handed suitcase carry is used).

## Decision

Use free-exercise-db photos, copied into `public/exercises/` as
`<exercise-id>-{0,1}.jpg` and committed to the repository. Public domain means
no attribution obligation and no licence bleed into this project.

**Only exact movement matches get photos.** Where the dataset offers a similar
but differently-loaded exercise, the guide ships text only. A photo showing the
wrong implement teaches the wrong thing, and the reason this app exists is that
technique details matter for the user's back. Three exercises — glute bridge,
suitcase carry, bird dog — therefore have no photo.

**Step-by-step text is written for this app**, not taken from the dataset. Its
instructions run four to six paragraphs of general coaching; what is useful
between sets is three to five lines that name the failure mode for this
specific lifter.

Photos are precached by the service worker: `jpg` is not in the plugin's
default `globPatterns`, so it is set explicitly. A gym is exactly where the
network is unreliable and the reference is needed.

## Consequences

- The first install downloads ~1.1 MB of photos and then works fully offline.
- Adding an exercise to `programs.json` means manually finding a matching
  entry in the dataset and copying its two files; there is no import script for
  a set of programs this small.
- The guide text is a maintained asset: if a program changes, its steps have to
  be rewritten rather than regenerated.
- Photos are stock images of a different gym and different machines. They show
  the movement, not the user's equipment.
