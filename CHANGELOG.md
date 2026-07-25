# Changelog

Notable changes to Routeveil are documented here.

## 0.2.0 - 2026-07-25

### Added

- Added shared-element transitions for page-transition navigation through `RouteveilSharedElement`.
- Added exact-name shared-element scroll anchors through `scrollToSharedElement` on links and programmatic navigation.
- Added explicit outgoing source selection through the `sharedElements` navigation option.
- Added shared-element lifecycle, selection, compatibility, package, documentation, and demo coverage.

### Changed

- Hardened transition interruption, focus, cleanup, timeout, and unmount behavior.
- Scoped automatic sharing to related links, and made absent incoming targets fall back without consuming the readiness deadline.
- Documented the ignore-while-active concurrency policy and external navigation handling.
- Expanded lifecycle, package, and browser-history test coverage.
- Verified and documented React 18 and React Router DOM 6.27 compatibility.

## 0.1.1 - 2026-07-22

### Fixed

- Corrected package output, metadata, documentation, and browser compatibility details.

## 0.1.0 - 2026-07-21

- Initial public release.
