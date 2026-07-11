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

/* ── Pi 官方 Logo 动画（提取自 pi.dev/install.sh）── */
type LogoColor =
	| "panel"
	| "cyan"
	| "red"
	| "green"
	| "orange"
	| "white"
	| "flash";
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

	if (frame.phase === 6)
		return has("3,2 3,3 3,4 4,4 4,2 5,2 5,3 5,5 6,2 6,5") ? "white" : "panel";
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

const PRECOMPUTED_LOGO_FRAMES: string[][] = LOGO_FRAMES.map((_, i) =>
	piLogoFrame(i, (s: string) => brand(s)),
);

/* ── 工具函数 ── */
function formatCwd(cwd: string): string {
	const home = process.env.HOME;
	return home && cwd.startsWith(home) ? `~${cwd.slice(home.length)}` : cwd;
}

function padRight(text: string, width: number): string {
	const clipped = truncateToWidth(text, width, "");
	return clipped + " ".repeat(Math.max(0, width - visibleWidth(clipped)));
}

/* ── 统计 ── */
function countExtensions(home: string): number {
	try {
		const s = JSON.parse(
			readFileSync(join(home, ".pi", "agent", "settings.json"), "utf-8"),
		);
		return Array.isArray(s.packages) ? s.packages.length : 0;
	} catch {
		return 0;
	}
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

function computeStats(ctx: ExtensionContext) {
	const home = process.env.HOME ?? "";
	return {
		extensions: countExtensions(home),
		skills: countSkills(home, ctx.cwd),
	};
}

/* ── 组件：启动头部 ── */
class PiHeader implements Component {
	private frame = 0;
	private readonly timer: NodeJS.Timeout;
	private readonly stats: { extensions: number; skills: number };

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

		const logoLines = PRECOMPUTED_LOGO_FRAMES[this.frame];
		const logoWidth = 14;
		const infoMaxWidth = Math.max(0, width - logoWidth);

		const model = this.ctx.model?.id ?? "Default";
		const effort = this.pi.getThinkingLevel();
		const cwd = formatCwd(this.ctx.cwd);
		const statsLine = `${this.stats.extensions} extensions · ${this.stats.skills} skills`;

		const info: Record<number, string> = {
			2: `${brand("Pi")} v${VERSION}`,
			3: muted(`${model} · ${effort}`),
			4: muted(statsLine),
			5: muted(cwd),
		};

		const lines: string[] = [];
		for (let i = 0; i < logoLines.length; i++) {
			const right = info[i] != null ? padRight(info[i], infoMaxWidth) : "";
			lines.push(
				padRight(logoLines[i] ?? "", logoWidth) + right,
			);
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

function apply(pi: ExtensionAPI, ctx: ExtensionContext) {
	if (ctx.mode !== "tui") return;
	ctx.ui.setTitle("Pi");
	ctx.ui.setHeader((tui) => {
		active?.dispose();
		active = new PiHeader(pi, ctx, tui);
		return active;
	});
	ctx.ui.setFooter();
	ctx.ui.setWorkingIndicator();
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
		if (getSettings().clearOnStart === true) {
			process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
		}
		setTimeout(() => apply(pi, ctx), 0);
	});

	pi.registerCommand("clear-on-start", {
		description: "Toggle auto-clearing scrollback on startup (on/off)",
		handler: async (args, ctx) => {
			const s = getSettings();
			const cur = s.clearOnStart === true;
			let next: boolean;
			if (args === "off" || args === "false") next = false;
			else if (!args || args === "on" || args === "true") next = !cur;
			else {
				ctx.ui.notify("Usage: /clear-on-start [on|off]", "error");
				return;
			}
			s.clearOnStart = next;
			saveSettings(s);
			ctx.ui.notify(`clear-on-start: ${next ? "ON" : "OFF"}`, "info");
		},
	});

	pi.registerCommand("pi-look", {
		description:
			"Restore Pi's built-in TUI header, footer, editor, and spinner",
		handler: async (_args, ctx) => {
			active?.dispose();
			active = undefined;
			ctx.ui.setTitle("pi");
			ctx.ui.setHeader(undefined);
			ctx.ui.setFooter();
			ctx.ui.setWorkingIndicator();
			ctx.ui.setEditorComponent(undefined);
			ctx.ui.notify("Built-in pi look restored", "info");
		},
	});
}
