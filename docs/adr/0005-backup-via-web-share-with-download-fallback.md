# 0005. Back up the log via Web Share, falling back to a download

- Status: Accepted
- Date: 2026-07-29

## Context

ADR-0002 left the workout log in `localStorage` with no way out, and named the
consequence: clearing the browser's site data destroys the history. The
intended remedy was a JSON export.

The practical requirement is to get the file into a chat app (Telegram) from
the phone — the same "share to…" sheet other Android apps offer — while still
being able to just save the file locally.

## Decision

Two buttons on the program picker: **Send backup** (Web Share) and **Save
file** (download). *Send backup* is hidden when the browser cannot share files
at all, so desktop keeps only the download.

**The shared file is `fitlog-<date>.txt`, the downloaded one is
`fitlog-<date>.json`.** Both contain the same JSON. Chromium only shares files
whose extension is on a fixed permitted list, and `.json` is not on it —
sharing it fails on the device. Worse, `navigator.canShare()` returns `true`
for a `.json` file anyway, so the check cannot be used to detect the problem:
verified in Chromium, where `canShare` accepted `application/json`. `.txt` with
`text/plain` is on the list and reaches any chat app. Downloads have no such
restriction, so the locally saved copy keeps the honest extension.

A share that fails for any reason other than the user cancelling falls back to
a download, so pressing the button never leaves the user without a backup.

Restoring from a backup is not implemented. Recovery means pasting the file
back into `localStorage` by hand — acceptable for an event that should happen
approximately never, and building an import screen for it now would be
speculative.

## Consequences

- The history can be moved off the phone, which is what made the storage risk
  in ADR-0002 acceptable in the first place.
- The shared file arrives named `.txt`. Chat apps show it as a text file; its
  contents are still JSON.
- The export is a raw dump of the log, not a report. Reading it means reading
  exercise ids and numbers.
- Nothing reminds the user to take a backup; it is a manual habit.
