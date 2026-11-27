import palette = require("react-extract-colors");

export function usePalette(url: string, maxSize?: number): string | null {
	return palette.useExtractColors(url, {
		format: "hex",
		textContrast: 7,
		maxSize,
	}).textColor;
}

// @ts-expect-error CommonJS consumers must also get the typed hook.
const invalid: symbol = palette.useExtractColors;
