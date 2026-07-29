# fitlog

A single-user gym companion: it shows the exercises of the selected workout and
keeps the working weight for each one. Installable on Android from the browser,
works offline.

## Using it

Open the app, pick a workout, and go down the list. Adjust a weight with `−` /
`+` (0.5 kg per tap) or type it in — typing takes any value, the step applies
to the buttons only. Exercises with a different weight per set have a **per
set** toggle that splits the row into one control per set.

Every edit is saved immediately. **Finish** exists for the case where the
workout happened but no weight changed — it records the session anyway.

Each exercise shows a thumbnail on the left; tapping it (marked with **?**)
opens the technique guide with photos and a short step list. Exercises whose
movement has no accurate photo in the source dataset show a letter placeholder
and steps only (see [ADR-0004](docs/adr/0004-bundle-exercise-photos-from-public-domain-database.md)).

## Editing the programs

The bundled `src/programs.json` is a demo. Personal programs are built on a
computer and imported on the phone, so they never enter this public repository
(see [ADR-0007](docs/adr/0007-programs-imported-as-a-self-contained-file.md)):

1. Put a `programs.json` (same schema as the demo) and its photos in a folder
   outside the repo, with `guide.images` given as paths relative to that
   folder.
2. Pack it into one self-contained file — photos are inlined as data URLs:

   ```sh
   node scripts/pack-program.mjs path/to/folder fitlog-program.json
   ```

3. Get the file onto the phone (send it to yourself in Telegram, for
   example) and either share it straight to the installed **fitlog** app from
   the Android share sheet, or save it and use **Load program** on the program
   picker.

The imported program is stored on the device (IndexedDB), works offline, and
replaces the demo from then on; importing another file replaces it again.

The phone can hand the program back out — **Send program** and **Save program**
on the picker export exactly what the app is running, in the same format
`Load program` accepts. Useful for moving the program to a second device, or
for recovering it when the computer's copy is gone. The export is what the app
parsed, so anything it ignores (the `$comment` block, unknown fields) is not in
the file that comes out.

To change the bundled demo instead: edit `src/programs.json` and push. The
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
    "images": ["data:image/jpeg;base64,..."],  // optional, self-contained data URLs
    "steps": ["Feet shoulder width...", "..."]
  }
}
```

The format is documented in full in the `$comment` field of
`src/programs.json`. Photos are always data URLs inside the file — in the
bundled demo too; the pack script produces them, and the demo's photos come
from [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
(Unlicense / public domain).

The `−` / `+` step is not in the file. It is `WEIGHT_STEP` in `src/main.ts`, so
changing it is a commit rather than a re-import — see
[ADR-0008](docs/adr/0008-weight-step-is-an-app-constant-not-a-program-field.md).
A program packed before that change still carries `weightStep`; it imports
fine, the field is ignored.

Renaming an `id` detaches that exercise's history and resets it — this applies
to imported programs too, since weights are looked up by the same ids. Names,
notes, reps and order can be changed freely.

## Where the data lives

Workout history is stored in the browser's `localStorage` on the phone and
never leaves the device unless you send it somewhere yourself. Clearing the
browser's site data deletes it permanently, so take a backup from the program
picker now and then:

- **Send history** opens the Android share sheet (Telegram, mail, anything
  else). The file is named `.txt` because Chromium refuses to share `.json`;
  its contents are still JSON — see
  [ADR-0005](docs/adr/0005-backup-via-web-share-with-download-fallback.md).
- **Save history** downloads `fitlog-<date>.json` to the device.

**Send program** and **Save program** export the program the same two ways, as
`fitlog-program-<date>`. The program is the one thing here that can be imported
back; the history cannot — restoring it means writing the JSON into
`localStorage` by hand.

**Clear history** erases every logged session, and with it the weights the app
starts each exercise from. It takes two taps — the first arms the button, the
second erases — and it is not shown when there is nothing logged.

## Development

```sh
npm install
npm run dev        # local dev server
npm test           # unit tests
npm run typecheck  # tsc --noEmit
npm run build      # production build into dist/
```

Design decisions are recorded in [`docs/adr/`](docs/adr/).
