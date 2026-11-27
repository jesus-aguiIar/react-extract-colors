// rollup.config.js
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import external from "rollup-plugin-peer-deps-external";
import { dts } from "rollup-plugin-dts";

const devMode = process.env.NODE_ENV === "development";

const runtime = {
	input: "src/index.ts",
	output: [
		{
			file: "dist/index.cjs",
			format: "cjs",
			sourcemap: devMode ? "inline" : false,
		},
		{
			file: "dist/index.esm.js",
			format: "esm",
			sourcemap: devMode ? "inline" : false,
		},
	],
	plugins: [
		typescript({ tsconfig: "./tsconfig.json", sourceMap: devMode }),
		commonjs(),
		resolve(),
		external(),
		terser({
			ecma: 2020,
			mangle: {
				toplevel: true,
				reserved: ["useExtractColors"],
			},
			compress: {
				passes: 2,
				module: true,
				toplevel: true,
				unsafe_arrows: true,
				drop_console: !devMode,
				drop_debugger: !devMode,
			},
			output: {
				quote_style: 1,
			},
		}),
	],
	external: ["react", "react-dom"],
};

export default [
	runtime,
	{
		input: "dist/types/index.d.ts",
		output: [
			{ file: "dist/index.d.ts", format: "es" },
			{ file: "dist/index.d.cts", format: "es" },
		],
		plugins: [dts()],
	},
];
