# Changelog

All notable changes to pi-cc-header.

## v0.8.3 (2026-07-16)

### Changed

- README: full restructure — clarified project positioning, reorganized and reworded Features, added Takes effect column to Commands, expanded enable/disable/reset guide

## v0.8.2 (2026-07-16)

### Changed

- package.json description: rewritten for Claude Code–style positioning — 9-color palette, IBM stripes, and Minecraft gradient themes

## v0.8.1 (2026-07-16)

### Fixed

- README: added missing screenshot to Chinese section, both language sections now symmetric

---

## v0.8.0 (2026-07-16)

### Added

- Clawd crab red `c` color — sRGB(251, 73, 52), the brighter Claude Code mascot orange
- Anthropic brand orange `a` color — rgb(217, 119, 87) (replaces the former `c` as the brand color key; now the default)
- 9-color palette (c a r o y g w b p)

### Changed

- `/hl` renamed to `/hi` — description: "Toggle IBM-style on/off"
- `/hg` renamed to `/hm` — description: "Toggle Minecraft-style on/off"
- `/hc` command palette updated: c=clawd a=anthropic r=red o=orange y=yellow g=green w=white b=blue p=purple
- `/hdf` developer defaults: color → `c`, version color → Pi+ver
- README Features: "14-frame Minecraft-style pixel animated Pi logo"
- README: added animated demo GIF between Features and Commands
- package.json keywords: add "extension" for pi.dev search listing
- package.json files: add "assets" so screenshots render on npm and pi.dev

### Fixed

- `/hv`, `/hi`, `/hm`, `/hdf` no longer duplicate the header and conversation — `clearMode` switched from `"viewport"` to `"none"`
- `/hrl` no longer double-creates the header before `ctx.reload()`

---

## v0.7.4 (2026-07-14)

### Added

- Crab orange `c` color (Claude Code accent), now the default

### Changed

- Green CMAP aligned to GMAP L3 (24-bit RGB)
- Blue CMAP aligned to GMAP L3 (24-bit RGB)
- White GMAP gradient re-centered on warm white base

## v0.7.3 (2026-07-14)

### Changed

- CMAP/GMAP color order adjusted to r/o/y/g/w/b/p

### Fixed

- `/hc` command no longer clears input border and status bar
- Style command switching no longer clears input border and status bar — `apply()` now uses viewport-only clear for commands, full clear only on session start

## v0.7.1 (2026-07-13)

### Added

- `/hrl` command to toggle resource list visibility on startup

### Changed

- `/htg` disable: manual TUI restore instead of `ctx.reload()` — applies on next session
- Clear screen moved to `apply()` to cover resource list output

### Fixed

- `/htg` re-enable missing `clearOnStart` causing stale resource list
- Removed `setFooter()` and `setWorkingIndicator()` from `apply()` — no longer overrides native footer

## v0.7.0 (2026-07-13)

### Added

- `/htg` command to toggle pi-cc-header enabled/disabled (config preserved)
- `/hdf` command to reset to developer defaults
- Style commands locked when pi-cc-header is disabled (blind-config guard)
- `disabled` flag in `ccHeader` config, persisted across reload/restart

### Changed

- `/hgd` renamed to `/hg`
- `/pi-look` renamed to `/htg` (originally `/h-off`)
- All commands unified to `h` + letter/double-letter naming: `/hl`, `/hc`, `/hv`, `/hg`, `/htg`, `/hdf`
- Screen clear on every startup (unconditional, `/clear-on-start` removed)
- `quietStartup` forced `true` on every session start

### Removed

- `/clear-on-start` command (now automatic and non-toggleable)

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
