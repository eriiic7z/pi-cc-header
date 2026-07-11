# Changelog

All notable changes to pi-cc-header.

## v0.2.1 (2026-07-12)

### Changed

- Simplified mouse tracking: always ON, no toggle on non-logo clicks
- Non-logo mouse events ignored

## v0.2.0 (2026-07-11)

### Added

- Frame precomputation for zero-cost logo rendering
- Mouse tracking with SGR event parsing
- Click-to-replay animation on logo area
- Non-logo click toggles tracking off with 2s auto-reenable
- Input listener via `tui.addInputListener` / `ctx.ui.onTerminalInput`

### Changed

- Removed dead `gap` variable
- Merged double null-check of `info[i]` in render

## v0.1.0 (2026-07-10)

### Added

- Initial release: Pi logo pixel animation from pi.dev/install.sh
- 14-frame animation with phase-based color logic
- Header displays Pi version, model, thinking level, extension/skill counts, cwd
- `clear-on-start` and `pi-look` commands
