import {
	VERSION,
	type ExtensionAPI,
	type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type { Component, TUI } from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/* ── 样式工具 ── */
const brand = (s: string) => `\x1b[1m${s}\x1b[22m`;

/* ── 品牌色 ── */
const LOGO_INTERVAL = 75;
let stripeEnabled = true;
let versionColored = 0; // 0=none 1=Pi only 2=Pi+version
let gradientOn = true;
let logoColorKey = "a"; // default anthropic brand orange
let showPkgSkills = false;
const CMAP: Record<string, string> = {
	a: "38;2;217;119;87",
	r: "31",
	o: "38;5;208",
	y: "38;5;226",
	g: "38;2;20;180;20",
	w: "38;5;15",
	b: "38;2;40;130;220",
	p: "38;5;129",
	c: "38;2;251;73;52",
};
// 24-bit RGB gradient: [light→dark] for each color
const GMAP: Record<string, string[]> = {
	a: ["38;2;217;119;87", "38;2;200;100;70", "38;2;170;80;55", "38;2;130;60;40"],
	r: ["38;2;255;80;80", "38;2;220;40;40", "38;2;180;20;20", "38;2;140;10;10"],
	o: [
		"38;2;255;170;50",
		"38;2;230;140;30",
		"38;2;200;110;20",
		"38;2;160;80;10",
	],
	y: [
		"38;2;255;255;80",
		"38;2;230;230;40",
		"38;2;200;200;20",
		"38;2;160;160;10",
	],
	g: ["38;2;80;255;80", "38;2;40;220;40", "38;2;20;180;20", "38;2;10;140;10"],
	w: [
		"38;2;230;230;210",
		"38;2;190;190;170",
		"38;2;140;140;120",
		"38;2;100;100;85",
	],
	b: [
		"38;2;100;180;255",
		"38;2;70;160;245",
		"38;2;40;130;220",
		"38;2;20;100;195",
	],
	p: [
		"38;2;200;100;255",
		"38;2;170;70;230",
		"38;2;140;40;200",
		"38;2;110;20;160",
	],
	c: ["38;2;251;73;52", "38;2;220;60;40", "38;2;190;45;30", "38;2;155;30;20"],
};

/* ── Pi 官方 Logo 动画（提取自 pi.dev/install.sh）── */
type LogoColor =
	| "panel"
	| "cyan"
	| "red"
	| "green"
	| "orange"
	| "white"
	| "flash"
	| "stripe"
	| "logo"
	| "logoStripe"
	| "brand"
	| "l1"
	| "l2"
	| "l3"
	| "l4"
	| "s1"
	| "s2"
	| "s3"
	| "s4";
type LogoPhase = "left" | "top" | "right" | "none";
type LogoFrame = {
	phase: number;
	active: LogoPhase;
	ax: number;
	ay: number;
	flash: boolean;
	white: boolean;
};

const LOGO_FRAMES: LogoFrame[] = [
	...Array.from({ length: 4 }, (_, ay) => ({
		phase: 0,
		active: "left" as const,
		ax: 2,
		ay,
		flash: false,
		white: false,
	})),
	...Array.from({ length: 3 }, (_, ay) => ({
		phase: 1,
		active: "top" as const,
		ax: 2,
		ay,
		flash: false,
		white: false,
	})),
	...Array.from({ length: 5 }, (_, ay) => ({
		phase: 2,
		active: "right" as const,
		ax: 5,
		ay,
		flash: false,
		white: false,
	})),
	{ phase: 3, active: "none", ax: 0, ay: 0, flash: false, white: false },
	{ phase: 3, active: "none", ax: 0, ay: 0, flash: true, white: false },
	{ phase: 3, active: "none", ax: 0, ay: 0, flash: false, white: false },
	{ phase: 3, active: "none", ax: 0, ay: 0, flash: true, white: false },
	{ phase: 4, active: "none", ax: 0, ay: 0, flash: false, white: false },
	{ phase: 5, active: "none", ax: 0, ay: 0, flash: false, white: false },
	{ phase: 5, active: "none", ax: 0, ay: 0, flash: false, white: true },
	{ phase: 5, active: "none", ax: 0, ay: 0, flash: false, white: false },
	{ phase: 5, active: "none", ax: 0, ay: 0, flash: false, white: true },
	{ phase: 6, active: "none", ax: 0, ay: 0, flash: false, white: false },
];

const colorCell = (color: LogoColor, bc: (s: string) => string): string => {
	switch (color) {
		case "cyan":
			return "\x1b[36m██\x1b[39m";
		case "red":
			return "\x1b[31m██\x1b[39m";
		case "green":
			return "\x1b[32m██\x1b[39m";
		case "orange":
		case "flash":
			return "\x1b[33m██\x1b[39m";
		case "white":
			return "\x1b[39m██";
		case "logo":
			return `\x1b[${CMAP[logoColorKey]}m██\x1b[39m`;
		case "logoStripe":
			return `\x1b[${CMAP[logoColorKey]}m──\x1b[39m`;
		case "l1":
			return `\x1b[${GMAP[logoColorKey]?.[0] ?? "34"}m██\x1b[39m`;
		case "l2":
			return `\x1b[${GMAP[logoColorKey]?.[1] ?? "34"}m██\x1b[39m`;
		case "l3":
			return `\x1b[${GMAP[logoColorKey]?.[2] ?? "34"}m██\x1b[39m`;
		case "l4":
			return `\x1b[${GMAP[logoColorKey]?.[3] ?? "34"}m██\x1b[39m`;
		case "s1":
			return `\x1b[${GMAP[logoColorKey]?.[0] ?? "34"}m──\x1b[39m`;
		case "s2":
			return `\x1b[${GMAP[logoColorKey]?.[1] ?? "34"}m──\x1b[39m`;
		case "s3":
			return `\x1b[${GMAP[logoColorKey]?.[2] ?? "34"}m──\x1b[39m`;
		case "s4":
			return `\x1b[${GMAP[logoColorKey]?.[3] ?? "34"}m──\x1b[39m`;
		case "brand":
			return bc("██");
		default:
			return "  ";
	}
};

function logoCellColor(frame: LogoFrame, y: number, x: number): LogoColor {
	const has = (cells: string) => cells.split(" ").includes(`${y},${x}`);
	const piece = (py: number, px: number, cells: string) =>
		cells.split(" ").some((item) => {
			const [dy, dx] = item.split(",").map(Number);
			return y === py + dy && x === px + dx;
		});

	if (frame.white)
		return has("3,2 3,3 3,4 4,2 4,4 5,2 5,3 5,5 6,2 6,5") ? "white" : "panel";
	if (frame.flash && y === 6 && x >= 1 && x <= 6) return "flash";

	if (frame.active === "left" && piece(frame.ay, frame.ax, "0,0 1,0 1,1 2,0"))
		return "red";
	if (frame.active === "top" && piece(frame.ay, frame.ax, "0,0 0,1 0,2 1,2"))
		return "cyan";
	if (frame.active === "right" && piece(frame.ay, frame.ax, "0,0 1,0 2,0 2,1"))
		return "green";

	if (frame.phase === 6) {
		const isPi = has("3,2 3,3 3,4 4,4 4,2 5,2 5,3 5,5 6,2 6,5");
		const lvl = gradientOn ? (y <= 3 ? 1 : y === 4 ? 2 : y === 5 ? 3 : 4) : 0;
		if (isPi) return lvl > 0 ? (("l" + lvl) as LogoColor) : "logo";
		return stripeEnabled && y >= 2 && y <= 7 && x <= 6
			? lvl > 0
				? (("s" + lvl) as LogoColor)
				: "logoStripe"
			: "panel";
	}
	if (frame.phase === 4) {
		if (has("2,2 2,3 2,4 3,4")) return "cyan";
		if (has("3,2 4,2 4,3 5,2")) return "red";
		if (has("4,5 5,5")) return "green";
		return "panel";
	}
	if (frame.phase >= 5) {
		if (has("3,2 3,3 3,4 4,4")) return "cyan";
		if (has("4,2 5,2 5,3 6,2")) return "red";
		if (has("5,5 6,5")) return "green";
		return "panel";
	}
	if (frame.phase <= 3 && has("6,1 6,2 6,3 6,4")) return "orange";
	if (frame.phase >= 2 && has("2,2 2,3 2,4 3,4")) return "cyan";
	if (frame.phase >= 1 && has("3,2 4,2 4,3 5,2")) return "red";
	if (frame.phase >= 3 && has("4,5 5,5 6,5 6,6")) return "green";
	return "panel";
}

function piLogoFrame(frameIndex: number, bc: (s: string) => string): string[] {
	const frame = LOGO_FRAMES[frameIndex % LOGO_FRAMES.length];
	const lines: string[] = [];
	for (let y = 1; y <= 7; y++) {
		let line = "";
		for (let x = 1; x <= 8; x++)
			line += colorCell(logoCellColor(frame, y, x), bc);
		lines.push(line);
	}
	return lines;
}

let PRECOMPUTED_LOGO_FRAMES: string[][] = LOGO_FRAMES.map((_, i) =>
	piLogoFrame(i, (s: string) => brand(s)),
);

function recomputeFrames(): void {
	PRECOMPUTED_LOGO_FRAMES = LOGO_FRAMES.map((_, i) =>
		piLogoFrame(i, (s: string) => brand(s)),
	);
}

/* ── 工具函数 ── */
function formatCwd(cwd: string): string {
	const home = process.env.HOME;
	return home && cwd.startsWith(home) ? `~${cwd.slice(home.length)}` : cwd;
}

function padRight(text: string, width: number): string {
	const clipped = truncateToWidth(text, width, "");
	return clipped + " ".repeat(Math.max(0, width - visibleWidth(clipped)));
}

/* ── 统一扫描 node_modules 下所有 pi package ── */
interface PiPackage {
	pkgDir: string; // absolute dir of the package
	meta: Record<string, any>; // parsed package.json
}

function listPiPackages(home: string): PiPackage[] {
	const result: PiPackage[] = [];
	const root = join(home, ".pi", "agent", "npm", "node_modules");
	if (!existsSync(root)) return result;

	for (const name of readdirSync(root)) {
		if (name.startsWith(".")) continue;
		const full = join(root, name);
		if (name.startsWith("@")) {
			// scoped package – walk one level deeper
			let subs: string[];
			try {
				subs = readdirSync(full);
			} catch {
				continue;
			}
			for (const sub of subs) {
				const spj = join(full, sub, "package.json");
				if (!existsSync(spj)) continue;
				try {
					const sm = JSON.parse(readFileSync(spj, "utf-8"));
					if (sm.pi) result.push({ pkgDir: join(full, sub), meta: sm });
				} catch {}
			}
			continue;
		}
		const pj = join(full, "package.json");
		if (!existsSync(pj)) continue;
		try {
			const m = JSON.parse(readFileSync(pj, "utf-8"));
			if (m.pi) result.push({ pkgDir: full, meta: m });
		} catch {}
	}
	return result;
}

function resolvePiPath(pkgDir: string, entry: string): string {
	let dir = join(pkgDir, entry);
	// Normalise broken relative paths like "../../skills" back into the pkg.
	if (!existsSync(dir)) {
		const basename = entry.replace(/^(\.\.?\/)+/, "");
		dir = join(pkgDir, basename);
	}
	return existsSync(dir) ? dir : "";
}

/* ── 各项统计 ── */
function countExtensions(home: string): { installed: number; residue: number } {
	// installed = packages in settings.json
	let installed = 0;
	try {
		const s = JSON.parse(
			readFileSync(join(home, ".pi", "agent", "settings.json"), "utf-8"),
		);
		if (Array.isArray(s.packages)) installed = s.packages.length;
	} catch {}
	// residue = pi packages in node_modules NOT in settings.json
	const pkgNames = new Set<string>();
	for (const p of listPiPackages(home)) {
		const parts = p.pkgDir.split("/");
		// "@scope/pkg"  or  "pkg"
		const name = parts[parts.length - 2]?.startsWith("@")
			? parts.slice(-2).join("/")
			: parts[parts.length - 1];
		pkgNames.add(name);
	}
	// Convert settings.json "npm:name" → "name"
	const settingsNames = new Set<string>();
	try {
		const s = JSON.parse(
			readFileSync(join(home, ".pi", "agent", "settings.json"), "utf-8"),
		);
		if (Array.isArray(s.packages)) {
			for (const entry of s.packages) {
				const name = String(entry).replace(/^npm:/, "");
				settingsNames.add(name);
			}
		}
	} catch {}
	let residue = 0;
	for (const n of pkgNames) {
		if (!settingsNames.has(n)) residue++;
	}
	return { installed, residue };
}

function countPrompts(home: string): number {
	const seen = new Set<string>();
	for (const p of listPiPackages(home)) {
		const entries = p.meta.pi?.prompts;
		if (!Array.isArray(entries)) continue;
		for (const entry of entries) {
			const dir = resolvePiPath(p.pkgDir, entry);
			if (!dir) continue;
			for (const e of readdirSync(dir)) {
				if (e.endsWith(".md")) seen.add(e.slice(0, -3));
			}
		}
	}
	return seen.size;
}

function countPkgSkills(home: string): number {
	const seen = new Set<string>();
	for (const p of listPiPackages(home)) {
		const entries = p.meta.pi?.skills;
		if (!Array.isArray(entries)) continue;
		for (const entry of entries) {
			const dir = resolvePiPath(p.pkgDir, entry);
			if (!dir) continue;
			for (const e of readdirSync(dir, { withFileTypes: true })) {
				if (e.isDirectory()) seen.add(join(dir, e.name));
				else if (e.name.endsWith(".md")) seen.add(join(dir, e.name));
			}
		}
	}
	return seen.size;
}

function countSkills(home: string, cwd: string): number {
	const dirs = new Set<string>();
	const defaults = [
		join(home, ".agents", "skills"),
		join(cwd, ".agents", "skills"),
		join(home, ".pi", "agent", "skills"),
		join(cwd, ".pi", "skills"),
	];
	for (const d of defaults) {
		if (!existsSync(d)) continue;
		for (const e of readdirSync(d, { withFileTypes: true })) {
			if (e.isDirectory()) dirs.add(join(d, e.name));
			else if (e.name.endsWith(".md")) dirs.add(join(d, e.name));
		}
	}
	return dirs.size;
}

function detectAgents(home: string, cwd: string): string {
	const global = existsSync(join(home, ".pi", "agent", "AGENTS.md"));
	const project =
		existsSync(join(cwd, "AGENTS.md")) ||
		existsSync(join(cwd, ".pi", "AGENTS.md"));
	if (global && project) return "Aa";
	if (global) return "A";
	if (project) return "a";
	return "";
}

function computeStats(ctx: ExtensionContext) {
	const home = process.env.HOME ?? "";
	return {
		extensions: countExtensions(home),
		skills: countSkills(home, ctx.cwd),
		pkgSkills: countPkgSkills(home),
		prompts: countPrompts(home),
		agents: detectAgents(home, ctx.cwd),
	};
}

/* ── 组件：启动头部 ── */
class PiHeader implements Component {
	private frame = 0;
	private readonly timer: NodeJS.Timeout;
	private readonly stats: {
		extensions: { installed: number; residue: number };
		skills: number;
		pkgSkills: number;
		prompts: number;
		agents: string;
	};

	constructor(
		private readonly pi: ExtensionAPI,
		private readonly ctx: ExtensionContext,
		private readonly tui: TUI,
	) {
		this.stats = computeStats(ctx);
		this.timer = setInterval(() => {
			if (this.frame < LOGO_FRAMES.length - 1) {
				this.frame++;
				this.tui.requestRender();
			} else {
				clearInterval(this.timer);
				this.tui.requestRender();
			}
		}, LOGO_INTERVAL);
		this.timer.unref?.();
	}

	render(width: number): string[] {
		const theme = this.ctx.ui.theme;
		const muted = (s: string) => theme.fg("muted", s);
		const logoBrand = (s: string) =>
			`\x1b[1m\x1b[${CMAP[logoColorKey]}m${s}\x1b[39m\x1b[22m`;

		const logoLines = PRECOMPUTED_LOGO_FRAMES[this.frame];
		const logoWidth = 14;
		const infoMaxWidth = Math.max(0, width - logoWidth);

		const model = this.ctx.model?.id ?? "Default";
		const effort = this.pi.getThinkingLevel();
		const cwd = formatCwd(this.ctx.cwd);
		const skillText = showPkgSkills
			? `${this.stats.skills}|${this.stats.pkgSkills} skills`
			: `${this.stats.skills} skills`;
		const extText =
			this.stats.extensions.residue > 0
				? `${this.stats.extensions.installed}(+${this.stats.extensions.residue}) extensions`
				: `${this.stats.extensions.installed} extensions`;
		const statsLine = `${skillText} · ${this.stats.prompts} prompts · ${extText}`;

		const piText =
			versionColored >= 2
				? logoBrand(`Pi v${VERSION}`)
				: versionColored >= 1
					? `${logoBrand("Pi")} v${VERSION}`
					: `Pi v${VERSION}`;
		const info: Record<number, string> = {
			2: piText,
			3: muted(`${model} · ${effort}`),
			4: muted(statsLine),
			5: muted(this.stats.agents ? `${this.stats.agents} · ${cwd}` : cwd),
		};

		const lines: string[] = [];
		for (let i = 1; i < logoLines.length; i++) {
			const right = info[i] != null ? padRight(info[i], infoMaxWidth) : "";
			lines.push(padRight(logoLines[i] ?? "", logoWidth) + right);
		}
		return lines.map((l) => padRight(truncateToWidth(l, width, ""), width));
	}

	invalidate(): void {}
	dispose(): void {
		clearInterval(this.timer);
	}
}

/* ── 挂载 ── */
let active: PiHeader | undefined;

function apply(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	clearMode: "full" | "viewport" | "none" = "full",
) {
	if (ctx.mode !== "tui") return;
	if (clearMode === "full") {
		process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
	} else if (clearMode === "viewport") {
		process.stdout.write("\x1b[2J");
	}
	ctx.ui.setHeader((tui) => {
		active?.dispose();
		active = new PiHeader(pi, ctx, tui);
		return active;
	});
}

/* ── 入口 ── */
export default function (pi: ExtensionAPI) {
	const settingsPath = join(
		process.env.HOME ?? "",
		".pi",
		"agent",
		"settings.json",
	);
	const getSettings = (): Record<string, any> => {
		try {
			return JSON.parse(readFileSync(settingsPath, "utf-8"));
		} catch {
			return {};
		}
	};
	const saveSettings = (s: Record<string, any>) =>
		writeFileSync(settingsPath, JSON.stringify(s, null, 2) + "\n", "utf-8");

	pi.on("session_start", (_event, ctx) => {
		const s = getSettings();
		const h = s.ccHeader || {};
		stripeEnabled = h.lines ?? true;
		versionColored = h.ver ?? 0;
		gradientOn = h.grad ?? true;
		showPkgSkills = h.pkg ?? false;
		if (h.color && CMAP[h.color]) logoColorKey = h.color;
		recomputeFrames();
		if (!h.disabled) {
			if (s.rsl !== false) {
				s.quietStartup = true;
				s.clearOnStart = true;
				saveSettings(s);
				process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
			} else {
				s.quietStartup = false;
				s.clearOnStart = false;
				saveSettings(s);
			}
			setTimeout(() => apply(pi, ctx), 0);
		}
	});

	pi.registerCommand("htg", {
		description: "Toggle pi-cc-header enabled/disabled (config preserved)",
		handler: async (_args, ctx) => {
			const s = getSettings();
			const h = s.ccHeader || {};
			if (h.disabled) {
				// Re-enable
				s.ccHeader = h;
				h.disabled = false;
				s.quietStartup = true;
				s.clearOnStart = true;
				saveSettings(s);
				process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
				apply(pi, ctx, "viewport");
				ctx.ui.notify("pi-cc-header enabled", "info");
			} else {
				// Disable
				s.ccHeader = h;
				h.disabled = true;
				s.quietStartup = false;
				s.clearOnStart = false;
				saveSettings(s);
				active?.dispose();
				active = undefined;
				ctx.ui.setHeader(undefined);
				ctx.ui.setFooter(undefined);
				ctx.ui.setWorkingIndicator();
				ctx.ui.setEditorComponent(undefined);
				ctx.ui.notify(
					"pi-cc-header disabled, changes apply next session",
					"info",
				);
			}
		},
	});
	pi.registerCommand("hi", {
		description: "Toggle IBM-style on/off",
		handler: async (_args, ctx) => {
			const s = getSettings();
			if ((s.ccHeader || {}).disabled) {
				ctx.ui.notify("pi-cc-header is disabled, use /htg to enable", "info");
				return;
			}
			stripeEnabled = !stripeEnabled;
			s.ccHeader = { ...s.ccHeader, lines: stripeEnabled };
			saveSettings(s);
			recomputeFrames();
			// Rebuild header to pick up new frames
			active?.dispose();
			active = undefined;
			apply(pi, ctx, "none");
			ctx.ui.notify(`Lines: ${stripeEnabled ? "ON" : "OFF"}`, "info");
		},
	});

	pi.registerCommand("hc", {
		description:
			"Set header color: c=clawd a=anthropic r=red o=orange y=yellow g=green w=white b=blue p=purple",
		handler: async (args, ctx) => {
			const s = getSettings();
			if ((s.ccHeader || {}).disabled) {
				ctx.ui.notify("pi-cc-header is disabled, use /htg to enable", "info");
				return;
			}
			if (!CMAP[args ?? ""]) {
				ctx.ui.notify(`Colors: ${Object.keys(CMAP).join(" ")}`, "error");
				return;
			}
			logoColorKey = args!;
			s.ccHeader = { ...s.ccHeader, color: args };
			saveSettings(s);
			recomputeFrames();
			active?.dispose();
			active = undefined;
			ctx.ui.notify(`Color: ${args}`, "info");
			apply(pi, ctx, "none");
		},
	});

	pi.registerCommand("hv", {
		description: "Toggle version number color follow logo",
		handler: async (_args, ctx) => {
			const s = getSettings();
			if ((s.ccHeader || {}).disabled) {
				ctx.ui.notify("pi-cc-header is disabled, use /htg to enable", "info");
				return;
			}
			versionColored = (versionColored + 1) % 3;
			s.ccHeader = { ...s.ccHeader, ver: versionColored };
			saveSettings(s);
			const labels = ["OFF", "Pi only", "Pi+ver"];
			active?.dispose();
			active = undefined;
			apply(pi, ctx, "none");
			ctx.ui.notify(`Version color: ${labels[versionColored]}`, "info");
		},
	});

	pi.registerCommand("hm", {
		description: "Toggle Minecraft-style on/off",
		handler: async (_args, ctx) => {
			const s = getSettings();
			if ((s.ccHeader || {}).disabled) {
				ctx.ui.notify("pi-cc-header is disabled, use /htg to enable", "info");
				return;
			}
			gradientOn = !gradientOn;
			s.ccHeader = { ...s.ccHeader, grad: gradientOn };
			saveSettings(s);
			recomputeFrames();
			active?.dispose();
			active = undefined;
			apply(pi, ctx, "none");
			ctx.ui.notify(`Gradient: ${gradientOn ? "ON" : "OFF"}`, "info");
		},
	});

	pi.registerCommand("hdf", {
		description: "Reset pi-cc-header to developer defaults (overwrites config)",
		handler: async (_args, ctx) => {
			const s = getSettings();
			if ((s.ccHeader || {}).disabled) {
				ctx.ui.notify("pi-cc-header is disabled, use /htg to enable", "info");
				return;
			}
			stripeEnabled = true;
			logoColorKey = "c";
			versionColored = 2;
			gradientOn = true;
			showPkgSkills = false;
			recomputeFrames();
			s.ccHeader = {
				lines: true,
				color: "c",
				ver: 2,
				grad: true,
				pkg: false,
				disabled: false,
			};
			saveSettings(s);
			active?.dispose();
			active = undefined;
			apply(pi, ctx, "none");
			ctx.ui.notify("Reset to developer defaults", "info");
		},
	});

	pi.registerCommand("hps", {
		description: "Toggle pkg skills visibility (6 skills | 6|7 skills)",
		handler: async (_args, ctx) => {
			const s = getSettings();
			if ((s.ccHeader || {}).disabled) {
				ctx.ui.notify("pi-cc-header is disabled, use /htg to enable", "info");
				return;
			}
			showPkgSkills = !showPkgSkills;
			s.ccHeader = { ...s.ccHeader, pkg: showPkgSkills };
			saveSettings(s);
			active?.dispose();
			active = undefined;
			apply(pi, ctx, "none");
			ctx.ui.notify(
				`Pkg skills: ${showPkgSkills ? "VISIBLE" : "HIDDEN"}`,
				"info",
			);
		},
	});

	pi.registerCommand("hrl", {
		description: "Toggle resource list visibility (applies on next session)",
		handler: async (_args, ctx) => {
			const s = getSettings();
			if ((s.ccHeader || {}).disabled) {
				ctx.ui.notify("pi-cc-header is disabled, use /htg to enable", "info");
				return;
			}
			s.rsl = s.rsl === false ? true : false;
			saveSettings(s);
			ctx.ui.notify(
				`Resource list: ${s.rsl !== false ? "HIDDEN" : "VISIBLE"}`,
				"info",
			);
			setTimeout(() => ctx.reload(), 100);
		},
	});
}
