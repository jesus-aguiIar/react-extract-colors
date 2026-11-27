import type { Color } from "./palette.js";

export type Format = "hex" | "rgb" | "hsl" | "hsv" | "rgba";

interface FormattedColors {
	dominantColor: string | null;
	darkerColor: string | null;
	lighterColor: string | null;
	colors: string[];
}

function getFormatter(format: Format) {
	switch (format) {
		case "hex":
			return formatToHex;
		case "rgb":
			return formatToRgb;
		case "hsl":
			return (color: Color | null) => formatHue(color, "hsl");
		case "hsv":
			return (color: Color | null) => formatHue(color, "hsv");
		default:
			return formatToRgba;
	}
}

export function formatColors(
	colors: Color[],
	colorFormat: Format,
	maxColors: number,
): FormattedColors {
	const format = getFormatter(colorFormat);
	const dominant = colors[0] ?? null;
	return {
		dominantColor: format(dominant),
		darkerColor: format(dominant && getDarkerColor(dominant)),
		lighterColor: format(dominant && getLighterColor(dominant)),
		colors: colors.slice(0, maxColors).map(format),
	};
}

export const defaultTextContrast = 4.5;

function linearChannel(channel: number): number {
	const srgb = channel / 255;
	return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function displayedRgb(color: Color, format: Format) {
	if (format === "hsl" || format === "hsv") {
		// Contrast is measured against the rounded coordinates returned to the caller.
		const { hue, saturation, level } = hueComponents(color, format);
		const value = level / 100;
		const chroma =
			(saturation / 100) *
			(format === "hsl" ? 1 - Math.abs(2 * value - 1) : value);
		const min = value - (format === "hsl" ? chroma / 2 : chroma);
		const channel = (offset: number) => {
			const sector = (hue / 60 + offset) % 6;
			return (
				255 * (min + chroma * Math.max(0, Math.min(1, sector, 4 - sector)))
			);
		};
		return { r: channel(2), g: channel(0), b: channel(4) };
	}
	if (format === "rgba" && color.a < 255) {
		const alpha = color.a / 255;
		const overWhite = (channel: number) => channel * alpha + 255 * (1 - alpha);
		return {
			r: overWhite(color.r),
			g: overWhite(color.g),
			b: overWhite(color.b),
		};
	}
	return color;
}

export function getTextColor(
	background: Color,
	requestedRatio: number,
	format: Format,
): string {
	const ratio =
		Number.isFinite(requestedRatio) &&
		requestedRatio >= 1 &&
		requestedRatio <= 21
			? requestedRatio
			: defaultTextContrast;
	const { r, g, b } = displayedRgb(background, format);
	const luminance =
		0.2126 * linearChannel(r) +
		0.7152 * linearChannel(g) +
		0.0722 * linearChannel(b);
	const preferDark = (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05);
	// Find the nearest passing 8-bit gray on the stronger side of the background.
	// If no shade reaches the ratio, the search ends at black or white.
	let shade = preferDark ? 0 : 255;
	let limit = preferDark ? 256 : -1;
	while (Math.abs(shade - limit) > 1) {
		const mid = Math.floor((shade + limit) / 2);
		const foreground = linearChannel(mid) + 0.05;
		const contrast = preferDark
			? (luminance + 0.05) / foreground
			: foreground / (luminance + 0.05);
		if (contrast >= ratio) shade = mid;
		else limit = mid;
	}
	return formatToHex({ r: shade, g: shade, b: shade, a: 255 });
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
	return `rgba(${r},${g},${b},${a / 255})`;
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

function hueComponents(color: Color, format: "hsl" | "hsv") {
	const r = color.r / 255;
	const g = color.g / 255;
	const b = color.b / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;
	const lightness = (max + min) / 2;
	const level = format === "hsl" ? lightness : max;
	let hue = 0;
	let saturation = 0;
	if (delta > 0) {
		if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
		else if (max === g) hue = (b - r) / delta + 2;
		else hue = (r - g) / delta + 4;

		if (format === "hsv") saturation = delta / max;
		else saturation = delta / (lightness > 0.5 ? 2 - max - min : max + min);
	}

	return {
		hue: Math.round((hue / 6) * 360),
		saturation: Math.round(saturation * 100),
		level: Math.round(level * 100),
	};
}

function formatHue(color: Color | null, format: "hsl" | "hsv") {
	if (!color) return `${format}(0,0%,0%)`;
	const { hue, saturation, level } = hueComponents(color, format);
	return `${format}(${hue}, ${saturation}%, ${level}%)`;
}
