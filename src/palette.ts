export type SortBy = "vibrance" | "dominance";

export interface Color {
	r: number;
	g: number;
	b: number;
	a: number;
}

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

export function extractPalette(
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
