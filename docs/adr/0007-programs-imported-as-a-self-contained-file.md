# 0007. Programs imported as a self-contained file, stored in IndexedDB

- Status: Accepted
- Date: 2026-07-29

## Context

The repository is public and is also the deployment source (ADR-0001), so
anything in `src/programs.json` and `public/exercises/` is visible to anyone.
The training program itself is personal data. It also changes on a different
rhythm than the app: a program tweak should not require a commit, a push and a
redeploy.

The owner edits programs on a computer; the phone only consumes them. A file
sent through a chat app (Telegram) is the natural transport between the two.

## Decision

A program is one self-contained JSON file in the existing `ProgramsFile`
schema, with guide photos inlined as data URLs. `scripts/pack-program.mjs`
builds it on the computer from a folder holding `programs.json` plus image
files; the folder lives outside the repository.

Two import paths on the phone, both ending in the same code:

- **Load program** on the picker opens a file picker (works everywhere,
  including iOS).
- The PWA is an Android **share target**: the manifest declares a
  `share_target` POST endpoint, and the service worker answers it by stashing
  the file's text in IndexedDB and redirecting to the app, which imports the
  pending text on launch. Declaring a share target requires a hand-written
  fetch handler, so the worker moved from the plugin-generated one to
  `src/sw.ts` (`injectManifest`).

Every imported file is validated field by field (`programImport.ts`) before it
replaces anything; a refused file leaves the previous programs untouched and
shows the reason on the button.

The imported file is stored in **IndexedDB**, not `localStorage`: with photos
inlined, a two-day split is already ~1.5 MB, a third of the ~5 MB quota the
workout log shares. The bundled `src/programs.json` stays as a demo and as the
fallback when nothing was imported.

## Consequences

- Personal programs and photos never enter the public repository; the repo
  ships only a generic demo.
- Program changes reach the phone without a deploy: pack, send, import.
- Weights are keyed by program and exercise ids (ADR-0002), so an imported
  update keeps the history of every exercise whose id is unchanged.
- The photos travel inside the JSON as base64 (~1.3× the raw bytes) and are
  stored once in IndexedDB; offline works without any service-worker caching
  of images.
- There is no "reset to demo" control: importing another file is the only way
  to replace an imported program. Clearing site data also removes it —
  together with the workout log.
- The share sheet path works only on Android with the PWA installed; other
  platforms use the file picker.
