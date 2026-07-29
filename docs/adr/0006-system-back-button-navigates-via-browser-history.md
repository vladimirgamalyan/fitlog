# 0006. Navigate via browser history so the system back button works

- Status: Accepted
- Date: 2026-07-29

## Context

The app is a single-page PWA with three screens — program picker, workout,
exercise guide — driven by two in-memory variables. The browser history never
changed, so on an installed Android app the system back button (or gesture)
always closed the app, even from inside a workout where "back" naturally means
"to the program list". The in-app back button existed, but the system gesture
is the habitual one on a phone.

## Decision

Entering a workout or a guide pushes a history entry whose state is
`{ programId, exerciseId? }`; the initial entry (null state) is the picker. A
`popstate` listener rebuilds the screen from the entry's state, so the system
back button walks guide → workout → picker and only closes the app from the
picker.

The in-app back button and **Finish** call `history.back()` instead of
mutating screen state directly: there is a single navigation mechanism, and
the visible screen cannot drift apart from the history stack. The screen is
derived from the entry alone, not from the click path, so a multi-entry jump
(long-press history menu, forward gesture) also lands on a consistent screen.

When a jump lands on a workout, the draft weights are rebuilt from the saved
log. Nothing is lost that way: every weight change is persisted immediately
(ADR-0002), so the log always holds the current values.

## Consequences

- The system back button and the iOS edge swipe navigate the app instead of
  closing it; forward gestures re-enter the screen that was left.
- A reload restores the screen it happened on, because the current history
  entry survives reloads. A fresh launch starts at the picker.
- A history entry can go stale — a program id that no longer exists after
  `programs.json` is edited. Such entries fall back to the picker; leaving
  them in the stack costs at most an extra back press.
- The guide's scroll-position restore now runs inside the `popstate` handler;
  it behaves the same as before but depends on the browser firing `popstate`
  for same-document traversals, which all supported browsers do.
