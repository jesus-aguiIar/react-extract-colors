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
			return formatToHsl;
		case "hsv":
			return formatToHsv;
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
