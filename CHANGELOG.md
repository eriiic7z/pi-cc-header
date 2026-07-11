# Changelog

All notable changes to pi-cc-header.

## v0.4.1 (2026-07-12)

### Added

- `/lined` command to toggle IBM stripes on/off
- `stripeEnabled` flag and `recomputeFrames()` function

### Changed

- `PRECOMPUTED_LOGO_FRAMES` changed from `const` to `let`

## v0.4.0 (2026-07-12)

### Added

- IBM-style horizontal stripes: non-Pi pixels on final frame render as `──`
- Stripe area constrained to Pi rows (y≥2) with symmetric margins (x≤6)
- Skip blank top row (y=1) in render

### Changed

- Added `stripe` color type to `LogoColor` and `colorCell`

## v0.3.0 (2026-07-12)

### Removed

- All mouse tracking, click-to-replay, and input listener code
- `handleInput`, `restart`, `enableMouse`, `disableMouse` methods

### Changed

- Timer restored to `readonly` — animation-only header

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
