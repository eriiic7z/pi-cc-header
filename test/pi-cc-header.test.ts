import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import {
	pick,
	stateFromConfig,
	colorCell,
	logoCellColor,
	piLogoRgb,
	piLogoCellColor,
	gradientLevel,
	shadesFromRgb,
	accentOpenToRgb,
	themeAccentShades,
	formatCwd,
	buildRuntimePaths,
	MAX_SLOGAN_LENGTH,
	configWritesEnabled,
	collectSkillNames,
} from "../extensions/pi-cc-header.ts";

// ── pick ──
describe("pick", () => {
	it("returns val when guard passes", () => {
		assert.equal(
			pick(42, (v) => typeof v === "number", 0),
			42,
		);
	});
	it("returns fallback when guard fails", () => {
		assert.equal(
			pick("hi", (v) => typeof v === "number", 99),
			99,
		);
	});
	it("handles boolean guard", () => {
		assert.equal(
			pick(true, (v) => typeof v === "boolean", "nope"),
			true,
		);
	});
	it("rejects mismatched truthy types", () => {
		assert.equal(
			pick(1, (v) => typeof v === "string", "fallback"),
			"fallback",
		);
	});
});

// ── stateFromConfig ──
describe("stateFromConfig", () => {
	it("returns defaults for empty config", () => {
		const s = stateFromConfig({});
		assert.equal(s.logoColorKey, "c");
		assert.equal(s.versionColored, 1);
		assert.equal(s.gradientOn, true);
		assert.equal(s.stripeEnabled, true);
	});

	it("reads valid color key", () => {
		const s = stateFromConfig({ color: "a" });
		assert.equal(s.logoColorKey, "a");
	});

	it("rejects invalid color key (falls back)", () => {
		const s = stateFromConfig({ color: "z" });
		assert.equal(s.logoColorKey, "c");
	});

	it("reads versionColored", () => {
		const s = stateFromConfig({ ver: 2 });
		assert.equal(s.versionColored, 2);
	});

	it("rejects non-number ver", () => {
		const s = stateFromConfig({ ver: "2" });
		assert.equal(s.versionColored, 1);
	});

	it("reads speed within range", () => {
		const s = stateFromConfig({ speed: 100 });
		assert.equal(s.logoInterval, 100);
	});

	it("rejects invalid speed (falls back)", () => {
		const s = stateFromConfig({ speed: 30 });
		assert.equal(s.logoInterval, 50);
	});

	it("reads slogan", () => {
		const s = stateFromConfig({ slogan: "hello world" });
		assert.equal(s.slogan, "hello world");
		assert.equal(s.sloganOn, true);
	});

	it("rejects overlong slogan (falls back to default)", () => {
		const overlong = "x".repeat(MAX_SLOGAN_LENGTH + 1);
		const s = stateFromConfig({ slogan: overlong });
		assert.equal(s.slogan, "Code something that makes you proud");
	});

	it("color key pi: logo RGB + theme accent", () => {
		assert.equal(stateFromConfig({ color: "pi" }).logoColorKey, "pi");
	});
});

describe("configWritesEnabled", () => {
	it("returns false when readOnlyConfig is enabled", () => {
		assert.equal(
			configWritesEnabled({ ccHeader: { readOnlyConfig: true } }),
			false,
		);
	});

	it("ignores non-object ccHeader values", () => {
		assert.equal(configWritesEnabled({ ccHeader: true as any }), true);
		assert.equal(configWritesEnabled({ ccHeader: [] as any }), true);
	});

	it("returns true by default", () => {
		assert.equal(configWritesEnabled({ ccHeader: {} }), true);
		assert.equal(configWritesEnabled({}), true);
		assert.equal(configWritesEnabled(null), true);
	});
});

// ── colorCell ──
describe("colorCell", () => {
	it("renders cyan cell", () => {
		const c = colorCell("cyan");
		assert.ok(c.includes("36m"));
		assert.ok(c.includes("██"));
	});

	it("renders logo cell in default (clawd) color", () => {
		const c = colorCell("logo");
		assert.ok(c.includes("38;2;251;73;52"));
	});

	it("renders panel default", () => {
		assert.equal(colorCell("panel"), "  ");
	});

	it("renders white cell", () => {
		assert.equal(colorCell("white"), "\x1b[39m██");
	});

	it("renders gradient l1 from default color map", () => {
		const c = colorCell("l1");
		assert.ok(c.includes("██"));
		assert.ok(c.includes("38;2;"));
	});
});

// ── logoCellColor ──
describe("logoCellColor", () => {
	const stillFrame = {
		phase: 6,
		active: "none" as const,
		ax: 0,
		ay: 0,
		flash: false,
		white: false,
	};

	it("returns panel for empty area (1,1)", () => {
		assert.equal(logoCellColor(stillFrame, 1, 1), "panel");
	});

	it("returns logo for white cell on Pi shape", () => {
		const c = logoCellColor(stillFrame, 5, 3); // (3,5) → WHITE_CELLS
		assert.ok(c.startsWith("l") || c === "logo");
	});

	it("returns flash for flash frame", () => {
		const flashFrame = { ...stillFrame, flash: true, white: false };
		assert.equal(logoCellColor(flashFrame, 6, 3), "flash");
	});
});

// ── piLogoRgb ──
describe("piLogoRgb", () => {
	it("maps Pi cells to animation colors", () => {
		assert.equal(piLogoRgb(3, 2), "cyan");
		assert.equal(piLogoRgb(4, 4), "cyan");
		assert.equal(piLogoRgb(4, 2), "red");
		assert.equal(piLogoRgb(6, 2), "red");
		assert.equal(piLogoRgb(5, 5), "green");
		assert.equal(piLogoRgb(6, 5), "green");
	});

	it("covers all 10 Pi cells, panel elsewhere", () => {
		const piCells: [number, number][] = [
			[3, 2],
			[3, 3],
			[3, 4],
			[4, 2],
			[4, 4],
			[5, 2],
			[5, 3],
			[5, 5],
			[6, 2],
			[6, 5],
		];
		for (const [y, x] of piCells) assert.notEqual(piLogoRgb(y, x), "panel");
		assert.equal(piLogoRgb(1, 1), "panel");
	});
});

// ── shadesFromRgb ──
describe("shadesFromRgb", () => {
	it("keeps level 0 equal to the base color", () => {
		assert.equal(shadesFromRgb([122, 170, 255])[0], "38;2;122;170;255");
	});

	it("darkens monotonically across 4 levels", () => {
		const shades = shadesFromRgb([122, 170, 255]);
		assert.equal(shades.length, 4);
		const parse = (s: string) =>
			s.match(/38;2;(\d+);(\d+);(\d+)/)!.slice(1).map(Number);
		const levels = shades.map(parse);
		for (let i = 1; i < levels.length; i++) {
			for (let c = 0; c < 3; c++) {
				assert.ok(
					levels[i][c] <= levels[i - 1][c],
					`${shades[i]} should not be brighter than ${shades[i - 1]}`,
				);
			}
		}
	});
});

// ── piLogoCellColor ──
describe("piLogoCellColor", () => {
	const parse = (s: string) => s.match(/38;2;(\d+);(\d+);(\d+)/)!.slice(1).map(Number);

	it("uses the brand colors of the built-in Pi logo", () => {
		assert.deepEqual(parse(piLogoCellColor(3, 2, false)), [228, 138, 122]);
		assert.deepEqual(parse(piLogoCellColor(4, 2, false)), [79, 142, 179]);
		assert.deepEqual(parse(piLogoCellColor(5, 5, false)), [234, 182, 93]);
	});

	it("keeps every brand color flat when the gradient is off", () => {
		assert.equal(piLogoCellColor(3, 2, false), piLogoCellColor(4, 4, false));
		assert.equal(
			piLogoCellColor(4, 2, false),
			piLogoCellColor(6, 2, false),
		);
		assert.equal(piLogoCellColor(5, 5, false), piLogoCellColor(6, 5, false));
		assert.notEqual(
			piLogoCellColor(3, 2, false),
			piLogoCellColor(4, 2, false),
		);
	});

	it("darkens the logo top-down when the gradient is on", () => {
		const levels = [4, 5, 6].map((y) => parse(piLogoCellColor(y, 2, true)));
		for (let i = 1; i < levels.length; i++) {
			for (let c = 0; c < 3; c++) {
				assert.ok(
					levels[i][c] <= levels[i - 1][c],
					"row gradient must not get brighter downwards",
				);
			}
		}
		assert.notDeepEqual(
			parse(piLogoCellColor(3, 2, true)),
			parse(piLogoCellColor(6, 2, true)),
		);
	});

	it("returns blank space for a non-logo cell", () => {
		assert.equal(piLogoCellColor(1, 1, true), "  ");
	});
});

// ── gradientLevel ──
describe("gradientLevel", () => {
	it("maps rows to 4 shade levels", () => {
		assert.equal(gradientLevel(1), 0);
		assert.equal(gradientLevel(3), 0);
		assert.equal(gradientLevel(4), 1);
		assert.equal(gradientLevel(5), 2);
		assert.equal(gradientLevel(6), 3);
		assert.equal(gradientLevel(7), 3);
	});
});

// ── accentOpenToRgb / themeAccentShades ──
describe("themeAccentShades", () => {
	it("parses truecolor open code", () => {
		assert.deepEqual(accentOpenToRgb("\x1b[38;2;100;150;200m"), [100, 150, 200]);
	});

	it("rejects non-truecolor and garbage", () => {
		assert.equal(accentOpenToRgb("\x1b[38;5;129m"), null);
		assert.equal(accentOpenToRgb("\x1b[39m"), null);
		assert.equal(accentOpenToRgb(""), null);
		assert.equal(accentOpenToRgb("\x1b[38;2;999;0;0m"), null);
	});

	it("builds 4 shades from theme accent", () => {
		const shades = themeAccentShades({
			getFgAnsi: () => "\x1b[38;2;100;150;200m",
		});
		assert.ok(shades !== null && shades.length === 4);
		assert.equal(shades[0], "38;2;100;150;200");
		assert.equal(shades[3], "38;2;60;90;120");
	});

	it("falls back to null without truecolor accent", () => {
		assert.equal(themeAccentShades({}), null);
		assert.equal(
			themeAccentShades({ getFgAnsi: () => "\x1b[38;5;129m" }),
			null,
		);
		assert.equal(
			themeAccentShades({
				getFgAnsi: () => {
					throw new Error("Unknown theme color");
				},
			}),
			null,
		);
	});
});

// ── buildRuntimePaths ──
describe("buildRuntimePaths", () => {
	it("builds settings and resource paths from custom agentDir", () => {
		const paths = buildRuntimePaths("/tmp/custom-agent");
		assert.equal(paths.settingsPath, "/tmp/custom-agent/settings.json");
		assert.equal(paths.npmRoot, "/tmp/custom-agent/npm/node_modules");
		assert.equal(paths.globalSkillsDir, "/tmp/custom-agent/skills");
		assert.equal(paths.globalAgentsPath, "/tmp/custom-agent/AGENTS.md");
	});

	it("builds project-local paths from configurable config dir name", () => {
		const paths = buildRuntimePaths(
			"/tmp/custom-agent",
			"/work/repo",
			".config-pi",
		);
		assert.equal(paths.projectSkillsDir, "/work/repo/.config-pi/skills");
		assert.equal(paths.projectAgentsPath, "/work/repo/.config-pi/AGENTS.md");
	});
});

// ── formatCwd ──
describe("formatCwd", () => {
	const home = homedir();

	if (home) {
		it("abbreviates home directory", () => {
			const cwd = join(home, "projects", "test");
			assert.equal(formatCwd(cwd), `~${cwd.slice(home.length)}`);
		});
	}

	it("returns path unchanged when not under home", () => {
		const result = formatCwd("/tmp/somewhere");
		assert.equal(result, "/tmp/somewhere");
	});
});

// ── collectSkillNames ──
describe("collectSkillNames", () => {
	const makeRoot = () => mkdtempSync(join(tmpdir(), "cch-skills-"));

	it("counts skill dirs containing SKILL.md", () => {
		const root = makeRoot();
		try {
			mkdirSync(join(root, "alpha"));
			writeFileSync(join(root, "alpha", "SKILL.md"), "---\nname: alpha\n---\n");
			mkdirSync(join(root, "beta"));
			writeFileSync(join(root, "beta", "SKILL.md"), "---\nname: beta\n---\n");
			const names = new Set<string>();
			collectSkillNames(root, names, 0);
			assert.deepEqual([...names].sort(), ["alpha", "beta"]);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("recurses into grouping dirs without SKILL.md", () => {
		const root = makeRoot();
		try {
			mkdirSync(join(root, "group", "alpha"), { recursive: true });
			writeFileSync(
				join(root, "group", "alpha", "SKILL.md"),
				"---\nname: alpha\n---\n",
			);
			mkdirSync(join(root, "group", "beta"), { recursive: true });
			writeFileSync(
				join(root, "group", "beta", "SKILL.md"),
				"---\nname: beta\n---\n",
			);
			const names = new Set<string>();
			collectSkillNames(root, names, 0);
			assert.deepEqual([...names].sort(), ["alpha", "beta"]);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("ignores dirs without SKILL.md and md without frontmatter", () => {
		const root = makeRoot();
		try {
			mkdirSync(join(root, "empty"));
			writeFileSync(join(root, "README.md"), "# readme\n");
			writeFileSync(join(root, "notes.md"), "no frontmatter\n");
			const names = new Set<string>();
			collectSkillNames(root, names, 0);
			assert.deepEqual([...names], []);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("counts md with frontmatter, including README.md", () => {
		const root = makeRoot();
		try {
			writeFileSync(join(root, "tips.md"), "---\nname: tips\n---\nbody\n");
			writeFileSync(join(root, "README.md"), "---\nname: readme-skill\n---\n");
			const names = new Set<string>();
			collectSkillNames(root, names, 0);
			assert.deepEqual([...names].sort(), ["README.md", "tips.md"]);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("bounds recursion depth", () => {
		const root = makeRoot();
		try {
			let p = root;
			for (let i = 0; i < 10; i++) {
				p = join(p, `d${i}`);
				mkdirSync(p);
			}
			writeFileSync(join(p, "SKILL.md"), "---\nname: deep\n---\n");
			const names = new Set<string>();
			collectSkillNames(root, names, 0);
			assert.equal(names.size, 0); // 超出深度上限，最深 skill 不可达
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
