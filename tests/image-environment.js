import { act } from "@testing-library/react";
import { vi } from "vitest";

// jsdom owns the canvas dimensions. Only decoding and reading pixels are simulated.
export function mockImages() {
	const requests = [];
	class TestImage {
		set src(url) {
			requests.push({ url, crossOrigin: this.crossOrigin, image: this });
		}
	}
	vi.stubGlobal("Image", TestImage);
	const drawImage = vi.fn();
	const getImageData = vi.fn((_x, _y, width, height) => {
		if (!width || !height)
			throw new DOMException("Empty canvas", "IndexSizeError");
		const [image] = drawImage.mock.lastCall;
		return { data: image.pixels };
	});
	const getContext = vi
		.spyOn(HTMLCanvasElement.prototype, "getContext")
		.mockReturnValue({ drawImage, getImageData });

	async function load(
		pixels,
		{ request = requests.at(-1), width = pixels.length, height = 1 } = {},
	) {
		const { image } = request;
		Object.assign(image, {
			width,
			height,
			pixels: Uint8ClampedArray.from(pixels.flat()),
		});
		await act(async () => image.onload?.(new Event("load")));
	}

	async function fail(request = requests.at(-1)) {
		await act(async () => request.image.onerror?.(new Event("error")));
	}

	return { requests, drawImage, getImageData, getContext, load, fail };
}
