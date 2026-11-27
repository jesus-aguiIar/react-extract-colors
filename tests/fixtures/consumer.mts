import { useExtractColors } from "react-extract-colors";

export function usePalette(url: string, maxSize?: number) {
	const result = useExtractColors(url, {
		format: "hex",
		sortBy: "vibrance",
		maxSize,
		textContrast: 7,
		maxColors: 4,
		colorSimilarityThreshold: 10,
		crossOrigin: "anonymous",
	});
	const palette: string[] = result.colors;
	const dominant: string | null = result.dominantColor;
	const error: Error | null = result.error;
	const loading: boolean = result.loading;
	const text: string | null = result.textColor;
	return { palette, dominant, text, error, loading };
}

// @ts-expect-error The exported hook must retain its signature (issue #5).
const invalid: symbol = useExtractColors;
// @ts-expect-error Only supported color formats are accepted.
useExtractColors("image.png", { format: "cmyk" });
// @ts-expect-error A URL is required.
useExtractColors();
