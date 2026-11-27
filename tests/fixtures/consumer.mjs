import assert from "node:assert/strict";
import { createRequire } from "node:module";
import React from "react";
import { useExtractColors } from "react-extract-colors";

// React 17 exposes this renderer as a CommonJS subpath.
const { renderToString } = createRequire(import.meta.url)("react-dom/server");

function Palette() {
	const result = useExtractColors("image.png");
	assert.deepEqual(result, {
		dominantColor: null,
		textColor: null,
		darkerColor: null,
		lighterColor: null,
		colors: [],
		loading: true,
		error: null,
	});
	return null;
}

renderToString(React.createElement(Palette));
