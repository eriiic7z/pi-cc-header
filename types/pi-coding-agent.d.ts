/// <reference path="./pi-tui.d.ts" />

// pi-coding-agent ambient types
declare module "@earendil-works/pi-coding-agent" {
	export const VERSION: string;

	export interface ExtensionAPI {
		getThinkingLevel(): string;
		on(
			event: "session_start",
			handler: (
				event: { reason?: string; previousSessionFile?: string },
				ctx: ExtensionContext,
			) => void,
		): void;
		on(
			event: "session_before_switch",
			handler: (
				event: { reason?: string; targetSessionFile?: string },
				ctx: ExtensionContext,
			) => void,
		): void;
		registerCommand(
			name: string,
			def: {
				description: string;
				handler: (
					args: string | undefined,
					ctx: ExtensionContext,
				) => Promise<void>;
			},
		): void;
	}

	export interface ExtensionContext {
		cwd: string;
		mode: string | undefined;
		model?: { id: string };
		ui: {
			theme: { fg(name: string, text: string): string };
			setHeader(
				ctor?: (
					tui: import("@earendil-works/pi-tui").TUI,
				) => import("@earendil-works/pi-tui").Component,
			): void;
			setFooter(ctor?: unknown): void;
			setWorkingIndicator(ctor?: unknown): void;
			setEditorComponent(ctor?: unknown): void;
			notify(msg: string, level: string): void;
			reload(): void;
		};
	}
}
