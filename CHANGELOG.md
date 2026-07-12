# Changelog

All notable changes to pi-cc-header.

## v0.6.0 (2026-07-12)

### Added

- 4-level 24-bit true-color gradient (light→dark) on final frame
- `/hgd` command to toggle gradient on/off
- `GMAP` color gradient table — gradient follows `/hc` color switching
- `logoColorKey` refactor: store color key instead of ANSI code

### Changed

- Pi pixels and stripes use `l1`–`l4` / `s1`–`s4` dynamic gradient levels
- `logoBrand` and `colorCell` use `CMAP[logoColorKey]` for dynamic color

## v0.5.1 (2026-07-12)

### Fixed

- Settings lost on restart/reload: `/hl`, `/hc`, `/hv` now persist to `settings.json` under `ccHeader` key

## v0.5.0 (2026-07-12)

### Added

- 7-color palette: red, orange, yellow, green, blue, purple, white
- `/hc` command to set header color (`/hc r`, `/hc b`, etc.)
- `/hv` command: toggle version number color (OFF / Pi only / Pi+version)
- `CMAP` color map and dynamic `logo` / `logoStripe` color types
- `logoBrand` function — Pi version text follows logo color

### Changed

- `/lined` renamed to `/hl`
- Final frame Pi and stripes now use dynamic color

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
