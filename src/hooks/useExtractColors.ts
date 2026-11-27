import { useEffect, useState } from "react";

type SortBy = "vibrance" | "dominance";
type Format = "hex" | "rgb" | "hsl" | "hsv" | "rgba";

interface Color {
	r: number;
	g: number;
	b: number;
	a: number;
}

interface FormattedColors {
	dominantColor: string | null;
	darkerColor: string | null;
	lighterColor: string | null;
	colors: string[];
}

interface ExtractedColors {
	dominantColor: Color | null;
	darkerColor: Color | null;
	lighterColor: Color | null;
	colors: Color[];
}

interface UseExtractColorReturn {
	dominantColor: string | null;
	darkerColor: string | null;
	lighterColor: string | null;
	loading: boolean;
	error: Error | null;
	colors: string[];
}

interface Options {
	maxColors: number;
	format: Format;
	maxSize: number;
	colorSimilarityThreshold: number;
	sortBy: SortBy;
	crossOrigin: string;
}

const defaultOptions: Options = {
	maxColors: 3,
	format: "rgba",
	maxSize: 18,
	colorSimilarityThreshold: 50,
	sortBy: "dominance",
	crossOrigin: "anonymous",
};

export const useExtractColors = (
	imageUrl: string,
	customOptions: Partial<Options> = {},
): UseExtractColorReturn => {
	const options: Options = { ...defaultOptions, ...customOptions };

	const [colors, setColors] = useState<string[]>([]);
	const [dominantColor, setDominantColor] = useState<string | null>(null);
	const [darkerColor, setDarkerColor] = useState<string | null>(null);
	const [lighterColor, setLighterColor] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		let isMounted = true;

		(async () => {
			try {
				if (isMounted) {
					const colors = await extractDominantColors(imageUrl, options);
					const formattedColors = formatColors(colors, options);

					setDominantColor(formattedColors.dominantColor);
					setDarkerColor(formattedColors.darkerColor);
					setLighterColor(formattedColors.lighterColor);
					setColors(formattedColors.colors);
				}
			} catch (error) {
				if (isMounted) {
					setError(error as Error);
				}
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		})();

		return () => {
			isMounted = false;
		};
	}, [imageUrl]);

	return { dominantColor, darkerColor, lighterColor, loading, error, colors };
};

async function extractDominantColors(
	imageUrl: string,
	options: Options,
): Promise<ExtractedColors> {
	const { maxSize, colorSimilarityThreshold, sortBy } = options;

	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = options.crossOrigin;

		img.onload = function () {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");

			if (!ctx) {
				reject(new Error("Failed to get canvas context"));
				return;
			}

			const { width, height } = img;
			const scaleFactor = Math.min(1, maxSize / Math.max(width, height));

			canvas.width = width * scaleFactor;
			canvas.height = height * scaleFactor;

			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const pixels = imageData.data;

			const colors = extractPalette(pixels, colorSimilarityThreshold, sortBy);

			let dominantColor: Color | null = null;
			let darkerColor: Color | null = null;
			let lighterColor: Color | null = null;

			if (colors.length > 0) {
				dominantColor = colors[0];
				darkerColor = getDarkerColor(dominantColor);
				lighterColor = getLighterColor(dominantColor);
			}

			resolve({
				dominantColor: dominantColor,
				darkerColor: darkerColor,
				lighterColor: lighterColor,
				colors: colors,
			});
		};

		img.onerror = function (error) {
			reject(error);
		};

		img.src = imageUrl;
	});
}

function formatColors(
	colors: ExtractedColors,
	options: Options,
): FormattedColors {
	const { format, maxColors } = options;

	switch (format) {
		case "hex":
			return {
				dominantColor: formatToHex(colors.dominantColor),
				darkerColor: formatToHex(colors.darkerColor),
				lighterColor: formatToHex(colors.lighterColor),
				colors: colors.colors
					.slice(0, maxColors)
					.map((color) => formatToHex(color)),
			};
		case "rgb":
			return {
				dominantColor: formatToRgb(colors.dominantColor),
				darkerColor: formatToRgb(colors.darkerColor),
				lighterColor: formatToRgb(colors.lighterColor),
				colors: colors.colors
					.slice(0, maxColors)
					.map((color) => formatToRgb(color)),
			};
		case "hsl":
			return {
				dominantColor: formatToHsl(colors.dominantColor),
				darkerColor: formatToHsl(colors.darkerColor),
				lighterColor: formatToHsl(colors.lighterColor),
				colors: colors.colors
					.slice(0, maxColors)
					.map((color) => formatToHsl(color)),
			};
		case "hsv":
			return {
				dominantColor: formatToHsv(colors.dominantColor),
				darkerColor: formatToHsv(colors.darkerColor),
				lighterColor: formatToHsv(colors.lighterColor),
				colors: colors.colors
					.slice(0, maxColors)
					.map((color) => formatToHsv(color)),
			};
		default:
			return {
				dominantColor: formatToRgba(colors.dominantColor),
				darkerColor: formatToRgba(colors.darkerColor),
				lighterColor: formatToRgba(colors.lighterColor),
				colors: colors.colors
					.slice(0, maxColors)
					.map((color) => formatToRgba(color)),
			};
	}
}

function getDarkerColor(color: Color): Color {
	const { r, g, b, a } = color;
	const darkerRed = Math.max(0, r - 50);
	const darkerGreen = Math.max(0, g - 50);
	const darkerBlue = Math.max(0, b - 50);

	return { r: darkerRed, g: darkerGreen, b: darkerBlue, a };
}

function getLighterColor(color: Color): Color {
	const { r, g, b, a } = color;
	const lighterRed = Math.min(255, r + 30);
	const lighterGreen = Math.min(255, g + 30);
	const lighterBlue = Math.min(255, b + 30);

	return {
		r: lighterRed,
		g: lighterGreen,
		b: lighterBlue,
		a,
	};
}

const formatToRgba = (color: Color | null): string => {
	if (!color) return "rgba(0,0,0,0)";
	const { r, g, b, a } = color;
	return `rgba(${r},${g},${b},${a})`;
};

const formatToHex = (color: Color | null): string => {
	if (!color) return "#000000";
	const { r, g, b } = color;
	return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const formatToRgb = (color: Color | null): string => {
	if (!color) return "rgb(0,0,0)";
	const { r, g, b } = color;
	return `rgb(${r},${g},${b})`;
};

const formatToHsl = (rgba: Color | null): string => {
	if (!rgba) return "hsl(0,0%,0%)";

	const r = rgba.r / 255;
	const g = rgba.g / 255;
	const b = rgba.b / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;

	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (delta !== 0) {
		s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

		switch (max) {
			case r:
				h = (g - b) / delta + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / delta + 2;
				break;
			case b:
				h = (r - g) / delta + 4;
				break;
		}

		h /= 6;
	}

	return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
};

const formatToHsv = (rgba: Color | null): string => {
	if (!rgba) return "hsv(0,0%,0%)";

	const r = rgba.r / 255;
	const g = rgba.g / 255;
	const b = rgba.b / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const d = max - min;

	let h: number, s: number;
	const v = max;

	if (max !== 0) {
		s = d / max;
	} else {
		s = 0;
		h = 0;
		return `hsv(${h}, ${s}%, ${v * 100}%)`;
	}

	if (max === min) {
		h = 0;
	} else {
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
			default:
				h = 0;
		}

		h /= 6;
	}

	return `hsv(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(v * 100)}%)`;
};

type CountedShade = Color & { count: number };

interface ColorGroup {
	anchor: Color;
	representative: CountedShade;
	total: number;
}

function vibrance({ r, g, b }: Color): number {
	// Keep the same whole-percent HSV precision as the public HSV formatter.
	const max = Math.max(r, g, b) / 255;
	if (max === 0) return 0;
	const min = Math.min(r, g, b) / 255;
	const saturation = Math.round(((max - min) / max) * 100) / 100;
	const value = Math.round(max * 100) / 100;
	return saturation * value;
}

function extractPalette(
	pixels: Uint8ClampedArray,
	threshold: number,
	sortBy: SortBy,
): Color[] {
	const shades = new Map<number, CountedShade>();
	for (let i = 0; i < pixels.length; i += 4) {
		const a = pixels[i + 3];
		if (a < 125) continue;
		const r = pixels[i];
		const g = pixels[i + 1];
		const b = pixels[i + 2];
		const key = (r << 24) | (g << 16) | (b << 8) | a;
		const shade = shades.get(key);
		if (shade) shade.count++;
		else shades.set(key, { r, g, b, a, count: 1 });
	}

	const groups: ColorGroup[] = [];
	const squaredThreshold = Math.max(0, threshold) ** 2;
	// Map iteration preserves first appearance for group membership and tied counts.
	for (const shade of shades.values()) {
		const group =
			squaredThreshold > 0 &&
			groups.find(({ anchor }) => {
				const dr = anchor.r - shade.r;
				const dg = anchor.g - shade.g;
				const db = anchor.b - shade.b;
				return dr * dr + dg * dg + db * db < squaredThreshold;
			});
		if (group) {
			group.total += shade.count;
			if (shade.count > group.representative.count)
				group.representative = shade;
		} else {
			groups.push({ anchor: shade, representative: shade, total: shade.count });
		}
	}

	return groups
		.map(({ representative, total }) => ({
			color: representative,
			score: sortBy === "dominance" ? total : vibrance(representative),
		}))
		.sort((a, b) => b.score - a.score)
		.map(({ color }) => color);
}
