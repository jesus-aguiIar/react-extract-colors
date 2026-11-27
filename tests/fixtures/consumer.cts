import palette = require("react-extract-colors");

export function usePalette(url: string): string[] {
	return palette.useExtractColors(url, { format: "hex" }).colors;
}

// @ts-expect-error CommonJS consumers must also get the typed hook.
const invalid: symbol = palette.useExtractColors;
