# 0001. Deliver fitlog as an installable PWA on GitHub Pages

- Status: Accepted
- Date: 2026-07-29

## Context

fitlog is a single-user gym companion used on one Android phone. During a
workout it must show the exercises of the selected program and let the user
adjust the working weight. The gym has unreliable connectivity, so the app must
work offline.

The app has a single maintainer who does not edit the code directly — changes
are made through AI agents. That makes "few dependencies, little framework
magic, readable in one sitting" a primary constraint rather than a preference.

Options considered: native Android (Kotlin + Compose), a cross-platform toolkit
(Flutter / React Native), and a web app installed to the home screen.

## Decision

Build fitlog as an installable PWA:

- **Vite + TypeScript, no UI framework.** The whole UI is a list of 6-8 rows
  that is re-rendered wholesale on every change. A framework would add more
  concepts and upgrade surface than it removes.
- **`vite-plugin-pwa` for the service worker.** Hand-written caching logic is
  the most likely way to strand a stale build on the phone; the plugin owns
  precache manifest and versioning.
- **GitHub Pages, deployed by GitHub Actions on push to `main`.** Static
  hosting with HTTPS, which the service worker requires. The repository is
  public; it contains only exercise names, never workout data.
- Interface language is English.

Rejected: native Android — every change would require a local Android SDK, a
rebuild and an APK install on the phone, which is a slow loop for a
single-user app. Rejected: cross-platform toolkits — a large toolchain for a
single target platform.

## Consequences

- Iteration is fast: push to `main`, reload on the phone.
- No app store, no signing, no release process.
- The app lives inside the browser's storage sandbox. Clearing browser data
  destroys the workout log (see ADR-0002).
- No access to native APIs. None are needed today; if that changes (background
  notifications, health integrations), this decision has to be revisited.
- Service worker caching means a new build is not always visible on the first
  reload after deployment.
