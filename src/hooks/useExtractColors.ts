import { useEffect, useState } from "react";
import { type Format, formatColors } from "../colorFormats.js";
import { type Color, type SortBy, extractPalette } from "../palette.js";

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
					const formattedColors = formatColors(
						colors,
						options.format,
						options.maxColors,
					);

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
): Promise<Color[]> {
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

			resolve(extractPalette(pixels, colorSimilarityThreshold, sortBy));
		};

		img.onerror = function (error) {
			reject(error);
		};

		img.src = imageUrl;
	});
}
