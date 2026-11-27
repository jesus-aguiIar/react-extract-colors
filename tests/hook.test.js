// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useExtractColors } from "../src/index";
import { mockImages } from "./image-environment.js";

const red = [255, 0, 0, 255];
const blue = [0, 0, 255, 255];
const gray = [128, 128, 128, 255];
const green = [0, 255, 0, 255];

let images;
beforeEach(() => {
	images = mockImages();
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function mount(options = { format: "hex" }) {
	return renderHook(({ url, options }) => useExtractColors(url, options), {
		initialProps: { url: "first.png", options },
	});
}

describe("palette extraction", () => {
	test("starts loading with an empty palette and finishes with default settings", async () => {
		const { result } = mount({});
		expect(result.current).toEqual({
			colors: [],
			dominantColor: null,
			darkerColor: null,
			lighterColor: null,
			loading: true,
			error: null,
		});
		expect(images.requests[0]).toMatchObject({
			url: "first.png",
			crossOrigin: "anonymous",
		});
		await images.load([red, blue, gray, green, blue]);
		expect(result.current.colors).toHaveLength(3);
		expect(result.current.dominantColor).toMatch(/^rgba\(0,\s*0,\s*255,/);
		expect(result.current).toMatchObject({ loading: false, error: null });
	});

	test.each([
		["hex", blue, "#0000ff"],
		["rgb", blue, "rgb(0,0,255)"],
		["hsl", red, "hsl(0, 100%, 50%)"],
		["hsl", green, "hsl(120, 100%, 50%)"],
		["hsl", blue, "hsl(240, 100%, 50%)"],
		["hsl", [255, 128, 192, 255], "hsl(330, 100%, 75%)"],
		["hsl", gray, "hsl(0, 0%, 50%)"],
		["hsv", blue, "hsv(240, 100%, 100%)"],
		["hsv", gray, "hsv(0, 0%, 50%)"],
		["hsv", [0, 0, 0, 255], "hsv(0, 0%, 0%)"],
	])("formats %s for %j", async (format, pixel, expected) => {
		const { result } = mount({ format });
		await images.load([pixel]);
		expect(result.current.colors).toEqual([expected]);
		expect(result.current.dominantColor).toBe(expected);
	});

	test("derives lighter and darker variants and clamps channel values", async () => {
		const { result } = mount();
		await images.load([[10, 200, 250, 255]]);
		expect(result.current).toMatchObject({
			dominantColor: "#0ac8fa",
			darkerColor: "#0096c8",
			lighterColor: "#28e6ff",
		});
	});

	test.each([
		["dominance", ["#808080", "#ff0000"]],
		["vibrance", ["#ff0000", "#808080"]],
	])("sorts by %s", async (sortBy, expected) => {
		const { result } = mount({ sortBy, format: "hex" });
		await images.load([gray, red, gray]);
		expect(result.current.colors).toEqual(expected);
		expect(result.current.dominantColor).toBe(expected[0]);
	});

	test("groups colors below the similarity threshold and keeps colors at the boundary", async () => {
		const { result } = mount({ colorSimilarityThreshold: 10, format: "hex" });
		await images.load([blue, [0, 0, 0, 255], [9, 0, 0, 255], [10, 0, 0, 255]]);
		expect(result.current.colors).toEqual(["#000000", "#0000ff", "#0a0000"]);
	});

	test.each([
		["dominance", ["#ffffff", "#ff8000"]],
		["vibrance", ["#ff8000", "#ffffff"]],
	])(
		"uses the most frequent shade in each group for %s",
		async (sortBy, expected) => {
			const nearWhite = [244, 245, 246, 255];
			const white = [255, 255, 255, 255];
			const orange = [255, 128, 0, 255];
			const { result } = mount({ format: "hex", sortBy });
			await images.load([nearWhite, orange, white, white, white]);
			expect(result.current.colors).toEqual(expected);
			expect(result.current.dominantColor).toBe(expected[0]);
		},
	);

	test("counts the whole group and keeps its first shade on a frequency tie", async () => {
		const nearRed = [250, 0, 0, 255];
		const { result } = mount();
		await images.load([red, nearRed, nearRed, red, blue, blue, blue]);
		expect(result.current.colors).toEqual(["#ff0000", "#0000ff"]);
	});

	test("matches new shades against the original group anchor", async () => {
		const anchor = [100, 0, 0, 255];
		const winner = [130, 0, 0, 255];
		const separate = [160, 0, 0, 255];
		const { result } = mount();
		await images.load([anchor, winner, winner, separate]);
		expect(result.current.colors).toEqual(["#820000", "#a00000"]);
	});

	test("counts exact RGBA shades separately inside an RGB group", async () => {
		const { result } = mount();
		const nearRed = [245, 0, 0, 255];
		const translucentRed = [255, 0, 0, 150];
		await images.load([red, translucentRed, nearRed, nearRed]);
		expect(result.current.colors).toEqual(["#f50000"]);
	});

	test("ranks vibrance using the winning shade of each group", async () => {
		const { result } = mount({ format: "hex", sortBy: "vibrance" });
		const mutedRed = [215, 0, 0, 255];
		await images.load([red, mutedRed, mutedRed, [0, 235, 0, 255]]);
		expect(result.current.colors).toEqual(["#00eb00", "#d70000"]);
	});

	test("counts identical pixels when similarity filtering is disabled", async () => {
		const { result } = mount({ format: "hex", colorSimilarityThreshold: 0 });
		await images.load([red, blue, blue]);
		expect(result.current.colors).toEqual(["#0000ff", "#ff0000"]);
	});

	test.each([0, 1, 8])(
		"limits the palette to maxColors=%i and still returns a dominant color",
		async (maxColors) => {
			const { result } = mount({ maxColors, format: "hex" });
			await images.load([red, blue, blue]);
			expect(result.current.colors).toEqual(
				["#0000ff", "#ff0000"].slice(0, maxColors),
			);
			expect(result.current.dominantColor).toBe("#0000ff");
		},
	);

	test("ignores transparent pixels and handles an entirely transparent image", async () => {
		const { result, rerender } = mount();
		await images.load([
			[0, 0, 0, 0],
			[255, 0, 0, 124],
			[0, 0, 255, 125],
		]);
		expect(result.current.colors).toEqual(["#0000ff"]);
		rerender({ url: "transparent.png", options: { format: "hex" } });
		await images.load([[0, 0, 0, 0]]);
		expect(result.current).toMatchObject({
			colors: [],
			loading: false,
			error: null,
		});
	});
});

describe("image loading", () => {
	test.each([
		[90, 45, undefined, 18, 9],
		[40, 80, 10, 5, 10],
		[2, 3, 18, 2, 3],
	])("scales %i × %i with maxSize %s", async (width, height, maxSize, w, h) => {
		mount(maxSize === undefined ? {} : { maxSize });
		await images.load([red], { width, height });
		expect(images.drawImage).toHaveBeenCalledWith(
			images.requests[0].image,
			0,
			0,
			w,
			h,
		);
		expect(images.getImageData).toHaveBeenCalledWith(0, 0, w, h);
	});

	test.each(["anonymous", "use-credentials", ""])(
		"sets crossOrigin=%j before requesting the image",
		(crossOrigin) => {
			mount({ crossOrigin });
			expect(images.requests[0]).toMatchObject({
				url: "first.png",
				crossOrigin,
			});
		},
	);

	test("returns an error when a 2D context is unavailable", async () => {
		images.getContext.mockReturnValue(null);
		const { result } = mount();
		await images.load([red]);
		expect(result.current.loading).toBe(false);
		expect(result.current.error).toBeInstanceOf(Error);
	});

	test("reuses the result on rerender with equivalent option values", async () => {
		const { result, rerender } = mount();
		await images.load([red]);
		rerender({ url: "first.png", options: { format: "hex" } });
		expect(images.requests).toHaveLength(1);
		expect(result.current.colors).toEqual(["#ff0000"]);
	});

	test("ignores a late image error after the selected URL changes", async () => {
		const { result, rerender } = mount();
		const first = images.requests[0];
		rerender({ url: "second.png", options: { format: "hex" } });
		await images.load([blue]);
		await images.fail(first);
		expect(result.current).toMatchObject({
			dominantColor: "#0000ff",
			error: null,
			loading: false,
		});
	});

	test("resolves the selected image under StrictMode", async () => {
		const { result } = renderHook(
			() => useExtractColors("strict.png", { format: "hex" }),
			{ wrapper: StrictMode },
		);
		await images.load([red]);
		expect(result.current).toMatchObject({
			colors: ["#ff0000"],
			loading: false,
		});
	});
});

// Each expected failure asserts the desired public behavior. Remove .fails with its fix.
describe("known regressions", () => {
	test.fails("normalizes the RGBA alpha channel for CSS", async () => {
		const { result } = mount({ format: "rgba" });
		await images.load([[20, 40, 80, 128]]);
		const alpha = Number(
			result.current.dominantColor.match(/,\s*([\d.]+)\)$/)[1],
		);
		expect(alpha).toBeCloseTo(128 / 255, 2);
	});

	test.fails(
		"preserves the newest palette when requests finish out of order",
		async () => {
			const { result, rerender } = mount();
			const first = images.requests[0];
			rerender({ url: "second.png", options: { format: "hex" } });
			await images.load([blue]);
			await images.load([red], { request: first });
			expect(result.current.dominantColor).toBe("#0000ff");
		},
	);

	test.fails(
		"sets loading again when a completed request is replaced",
		async () => {
			const { result, rerender } = mount();
			await images.load([red]);
			rerender({ url: "second.png", options: { format: "hex" } });
			expect(result.current.loading).toBe(true);
		},
	);

	test.fails("clears a previous image error on recovery", async () => {
		const { result, rerender } = mount();
		await images.fail();
		rerender({ url: "valid.png", options: { format: "hex" } });
		await images.load([red]);
		expect(result.current.error).toBeNull();
	});

	test.fails("exposes image loading errors as Error instances", async () => {
		const { result } = mount();
		await images.fail();
		expect(result.current.error).toBeInstanceOf(Error);
	});

	test.fails.each([
		["format", { format: "rgb" }, ["rgb(128,128,128)", "rgb(255,0,0)"]],
		["maxColors", { maxColors: 1 }, ["#808080"]],
		["sortBy", { sortBy: "vibrance" }, ["#ff0000", "#808080"]],
		[
			"colorSimilarityThreshold",
			{ colorSimilarityThreshold: 500 },
			["#808080"],
		],
	])(
		"applies changes in %s even when the URL stays the same",
		async (_name, options, expected) => {
			const { result, rerender } = mount();
			const pixels = [gray, red, gray];
			await images.load(pixels);
			const request = images.requests.at(-1);
			rerender({ url: "first.png", options: { format: "hex", ...options } });
			if (images.requests.at(-1) !== request) await images.load(pixels);
			expect(result.current.colors).toEqual(expected);
		},
	);

	test.fails("uses updated credentials when requesting the same URL", () => {
		const { rerender } = mount();
		rerender({ url: "first.png", options: { crossOrigin: "use-credentials" } });
		expect(images.requests.at(-1).crossOrigin).toBe("use-credentials");
	});

	test.fails("resamples the same URL after maxSize changes", async () => {
		const { rerender } = mount();
		await images.load([red], { width: 40, height: 40 });
		const request = images.requests.at(-1);
		rerender({ url: "first.png", options: { format: "hex", maxSize: 4 } });
		if (images.requests.at(-1) !== request)
			await images.load([red], { width: 40, height: 40 });
		expect(images.getImageData.mock.lastCall).toEqual([0, 0, 4, 4]);
	});

	test.fails.each([
		[1000, 1],
		[1, 1000],
	])(
		"keeps both canvas dimensions positive for %i × %i",
		async (width, height) => {
			const { result } = mount();
			await images.load([blue], { width, height });
			expect(result.current).toMatchObject({
				dominantColor: "#0000ff",
				loading: false,
				error: null,
			});
		},
	);

	test.fails("reports a canvas read error and finishes loading", async () => {
		const { result } = mount();
		images.getImageData.mockImplementation(() => {
			throw new DOMException("Read denied", "SecurityError");
		});
		await images.load([red]);
		expect(result.current.loading).toBe(false);
		expect(result.current.error).toBeTruthy();
	});
});
