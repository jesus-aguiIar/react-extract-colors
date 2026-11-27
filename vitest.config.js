import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		maxWorkers: 4,
		include: ["tests/**/*.test.js"],
		coverage: {
			include: ["src/**/*.ts"],
			reporter: ["text", "lcov"],
			thresholds: { lines: 90, statements: 90, branches: 75, functions: 90 },
		},
	},
});
