# Changelog

All notable changes to this project will be documented in this file.

## [0.0.7] - 2026-04-21

### Added

- Added terminal context menu and shortcut support for sending terminal selections to Codex.
- Added terminal capture attachments with terminal metadata headers so Codex can interpret the content as terminal output or logs.
- Added automatic cleanup for terminal capture temp files with configurable retention and max-file settings.
- Added terminal capture cleanup tests and manifest coverage for the new settings.

### Changed

- Changed terminal capture attachment names to short terminal-based labels such as `fish-1`.
- Changed the editor title action to send the current file to Codex instead of the current selection.

## [0.0.6] - 2026-04-20

### Added

- Added a dedicated Codex Link sidebar with actions for opening Codex, adding the current file, and picking files or folders.
- Added best-effort drag and drop support for files and folders in the sidebar.

### Changed

- Improved messaging and packaging metadata for the public extension release.

## [0.0.5] - 2026-04-18

### Added

- Added marketplace and publishing metadata for VS Code Marketplace and Open VSX releases.
- Added configurable selection visibility thresholds for single-line CodeLens actions.

### Changed

- Refined selection and manifest validation coverage.

## [0.0.4] - 2026-04-18

### Added

- First tagged public release of Codex Link.
