import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	pick,
	stateFromConfig,
	colorCell,
	logoCellColor,
	formatCwd,
	MAX_SLOGAN_LENGTH,
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

// ── formatCwd ──
describe("formatCwd", () => {
	const home = process.env.HOME;

	if (home) {
		it("abbreviates home directory", () => {
			const result = formatCwd(home + "/projects/test");
			assert.equal(result, "~/projects/test");
		});
	}

	it("returns path unchanged when not under home", () => {
		const result = formatCwd("/tmp/somewhere");
		assert.equal(result, "/tmp/somewhere");
	});
});
