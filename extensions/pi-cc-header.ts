import {
	VERSION,
	type ExtensionAPI,
	type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type { Component, TUI } from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import {
	readFileSync,
	writeFileSync,
	readdirSync,
	existsSync,
	renameSync,
} from "node:fs";
import { join } from "node:path";

/* ── 类型 ── */
interface SettingsFile {
	ccHeader?: Record<string, any>;
	quietStartup?: boolean;
	clearOnStart?: boolean;
	packages?: string[];
	[key: string]: any;
}

interface CCHeaderState {
	logoColorKey: string;
	versionColored: number; // 0=off 1=Pi only 2=Pi+ver
	gradientOn: boolean;
	stripeEnabled: boolean;
	showPkgSkills: boolean;
	logoInterval: number;
	slogan: string;
	sloganOn: boolean;
	sloganColor: boolean;
	disabled: boolean;
}

/* ── 常量 ── */
const SPEEDS = [25, 50, 75, 100] as const;
const LOGO_COLS = 8;
const LOGO_ROWS = 7;
const LOGO_PIXEL_WIDTH = 14; // 8×2 双宽字符，含左右 margin
const MAX_SLOGAN_LENGTH = 85;
// sync: COLOR_NAMES 与 CMAP/GMAP 共享同一组颜色键，新增颜色需同步三处。
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
const DEFAULT_STATE: CCHeaderState = {
	logoColorKey: "c",
	versionColored: 1,
	gradientOn: true,
	stripeEnabled: true,
	showPkgSkills: false,
	logoInterval: SPEEDS[1],
	slogan: "Code something that makes you proud",
	sloganOn: true,
	sloganColor: true,
	disabled: false,
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
// 显式层级索引 → 消除 cg(+color[1]-1) 的隐式命名依赖
const GRADIENT_LEVEL: Record<string, number> = {
	l1: 0,
	l2: 1,
	l3: 2,
	l4: 3,
	s1: 0,
	s2: 1,
	s3: 2,
	s4: 3,
};

/* ── 运行时状态（单一 state 对象，消除 11 个模块级 let）── */
let state: CCHeaderState = { ...DEFAULT_STATE };
let framesDirty = true; // 仅颜色/渐变/横线变化时置脏

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
const LAST_FRAME_INDEX = LOGO_FRAMES.length - 1;

const colorCell = (color: LogoColor): string => {
	const cg = (n: number) => GMAP[state.logoColorKey]?.[n] ?? "34";
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
			return `\x1b[${CMAP[state.logoColorKey]}m██\x1b[39m`;
		case "logoStripe":
			return `\x1b[${CMAP[state.logoColorKey]}m──\x1b[39m`;
		case "l1":
		case "l2":
		case "l3":
		case "l4":
		case "s1":
		case "s2":
		case "s3":
		case "s4":
			return `\x1b[${cg(GRADIENT_LEVEL[color])}m${color[0] === "l" ? "██" : "──"}\x1b[39m`;
		default:
			return "  ";
	}
};
// perf: 坐标字符串预解析为 Set/[number,number][]，消除热路径 split/map/Number 调用
const WHITE_CELLS = new Set([
	"3,2",
	"3,3",
	"3,4",
	"4,2",
	"4,4",
	"5,2",
	"5,3",
	"5,5",
	"6,2",
	"6,5",
]);
const P4_CYAN = new Set(["2,2", "2,3", "2,4", "3,4"]);
const P4_RED = new Set(["3,2", "4,2", "4,3", "5,2"]);
const P4_GREEN = new Set(["4,5", "5,5"]);
const P5_CYAN = new Set(["3,2", "3,3", "3,4", "4,4"]);
const P5_RED = new Set(["4,2", "5,2", "5,3", "6,2"]);
const P5_GREEN = new Set(["5,5", "6,5"]);
const EARLY_ORANGE = new Set(["6,1", "6,2", "6,3", "6,4"]);
const LATE_GREEN = new Set(["4,5", "5,5", "6,5", "6,6"]);
const PIECE_LEFT: [number, number][] = [
	[0, 0],
	[1, 0],
	[1, 1],
	[2, 0],
];
const PIECE_TOP: [number, number][] = [
	[0, 0],
	[0, 1],
	[0, 2],
	[1, 2],
];
const PIECE_RIGHT: [number, number][] = [
	[0, 0],
	[1, 0],
	[2, 0],
	[2, 1],
];

function logoCellColor(frame: LogoFrame, y: number, x: number): LogoColor {
	const key = `${y},${x}`;

	if (frame.white) return WHITE_CELLS.has(key) ? "white" : "panel";
	if (frame.flash && y === 6 && x >= 1 && x <= 6) return "flash";

	if (
		frame.active === "left" &&
		PIECE_LEFT.some(([dy, dx]) => y === frame.ay + dy && x === frame.ax + dx)
	)
		return "red";
	if (
		frame.active === "top" &&
		PIECE_TOP.some(([dy, dx]) => y === frame.ay + dy && x === frame.ax + dx)
	)
		return "cyan";
	if (
		frame.active === "right" &&
		PIECE_RIGHT.some(([dy, dx]) => y === frame.ay + dy && x === frame.ax + dx)
	)
		return "green";

	if (frame.phase === 6) {
		const isPi = WHITE_CELLS.has(key);
		const lvl = state.gradientOn
			? y <= 3
				? 1
				: y === 4
					? 2
					: y === 5
						? 3
						: 4
			: 0;
		if (isPi) return lvl > 0 ? (("l" + lvl) as LogoColor) : "logo";
		return state.stripeEnabled && y >= 2 && y <= LOGO_ROWS && x <= 6
			? lvl > 0
				? (("s" + lvl) as LogoColor)
				: "logoStripe"
			: "panel";
	}
	if (frame.phase === 4) {
		if (P4_CYAN.has(key)) return "cyan";
		if (P4_RED.has(key)) return "red";
		if (P4_GREEN.has(key)) return "green";
		return "panel";
	}
	if (frame.phase >= 5) {
		if (P5_CYAN.has(key)) return "cyan";
		if (P5_RED.has(key)) return "red";
		if (P5_GREEN.has(key)) return "green";
		return "panel";
	}
	if (frame.phase <= 3 && EARLY_ORANGE.has(key)) return "orange";
	if (frame.phase >= 2 && P4_CYAN.has(key)) return "cyan";
	if (frame.phase >= 1 && P4_RED.has(key)) return "red";
	if (frame.phase >= 3 && LATE_GREEN.has(key)) return "green";
	return "panel";
}

function piLogoFrame(frameIndex: number): string[] {
	const frame = LOGO_FRAMES[frameIndex];
	const lines: string[] = [];
	for (let y = 1; y <= LOGO_ROWS; y++) {
		let line = "";
		for (let x = 1; x <= LOGO_COLS; x++)
			line += colorCell(logoCellColor(frame, y, x));
		lines.push(line);
	}
	return lines;
}

let PRECOMPUTED_LOGO_FRAMES: string[][] = LOGO_FRAMES.map((_, i) =>
	piLogoFrame(i),
);

function recomputeFrames(): void {
	PRECOMPUTED_LOGO_FRAMES = LOGO_FRAMES.map((_, i) => piLogoFrame(i));
	framesDirty = false;
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

/* ── 各项统计（tech-debt: 同步遍历 ~/.pi/agent/npm/node_modules，包多时可能卡顿。cachedStats 保证每会话仅运行一次，后续可考虑 setImmediate 分片或 worker）── */
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
	private timer: ReturnType<typeof setTimeout> | null = null;
	private readonly stats: ReturnType<typeof computeStats>;
	// 性能: info 面板在动画播放期间不变，缓存右侧字符串，仅在终端宽度变化时重算
	private cachedInfoRows: Record<number, string> | null = null;
	private cachedInfoWidth = -1;

	constructor(
		private readonly pi: ExtensionAPI,
		private readonly ctx: ExtensionContext,
		private readonly tui: TUI,
		skipAnimation: boolean = false,
	) {
		cachedStats ??= computeStats(ctx);
		this.stats = cachedStats!;

		if (skipAnimation) {
			this.frame = LAST_FRAME_INDEX;
		} else {
			const tick = () => {
				if (this.frame < LAST_FRAME_INDEX) {
					this.frame++;
					this.tui.requestRender();
					// 递归 setTimeout：每次动态读取 state.logoInterval，/hsp 热生效
					this.timer = setTimeout(tick, state.logoInterval);
				} else {
					this.timer = null;
					this.tui.requestRender();
				}
			};
			this.timer = setTimeout(tick, state.logoInterval);
			this.timer.unref?.();
		}
	}

	render(width: number): string[] {
		const theme = this.ctx.ui.theme;
		const muted = (s: string) => theme.fg("muted", s);

		const logoLines = PRECOMPUTED_LOGO_FRAMES[this.frame];
		const logoWidth = LOGO_PIXEL_WIDTH;
		const infoMaxWidth = Math.max(0, width - LOGO_PIXEL_WIDTH);
		// 性能: info 面板缓存——动画帧仅做拼接，不重算 padRight/truncateToWidth/visibleWidth
		let infoRows: Record<number, string>;
		if (this.cachedInfoRows && this.cachedInfoWidth === width) {
			infoRows = this.cachedInfoRows;
		} else {
			const model = this.ctx.model?.id ?? "Default";
			const effort = this.pi.getThinkingLevel();
			const cwd = formatCwd(this.ctx.cwd);
			const skillText = state.showPkgSkills
				? `${this.stats.skills}|${this.stats.pkgSkills} skills`
				: `${this.stats.skills} skills`;
			const extText =
				this.stats.extensions.residue > 0
					? `${this.stats.extensions.installed}(+${this.stats.extensions.residue}) extensions`
					: `${this.stats.extensions.installed} extensions`;
			const statsLine = `${skillText} · ${this.stats.prompts} prompts · ${extText}`;

			const piText =
				state.versionColored >= 2
					? `\x1b[${CMAP[state.logoColorKey]}mPi v${VERSION}\x1b[39m`
					: state.versionColored >= 1
						? `\x1b[${CMAP[state.logoColorKey]}mPi\x1b[39m ${muted(`v${VERSION}`)}`
						: muted(`Pi v${VERSION}`);
			const modelLine = `${model} · ${effort}${this.stats.agents ? `  |  ${this.stats.agents}` : ""}`;

			const sloganW = visibleWidth(state.slogan);
			const sloganText =
				sloganW > infoMaxWidth
					? truncateToWidth(state.slogan, infoMaxWidth - 3, "") + "..."
					: state.slogan;

			infoRows = state.sloganOn
				? {
						2: piText,
						3: state.sloganColor
							? `\x1b[1m\x1b[${CMAP[state.logoColorKey]}m${sloganText}\x1b[39m\x1b[22m`
							: muted(`\x1b[1m${sloganText}\x1b[22m`),
						4: muted(modelLine),
						5: muted(statsLine),
					}
				: {
						2: piText,
						3: muted(`${model} · ${effort}`),
						4: muted(statsLine),
						5: muted(this.stats.agents ? `${this.stats.agents} · ${cwd}` : cwd),
					};
			this.cachedInfoRows = infoRows;
			this.cachedInfoWidth = width;
		}

		const lines: string[] = [];
		for (let i = 1; i < logoLines.length; i++) {
			const right =
				infoRows[i] != null ? padRight(infoRows[i], infoMaxWidth) : "";
			lines.push(padRight(logoLines[i], logoWidth) + right);
		}
		return lines.map((l) => padRight(truncateToWidth(l, width, ""), width));
	}

	invalidate(): void {}
	/** 触发重渲染但不重启动画，供 /hv 等仅改信息栏的命令使用 */
	reapply(): void {
		this.cachedInfoRows = null;
		this.tui.requestRender();
	}
	dispose(): void {
		if (this.timer != null) clearTimeout(this.timer);
	}
}

/* ── 挂载 ── */
let active: PiHeader | undefined;
let isResuming = false;

function apply(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	clearMode: "full" | "viewport" | "none",
	skipAnimation: boolean = false,
) {
	if (ctx.mode !== "tui") return;
	if (clearMode === "full") {
		process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
	} else if (clearMode === "viewport") {
		process.stdout.write("\x1b[2J");
	}
	ctx.ui.setHeader((tui) => {
		active?.dispose();
		active = new PiHeader(pi, ctx, tui, skipAnimation);
		return active;
	});
}

/* ── 状态 ⇄ 配置序列化 ── */
// dedup: pick 工具函数消除 9 行重复的类型守卫 + 默认值模式
const pick = <T>(
	val: unknown,
	guard: (v: unknown) => boolean,
	fallback: T,
): T => (guard(val) ? (val as T) : fallback);

function stateFromConfig(h: Record<string, any>): CCHeaderState {
	return {
		logoColorKey: pick(
			h.color,
			(v) => !!CMAP[v as string],
			DEFAULT_STATE.logoColorKey,
		),
		versionColored: pick(
			h.ver,
			(v) => typeof v === "number",
			DEFAULT_STATE.versionColored,
		),
		gradientOn: pick(
			h.grad,
			(v) => typeof v === "boolean",
			DEFAULT_STATE.gradientOn,
		),
		stripeEnabled: pick(
			h.lines,
			(v) => typeof v === "boolean",
			DEFAULT_STATE.stripeEnabled,
		),
		showPkgSkills: pick(
			h.pkg,
			(v) => typeof v === "boolean",
			DEFAULT_STATE.showPkgSkills,
		),
		logoInterval: pick(
			h.speed,
			(v) => typeof v === "number" && (SPEEDS as readonly number[]).includes(v),
			DEFAULT_STATE.logoInterval,
		),
		slogan: pick(h.slogan, (v) => typeof v === "string", DEFAULT_STATE.slogan),
		sloganOn: pick(
			h.sloganOn,
			(v) => typeof v === "boolean",
			DEFAULT_STATE.sloganOn,
		),
		sloganColor: pick(
			h.sloganColor,
			(v) => typeof v === "boolean",
			DEFAULT_STATE.sloganColor,
		),
		disabled: pick(
			h.disabled,
			(v) => typeof v === "boolean",
			DEFAULT_STATE.disabled,
		),
	};
}

function stateToConfig(): Record<string, any> {
	return {
		color: state.logoColorKey,
		ver: state.versionColored,
		grad: state.gradientOn,
		lines: state.stripeEnabled,
		pkg: state.showPkgSkills,
		speed: state.logoInterval,
		slogan: state.slogan,
		sloganOn: state.sloganOn,
		sloganColor: state.sloganColor,
		disabled: state.disabled,
	};
}

/* ── 统一配置更新（合并 modifyConfig + directApply）── */
function updateState(
	ctx: ExtensionContext,
	applyAndPersist: (msg: string) => void,
	updater: (s: CCHeaderState) => string | null,
): void {
	if (state.disabled) {
		ctx.ui.notify(
			"Command unavailable: pi-cc-header disabled. Use /htg to enable.",
			"info",
		);
		return;
	}

	const prevColor = state.logoColorKey;
	const prevGrad = state.gradientOn;
	const prevStripe = state.stripeEnabled;

	const msg = updater(state);
	if (msg === null) return; // null = 中止（已自行 notify 错误）

	// 脏标记：仅颜色/渐变/横线变化需要重算帧
	if (
		state.logoColorKey !== prevColor ||
		state.gradientOn !== prevGrad ||
		state.stripeEnabled !== prevStripe
	) {
		framesDirty = true;
	}
	if (framesDirty) recomputeFrames();

	// design: 持久化 + 重挂载复用 reapply 序列
	applyAndPersist(msg);
}

function readSettings(settingsPath: string): SettingsFile {
	try {
		return JSON.parse(readFileSync(settingsPath, "utf-8"));
	} catch {
		// safety: 解析失败时备份原文件，防止后续写入覆盖用户数据
		try {
			const bak = settingsPath.replace(/\.json$/, ".bak.json");
			renameSync(settingsPath, bak);
			console.error("pi-cc-header: corrupted settings.json backed up to", bak);
		} catch {
			console.error("pi-cc-header: failed to read or back up settings.json");
		}
		return {};
	}
}

/* ── 入口 ── */
export default function (pi: ExtensionAPI) {
	const settingsPath = join(
		process.env.HOME ?? "",
		".pi",
		"agent",
		"settings.json",
	);

	const saveSettings = (s: SettingsFile) => {
		writeFileSync(settingsPath, JSON.stringify(s, null, 2) + "\n", "utf-8");
	};

	const configStartupEnabled = (s: SettingsFile) => {
		s.quietStartup = true;
		s.clearOnStart = true;
		saveSettings(s);
		process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
	};

	const reapply = (
		pi: ExtensionAPI,
		ctx: ExtensionContext,
		s: SettingsFile,
		msg: string,
	) => {
		s.ccHeader = stateToConfig();
		saveSettings(s);
		active?.dispose();
		active = undefined;
		apply(pi, ctx, "none");
		ctx.ui.notify(msg, "info");
	};

	// design: 复用 read→set ccHeader→save→dispose→apply→notify 序列
	// （/htg /hv /hdf 等不走 updateState 的命令手动调 reapply，走 updateState 的命令在回调中传 reapply）

	pi.on("session_before_switch", (event, _ctx) => {
		if (event.reason === "resume") {
			isResuming = true;
		}
	});

	pi.on("session_start", (event, ctx) => {
		const s = readSettings(settingsPath);
		const h = s.ccHeader || {};
		state = stateFromConfig(h);
		if (state.disabled) return;
		// design: /hrl 已移除（pi 当前版本 ctx.ui.reload() 不可用），启动时无条件抑制资源列表
		configStartupEnabled(s);
		invalidateStats();
		framesDirty = true;
		recomputeFrames();
		// Skip animation on reload, resume, and pi -r/--resume to avoid screen flickering
		const skipAnimation =
			event.reason === "reload" ||
			isResuming ||
			(event.reason === "startup" &&
				(process.argv.includes("-r") || process.argv.includes("--resume")));
		if (isResuming) isResuming = false;
		// setTimeout(0): 延迟到 TUI 管道就绪后再挂载 header，避免与其他初始化竞态
		setTimeout(() => apply(pi, ctx, "none", skipAnimation), 0);
	});

	pi.registerCommand("htg", {
		description: "Toggle pi-cc-header ENABLED/DISABLED",
		handler: async (_args, ctx) => {
			const s = readSettings(settingsPath);
			const h = s.ccHeader || {};
			if (state.disabled) {
				state.disabled = false;
				h.disabled = false;
				s.ccHeader = h;
				invalidateStats();
				configStartupEnabled(s);
				reapply(pi, ctx, s, "pi-cc-header: ENABLED");
			} else {
				state.disabled = true;
				h.disabled = true;
				s.ccHeader = h;
				s.quietStartup = false;
				s.clearOnStart = false;
				saveSettings(s);
				active?.dispose();
				active = undefined;
				ctx.ui.setHeader(undefined);
				ctx.ui.notify(
					"pi-cc-header: DISABLED. Takes effect next session. Config saved, /htg to re-enable.",
					"info",
				);
			}
		},
	});

	pi.registerCommand("hi", {
		description: "Toggle IBM-style ON/OFF",
		handler: async (_args, ctx) => {
			updateState(
				ctx,
				(msg) => reapply(pi, ctx, readSettings(settingsPath), msg),
				(s) => {
					s.stripeEnabled = !s.stripeEnabled;
					return `IBM-style: ${s.stripeEnabled ? "ON" : "OFF"}`;
				},
			);
		},
	});

	pi.registerCommand("hc", {
		description:
			"Header color: <code> = set (c a r o y g w b p); no args = show color key",
		handler: async (args, ctx) => {
			if (!args) {
				ctx.ui.notify(
					`Header color: ${state.logoColorKey} (${COLOR_NAMES[state.logoColorKey]}). Available: ${Object.entries(
						COLOR_NAMES,
					)
						.map(([k, n]) => `${k}=${n}`)
						.join(" ")}`,
					"info",
				);
				return;
			}
			updateState(
				ctx,
				(msg) => reapply(pi, ctx, readSettings(settingsPath), msg),
				(s) => {
					if (!CMAP[args]) {
						ctx.ui.notify(
							`Invalid color: "${args}". Available: ${Object.keys(CMAP).join(" ")}`,
							"error",
						);
						return null;
					}
					s.logoColorKey = args;
					return `Color: ${args}`;
				},
			);
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
				// consistency: /hv <all|pi|off> 不走 updateState, 手动检查 disabled
				if (state.disabled) {
					ctx.ui.notify(
						"Command unavailable: pi-cc-header disabled. Use /htg to enable.",
						"info",
					);
					return;
				}
				state.versionColored = v === "all" ? 2 : v === "pi" ? 1 : 0;
				{
					const s = readSettings(settingsPath);
					s.ccHeader = stateToConfig();
					saveSettings(s);
				}
				active?.reapply();
				ctx.ui.notify(
					`Version label color: ${["OFF", "Pi only", "Pi+ver"][state.versionColored]}`,
					"info",
				);
				return;
			}
			// /hv 不触发动画：直接改 state + reapply，不经过 updateState（不走 framesDirty / recomputeFrames）
			if (state.disabled) {
				ctx.ui.notify(
					"Command unavailable: pi-cc-header disabled. Use /htg to enable.",
					"info",
				);
				return;
			}
			const next = (state.versionColored + 1) % 3;
			state.versionColored = next;
			{
				const s = readSettings(settingsPath);
				s.ccHeader = stateToConfig();
				saveSettings(s);
			}
			active?.reapply();
			ctx.ui.notify(
				`Version label color: ${["OFF", "Pi only", "Pi+ver"][next]}`,
				"info",
			);
			return;
		},
	});

	pi.registerCommand("hm", {
		description: "Toggle Minecraft-style ON/OFF",
		handler: async (_args, ctx) => {
			updateState(
				ctx,
				(msg) => reapply(pi, ctx, readSettings(settingsPath), msg),
				(s) => {
					s.gradientOn = !s.gradientOn;
					return `Minecraft-style: ${s.gradientOn ? "ON" : "OFF"}`;
				},
			);
		},
	});

	pi.registerCommand("hdf", {
		description: "Reset pi-cc-header to developer defaults (overwrites config)",
		handler: async (_args, ctx) => {
			state = { ...DEFAULT_STATE };
			framesDirty = true;
			recomputeFrames();
			invalidateStats();
			reapply(
				pi,
				ctx,
				readSettings(settingsPath),
				"Reset to developer defaults",
			);
		},
	});

	pi.registerCommand("hsp", {
		description:
			"Animation speed: no args = show; <number> = set (25 50 75 100)",
		handler: async (args, ctx) => {
			if (!args) {
				ctx.ui.notify(
					`Animation speed: ${state.logoInterval}ms. Available: ${SPEEDS.join(" ")}`,
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
			updateState(
				ctx,
				(msg) => reapply(pi, ctx, readSettings(settingsPath), msg),
				(s) => {
					s.logoInterval = n as (typeof SPEEDS)[number];
					return `Animation speed: ${s.logoInterval}ms`;
				},
			);
		},
	});

	pi.registerCommand("hs", {
		description:
			"Slogan: no args = on/off; <text> = set; -c = toggle color; -d = delete",
		handler: async (args, ctx) => {
			updateState(
				ctx,
				(msg) => reapply(pi, ctx, readSettings(settingsPath), msg),
				(s) => {
					if (!args) {
						if (!s.slogan) {
							ctx.ui.notify(
								"Command unavailable: no slogan set. Use /hs <text> to set one.",
								"error",
							);
							return null;
						}
						s.sloganOn = !s.sloganOn;
						return s.sloganOn ? "Slogan: ON" : "Slogan: OFF";
					}
					if (args === "-c") {
						s.sloganColor = !s.sloganColor;
						return `Slogan color: ${s.sloganColor ? "ON" : "OFF"}`;
					}
					if (args === "-d") {
						s.slogan = "";
						s.sloganOn = false;
						return "Slogan: deleted";
					}
					const text = args.trim();
					if (!text) {
						ctx.ui.notify(
							`Invalid slogan: "". Slogan must be between 1 and ${MAX_SLOGAN_LENGTH} characters.`,
							"error",
						);
						return null;
					}
					if (text.length > MAX_SLOGAN_LENGTH) {
						ctx.ui.notify(
							`Invalid slogan: "${text}". Slogan must be between 1 and ${MAX_SLOGAN_LENGTH} characters.`,
							"error",
						);
						return null;
					}
					s.slogan = text;
					s.sloganOn = true;
					return `Slogan: ${text}`;
				},
			);
		},
	});

	pi.registerCommand("hps", {
		description: "Toggle pkg skills VISIBLE/HIDDEN",
		handler: async (_args, ctx) => {
			updateState(
				ctx,
				(msg) => reapply(pi, ctx, readSettings(settingsPath), msg),
				(s) => {
					s.showPkgSkills = !s.showPkgSkills;
					return `Pkg skills: ${s.showPkgSkills ? "VISIBLE" : "HIDDEN"}`;
				},
			);
		},
	});

	pi.registerCommand("hcl", {
		description: "Clear all pi-cc-header config for clean uninstall",
		handler: async (_args, ctx) => {
			const s = readSettings(settingsPath);
			delete s.ccHeader;
			delete s.quietStartup;
			delete s.clearOnStart;
			saveSettings(s);
			state = { ...DEFAULT_STATE, disabled: true };
			active?.dispose();
			active = undefined;
			ctx.ui.setHeader(undefined);
			ctx.ui.notify(
				"pi-cc-header Config: cleared. You can now uninstall the package.",
				"info",
			);
		},
	});
}
