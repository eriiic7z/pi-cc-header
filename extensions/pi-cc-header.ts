import {
	VERSION,
	type ExtensionAPI,
	type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type { Component, TUI } from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/* ── 品牌色 ── */
const SPEEDS = [25, 50, 75, 100] as const;
let logoInterval: (typeof SPEEDS)[number] = SPEEDS[0];
let slogan = "Code something that makes you proud";
let /* biome-ignore format: mutable */ sloganOn = true;
let /* biome-ignore format: mutable */ sloganColor = true;
let stripeEnabled = true;
let versionColored = 1;
let gradientOn = true;
let logoColorKey = "c";
let showPkgSkills = false;
const COLOR_NAMES: Record<string, string> = {
	a: "anthropic",
	c: "clawd",
	r: "red",
	o: "orange",
	y: "yellow",
	g: "green",
	w: "white",
	b: "blue",
	p: "purple",
};
const DEFAULT_CC_HEADER = {
	lines: true,
	color: "c",
	ver: 1,
	grad: true,
	pkg: false,
	disabled: false,
	speed: SPEEDS[0],
	sloganColor: true,
	slogan: "Code something that makes you proud",
	sloganOn: true,
};
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
	| "logo"
	| "logoStripe"
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

const colorCell = (color: LogoColor): string => {
	const cg = (n: number) => GMAP[logoColorKey]?.[n] ?? "34";
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
		case "l2":
		case "l3":
		case "l4":
			return `\x1b[${cg(+color[1] - 1)}m██\x1b[39m`;
		case "s1":
		case "s2":
		case "s3":
		case "s4":
			return `\x1b[${cg(+color[1] - 1)}m──\x1b[39m`;
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

function piLogoFrame(frameIndex: number): string[] {
	const frame = LOGO_FRAMES[frameIndex];
	const lines: string[] = [];
	for (let y = 1; y <= 7; y++) {
		let line = "";
		for (let x = 1; x <= 8; x++) line += colorCell(logoCellColor(frame, y, x));
		lines.push(line);
	}
	return lines;
}

let PRECOMPUTED_LOGO_FRAMES: string[][] = LOGO_FRAMES.map((_, i) =>
	piLogoFrame(i),
);

function recomputeFrames(): void {
	PRECOMPUTED_LOGO_FRAMES = LOGO_FRAMES.map((_, i) => piLogoFrame(i));
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

/* ── 各项统计 ── */
function computeStats(ctx: ExtensionContext) {
	const home = process.env.HOME ?? "";
	const root = join(home, ".pi", "agent", "npm", "node_modules");
	const settingsPath = join(home, ".pi", "agent", "settings.json");

	let settingsPackages: string[] = [];
	try {
		const s = JSON.parse(readFileSync(settingsPath, "utf-8"));
		if (Array.isArray(s.packages)) settingsPackages = s.packages;
	} catch {
		console.warn("pi-cc-header: failed to read settings.json");
	}
	const settingsNames = new Set(
		settingsPackages.map((p) => String(p).replace(/^npm:/, "")),
	);
	const installed = settingsPackages.length;
	let residue = 0;
	let prompts = 0;
	let pkgSkills = 0;

	function scanPkg(m: any, pkgDir: string, pkgName: string) {
		if (!m.pi) return;
		if (!settingsNames.has(pkgName)) residue++;
		if (Array.isArray(m.pi.prompts)) {
			for (const e of m.pi.prompts) {
				let d = join(pkgDir, e);
				if (!existsSync(d)) d = join(pkgDir, e.replace(/^(\.\.?\/)+/, ""));
				if (existsSync(d)) {
					try {
						prompts += readdirSync(d).filter((f: string) =>
							f.endsWith(".md"),
						).length;
					} catch {
						console.warn("pi-cc-header: failed to read prompts dir", d);
					}
				}
			}
		}
		if (Array.isArray(m.pi.skills)) {
			for (const e of m.pi.skills) {
				let d = join(pkgDir, e);
				if (!existsSync(d)) d = join(pkgDir, e.replace(/^(\.\.?\/)+/, ""));
				if (existsSync(d)) {
					try {
						pkgSkills += readdirSync(d, { withFileTypes: true }).filter(
							(f) => f.isDirectory() || f.name.endsWith(".md"),
						).length;
					} catch {
						console.warn("pi-cc-header: failed to read pkg skills dir", d);
					}
				}
			}
		}
	}

	if (existsSync(root)) {
		for (const name of readdirSync(root)) {
			if (name.startsWith(".")) continue;
			if (name.startsWith("@")) {
				let subs: string[];
				try {
					subs = readdirSync(join(root, name));
				} catch {
					console.warn(
						"pi-cc-header: failed to list scoped packages under",
						name,
					);
					continue;
				}
				for (const sub of subs) {
					const pj = join(root, name, sub, "package.json");
					if (!existsSync(pj)) continue;
					try {
						const m = JSON.parse(readFileSync(pj, "utf-8"));
						scanPkg(m, join(root, name, sub), `${name}/${sub}`);
					} catch {
						console.warn("pi-cc-header: failed to parse", pj);
					}
				}
				continue;
			}
			const pj = join(root, name, "package.json");
			if (!existsSync(pj)) continue;
			try {
				const m = JSON.parse(readFileSync(pj, "utf-8"));
				scanPkg(m, join(root, name), name);
			} catch {
				console.warn("pi-cc-header: failed to parse", pj);
			}
		}
	}

	const skillNames = new Set<string>();
	for (const d of [
		join(home, ".agents", "skills"),
		join(ctx.cwd, ".agents", "skills"),
		join(home, ".pi", "agent", "skills"),
		join(ctx.cwd, ".pi", "skills"),
	]) {
		if (!existsSync(d)) continue;
		try {
			for (const e of readdirSync(d, { withFileTypes: true })) {
				if (e.isDirectory() || e.name.endsWith(".md")) skillNames.add(e.name);
			}
		} catch {
			console.warn("pi-cc-header: failed to list skills dir", d);
		}
	}

	const globalAgents = existsSync(join(home, ".pi", "agent", "AGENTS.md"));
	const projectAgents =
		existsSync(join(ctx.cwd, "AGENTS.md")) ||
		existsSync(join(ctx.cwd, ".pi", "AGENTS.md"));

	return {
		extensions: { installed, residue },
		skills: skillNames.size,
		pkgSkills,
		prompts,
		agents:
			globalAgents && projectAgents
				? "Aa"
				: globalAgents
					? "A"
					: projectAgents
						? "a"
						: "",
	};
}

/* ── computeStats 缓存 ── */
let cachedStats: ReturnType<typeof computeStats> | null = null;
function invalidateStats(): void {
	cachedStats = null;
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
		cachedStats ??= computeStats(ctx);
		this.stats = cachedStats!;
		this.timer = setInterval(() => {
			if (this.frame < LOGO_FRAMES.length - 1) {
				this.frame++;
				this.tui.requestRender();
			} else {
				clearInterval(this.timer);
				this.tui.requestRender();
			}
		}, logoInterval);
		this.timer.unref?.();
	}

	render(width: number): string[] {
		const theme = this.ctx.ui.theme;
		const muted = (s: string) => theme.fg("muted", s);

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
				? `\x1b[${CMAP[logoColorKey]}mPi v${VERSION}\x1b[39m`
				: versionColored >= 1
					? `\x1b[${CMAP[logoColorKey]}mPi\x1b[39m ${muted(`v${VERSION}`)}`
					: muted(`Pi v${VERSION}`);
		const modelLine = `${model} · ${effort}${this.stats.agents ? `  |  ${this.stats.agents}` : ""}`;
		const info: Record<number, string> = sloganOn
			? {
					2: piText,
					3: sloganColor
						? `\x1b[1m\x1b[${CMAP[logoColorKey]}m${visibleWidth(slogan) > infoMaxWidth ? truncateToWidth(slogan, infoMaxWidth - 3, "") + "..." : slogan}\x1b[39m\x1b[22m`
						: muted(
								`\x1b[1m${visibleWidth(slogan) > infoMaxWidth ? truncateToWidth(slogan, infoMaxWidth - 3, "") + "..." : slogan}\x1b[22m`,
							),
					4: muted(modelLine),
					5: muted(statsLine),
				}
			: {
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

	const configStartupEnabled = (s: Record<string, any>) => {
		s.quietStartup = true;
		s.clearOnStart = true;
		saveSettings(s);
		process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
	};

	const directApply = (
		ctx: ExtensionContext,
		update: (h: Record<string, any>) => void,
	): void => {
		const s = getSettings();
		const h = s.ccHeader || {};
		update(h);
		s.ccHeader = h;
		saveSettings(s);
		recomputeFrames();
		active?.dispose();
		active = undefined;
		apply(pi, ctx, "none");
	};

	const modifyConfig = (
		ctx: ExtensionContext,
		update: (h: Record<string, any>, s: Record<string, any>) => string | null,
	) => {
		const s = getSettings();
		const h = s.ccHeader || {};
		if (h.disabled) {
			ctx.ui.notify(
				"Command unavailable: pi-cc-header disabled. Use /htg to enable.",
				"info",
			);
			return;
		}
		const msg = update(h, s);
		if (msg === null) return;
		s.ccHeader = h;
		saveSettings(s);
		recomputeFrames();
		active?.dispose();
		active = undefined;
		apply(pi, ctx, "none");
		ctx.ui.notify(msg, "info");
	};

	pi.on("session_start", (_event, ctx) => {
		const s = getSettings();
		const h = s.ccHeader || {};
		if (h.disabled) return;
		invalidateStats();
		stripeEnabled = h.lines ?? true;
		versionColored = h.ver ?? 0;
		gradientOn = h.grad ?? true;
		showPkgSkills = h.pkg ?? false;
		if (typeof h.slogan === "string") slogan = h.slogan;
		if (typeof h.sloganOn === "boolean") sloganOn = h.sloganOn;
		if (typeof h.sloganColor === "boolean") sloganColor = h.sloganColor;
		if (typeof h.speed === "number" && h.speed > 0) logoInterval = h.speed;
		if (h.color && CMAP[h.color]) logoColorKey = h.color;
		recomputeFrames();
		// persist settings to disk
		if (s.rsl !== false) {
			configStartupEnabled(s);
		} else {
			s.quietStartup = false;
			s.clearOnStart = false;
			saveSettings(s);
		}
		setTimeout(() => apply(pi, ctx), 0);
	});

	pi.registerCommand("htg", {
		description: "Toggle pi-cc-header ENABLED/DISABLED",
		handler: async (_args, ctx) => {
			const s = getSettings();
			const h = s.ccHeader || {};
			if (h.disabled) {
				s.ccHeader = h;
				h.disabled = false;
				configStartupEnabled(s);
				apply(pi, ctx, "none");
				ctx.ui.notify("pi-cc-header: ENABLED", "info");
			} else {
				s.ccHeader = h;
				h.disabled = true;
				s.quietStartup = false;
				s.clearOnStart = false;
				saveSettings(s);
				active?.dispose();
				active = undefined;
				ctx.ui.setHeader(undefined);
				ctx.ui.notify(
					"pi-cc-header: DISABLED. Config saved, /htg to re-enable.",
					"info",
				);
			}
		},
	});
	pi.registerCommand("hi", {
		description: "Toggle IBM-style ON/OFF",
		handler: async (_args, ctx) => {
			modifyConfig(ctx, (h) => {
				stripeEnabled = !stripeEnabled;
				h.lines = stripeEnabled;
				return `IBM-style: ${stripeEnabled ? "ON" : "OFF"}`;
			});
		},
	});

	pi.registerCommand("hc", {
		description:
			"Header color: <code> = set (c a r o y g w b p); no args = show",
		handler: async (args, ctx) => {
			if (!args) {
				ctx.ui.notify(
					`Header color: ${logoColorKey} (${COLOR_NAMES[logoColorKey]}). Available: ${Object.keys(CMAP).join(" ")}`,
					"info",
				);
				return;
			}
			modifyConfig(ctx, (h) => {
				if (!CMAP[args]) {
					ctx.ui.notify(
						`Invalid color: "${args}". Available: ${Object.keys(CMAP).join(" ")}`,
						"error",
					);
					return null;
				}
				logoColorKey = args;
				h.color = args;
				return `Color: ${args}`;
			});
		},
	});

	pi.registerCommand("hv", {
		description: "Version label color: no args = cycle; <all|pi|off> = set",
		handler: async (args, ctx) => {
			if (args) {
				const v = args.trim();
				if (!["all", "pi", "off"].includes(v)) {
					ctx.ui.notify(
						`Invalid value: "${v}". Available: all, pi, off.`,
						"error",
					);
					return;
				}
				versionColored = v === "all" ? 2 : v === "pi" ? 1 : 0;
				directApply(ctx, (h) => {
					h.ver = versionColored;
				});
				ctx.ui.notify(`Version label color: ${v}`, "info");
				return;
			}
			modifyConfig(ctx, (h) => {
				versionColored = (versionColored + 1) % 3;
				h.ver = versionColored;
				return `Version color: ${["OFF", "Pi only", "Pi+ver"][versionColored]}`;
			});
		},
	});

	pi.registerCommand("hm", {
		description: "Toggle Minecraft-style ON/OFF",
		handler: async (_args, ctx) => {
			modifyConfig(ctx, (h) => {
				gradientOn = !gradientOn;
				h.grad = gradientOn;
				return `Minecraft-style: ${gradientOn ? "ON" : "OFF"}`;
			});
		},
	});

	pi.registerCommand("hdf", {
		description: "Reset pi-cc-header to developer defaults (overwrites config)",
		handler: async (_args, ctx) => {
			const s = getSettings();
			const h: Record<string, any> = {};
			stripeEnabled = true;
			logoColorKey = "c";
			versionColored = 1;
			gradientOn = true;
			showPkgSkills = false;
			sloganColor = true;
			slogan = "Code something that makes you proud";
			sloganOn = true;
			logoInterval = SPEEDS[0];
			Object.assign(h, DEFAULT_CC_HEADER);
			s.ccHeader = h;
			configStartupEnabled(s);
			recomputeFrames();
			active?.dispose();
			active = undefined;
			apply(pi, ctx, "none");
			ctx.ui.notify("Reset to developer defaults", "info");
		},
	});

	pi.registerCommand("hsp", {
		description:
			"Animation speed: no args = show; <number> = set (25 50 75 100)",
		handler: async (args, ctx) => {
			if (!args) {
				ctx.ui.notify(
					`Animation speed: ${logoInterval}ms. Available: ${SPEEDS.join(" ")}`,
					"info",
				);
				return;
			}
			const n = Number(args);
			if (!(SPEEDS as readonly number[]).includes(n)) {
				ctx.ui.notify(
					`Invalid speed: "${n}". Available: ${SPEEDS.join(" ")}`,
					"error",
				);
				return;
			}
			logoInterval = n as (typeof SPEEDS)[number];
			directApply(ctx, (h) => {
				h.speed = logoInterval;
			});
			ctx.ui.notify(`Animation speed: ${logoInterval}ms`, "info");
		},
	});

	pi.registerCommand("hs", {
		description:
			"Slogan: no args = on/off; <text> = set; -c = toggle color; -d = delete",
		handler: async (args, ctx) => {
			modifyConfig(ctx, (h) => {
				if (!args) {
					if (!slogan) {
						ctx.ui.notify(
							"Command unavailable: no slogan set. Use /hs <text> to set one.",
							"error",
						);
						return null;
					}
					sloganOn = !sloganOn;
					h.sloganOn = sloganOn;
					return sloganOn ? "Slogan: ON" : "Slogan: OFF";
				}
				if (args === "-c") {
					sloganColor = !sloganColor;
					h.sloganColor = sloganColor;
					return `Slogan color: ${sloganColor ? "ON" : "OFF"}`;
				}
				if (args === "-d") {
					slogan = "";
					sloganOn = false;
					h.slogan = "";
					h.sloganOn = false;
					return "Slogan: deleted";
				}
				const text = args.trim();
				if (!text) {
					ctx.ui.notify(
						'Invalid slogan: "". Slogan must be between 1 and 85 characters.',
						"error",
					);
					return null;
				}
				if (text.length > 85) {
					ctx.ui.notify(
						`Invalid slogan: "${text}". Slogan must be between 1 and 85 characters.`,
						"error",
					);
					return null;
				}
				slogan = text;
				sloganOn = true;
				h.slogan = text;
				h.sloganOn = true;
				return `Slogan: ${text}`;
			});
		},
	});

	pi.registerCommand("hps", {
		description: "Toggle pkg skills VISIBLE/HIDDEN",
		handler: async (_args, ctx) => {
			modifyConfig(ctx, (h) => {
				showPkgSkills = !showPkgSkills;
				h.pkg = showPkgSkills;
				return `Pkg skills: ${showPkgSkills ? "VISIBLE" : "HIDDEN"}`;
			});
		},
	});

	pi.registerCommand("hrl", {
		description:
			"Toggle resource list VISIBLE/HIDDEN (applies on next session)",
		handler: async (_args, ctx) => {
			const s = getSettings();
			if ((s.ccHeader || {}).disabled) {
				ctx.ui.notify(
					"Command unavailable: pi-cc-header disabled. Use /htg to enable.",
					"info",
				);
				return;
			}
			s.rsl = s.rsl === false ? true : false;
			saveSettings(s);
			ctx.ui.notify(
				`Resource list: ${s.rsl !== false ? "HIDDEN" : "VISIBLE"}`,
				"info",
			);
			setTimeout(() => ctx.ui.reload(), 100);
		},
	});
}
