import { useEffect, useMemo, useState } from "react";
import {
	type Format,
	formatColors,
	getTextColor,
	defaultTextContrast,
} from "../colorFormats.js";
import { type Color, type SortBy, extractPalette } from "../palette.js";

interface UseExtractColorReturn {
	textColor: string | null;
	dominantColor: string | null;
	darkerColor: string | null;
	lighterColor: string | null;
	loading: boolean;
	error: Error | null;
	colors: string[];
}

interface Options {
	textContrast?: number | undefined;
	maxColors?: number | undefined;
	format?: Format | undefined;
	maxSize?: number | undefined;
	colorSimilarityThreshold?: number | undefined;
	sortBy?: SortBy | undefined;
	crossOrigin?: string | undefined;
}

export const useExtractColors = (
	imageUrl: string,
	options?: Options,
): UseExtractColorReturn => {
	const {
		maxColors = 3,
		format = "rgba",
		textContrast = defaultTextContrast,
		maxSize = 18,
		colorSimilarityThreshold = 50,
		sortBy = "dominance",
		crossOrigin = "anonymous",
	} = options ?? {};
	const [palette, setPalette] = useState<Color[] | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		let active = true;
		setLoading(true);
		setError(null);
		setPalette(null);
		async function loadPalette() {
			try {
				const image = await loadImage(imageUrl, crossOrigin);
				if (!active) return;
				setPalette(
					extractDominantColors(
						image,
						maxSize,
						colorSimilarityThreshold,
						sortBy,
					),
				);
			} catch (reason) {
				if (active)
					setError(
						reason instanceof Error
							? reason
							: new Error("Failed to load image"),
					);
			} finally {
				if (active) setLoading(false);
			}
		}
		void loadPalette();
		return () => {
			active = false;
		};
	}, [imageUrl, maxSize, colorSimilarityThreshold, sortBy, crossOrigin]);

	const formatted = useMemo(
		() =>
			palette
				? formatColors(palette, format, maxColors)
				: {
						colors: [],
						dominantColor: null,
						darkerColor: null,
						lighterColor: null,
					},
		[palette, format, maxColors],
	);
	const dominant = palette?.[0];
	const textColor = useMemo(
		() => (dominant ? getTextColor(dominant, textContrast, format) : null),
		[dominant, textContrast, format],
	);
	return { ...formatted, textColor, loading, error };
};

function loadImage(
	imageUrl: string,
	crossOrigin: string,
): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = crossOrigin;
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("Failed to load image"));
		img.src = imageUrl;
	});
}

function extractDominantColors(
	image: HTMLImageElement,
	maxSize: number,
	colorSimilarityThreshold: number,
	sortBy: SortBy,
): Color[] {
	const { width, height } = image;
	if (
		!Number.isFinite(width) ||
		width <= 0 ||
		!Number.isFinite(height) ||
		height <= 0
	) {
		throw new Error("Image width and height must be positive, finite numbers");
	}

	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Failed to get canvas context");

	const scaleFactor = Math.min(1, maxSize / Math.max(width, height));
	canvas.width = Math.max(1, Math.floor(width * scaleFactor));
	canvas.height = Math.max(1, Math.floor(height * scaleFactor));
	ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
	const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
	return extractPalette(data, colorSimilarityThreshold, sortBy);
}
