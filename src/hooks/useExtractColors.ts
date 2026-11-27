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
	textContrast: number;
	maxColors: number;
	format: Format;
	maxSize: number;
	colorSimilarityThreshold: number;
	sortBy: SortBy;
	crossOrigin: string;
}

const defaultOptions: Options = {
	textContrast: defaultTextContrast,
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
	const {
		maxColors,
		format,
		textContrast,
		maxSize,
		colorSimilarityThreshold,
		sortBy,
		crossOrigin,
	} = {
		...defaultOptions,
		...customOptions,
	};
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
				const result = await extractDominantColors(imageUrl, {
					maxSize,
					colorSimilarityThreshold,
					sortBy,
					crossOrigin,
				});
				if (active) setPalette(result);
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

async function extractDominantColors(
	imageUrl: string,
	{
		maxSize,
		colorSimilarityThreshold,
		sortBy,
		crossOrigin,
	}: Pick<
		Options,
		"maxSize" | "colorSimilarityThreshold" | "sortBy" | "crossOrigin"
	>,
): Promise<Color[]> {
	const image = await new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = crossOrigin;
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("Failed to load image"));
		img.src = imageUrl;
	});

	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Failed to get canvas context");

	const scaleFactor = Math.min(
		1,
		maxSize / Math.max(image.width, image.height),
	);
	canvas.width = image.width * scaleFactor;
	canvas.height = image.height * scaleFactor;
	ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
	const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
	return extractPalette(data, colorSimilarityThreshold, sortBy);
}
