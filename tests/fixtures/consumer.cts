import palette = require("react-extract-colors");

export function usePalette(url: string): string | null {
	return palette.useExtractColors(url, { format: "hex", textContrast: 7 })
		.textColor;
}

// @ts-expect-error CommonJS consumers must also get the typed hook.
const invalid: symbol = palette.useExtractColors;
