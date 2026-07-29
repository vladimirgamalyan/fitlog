# fitlog

A single-user gym companion: it shows the exercises of the selected workout and
keeps the working weight for each one. Installable on Android from the browser,
works offline.

## Using it

Open the app, pick **Workout A** or **Workout B**, and go down the list. Adjust
a weight with `−` / `+` (2.5 kg per tap) or type it in. Exercises with a
different weight per set have a **per set** toggle that splits the row into one
control per set.

Every edit is saved immediately. **Finish** exists for the case where the
workout happened but no weight changed — it records the session anyway.

Each exercise shows a thumbnail on the left; tapping it (marked with **?**)
opens the technique guide with photos and a short step list. Exercises whose
movement has no accurate photo in the source dataset show a letter placeholder
and steps only (see [ADR-0004](docs/adr/0004-bundle-exercise-photos-from-public-domain-database.md)).

## Editing the programs

Programs are data, not settings: edit `src/programs.json` and push. The
deployment workflow rebuilds and publishes the app.

```jsonc
{
  "id": "leg-press",      // stable key — history is attached to it, never rename
  "name": "Leg Press",    // shown on screen, free to change
  "sets": 3,              // optional; omit for a warm-up and similar
  "reps": "10-12",        // display only: "8 per side", "20-30 sec per side", ...
  "tracksWeight": false,  // optional, default true — false for bodyweight work
  "initialWeight": 60,    // optional starting weight before any history exists
  "note": "Short range",  // optional one-line technique cue
  "guide": {              // optional; without it the "?" button is not shown
    "images": ["exercises/leg-press-0.jpg"],  // optional, relative to public/
    "steps": ["Feet shoulder width...", "..."]
  }
}
```

Guide photos come from [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
(Unlicense / public domain) and live in `public/exercises/` as
`<exercise-id>-{0,1}.jpg`.

Renaming an `id` detaches that exercise's history and resets it. Names, notes,
reps and order can be changed freely.

## Where the data lives

Workout history is stored in the browser's `localStorage` on the phone and
never leaves the device unless you send it somewhere yourself. Clearing the
browser's site data deletes it permanently, so take a backup from the program
picker now and then:

- **Send backup** opens the Android share sheet (Telegram, mail, anything
  else). The file is named `.txt` because Chromium refuses to share `.json`;
  its contents are still JSON — see
  [ADR-0005](docs/adr/0005-backup-via-web-share-with-download-fallback.md).
- **Save file** downloads `fitlog-<date>.json` to the device.

There is no import: restoring means writing the JSON back into `localStorage`
by hand.

## Development

```sh
npm install
npm run dev        # local dev server
npm test           # unit tests
npm run typecheck  # tsc --noEmit
npm run build      # production build into dist/
```

Design decisions are recorded in [`docs/adr/`](docs/adr/).
