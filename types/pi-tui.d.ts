declare module "@earendil-works/pi-tui" {
	export function truncateToWidth(
		text: string,
		width: number,
		ellipsis: string,
	): string;
	export function visibleWidth(text: string): number;

	export interface Component {
		render(width: number): string[];
		invalidate(): void;
		dispose(): void;
	}

	export interface TUI {
		requestRender(): void;
	}
}
