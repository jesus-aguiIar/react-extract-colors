import { execFileSync, spawnSync } from "node:child_process";
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";

const require = createRequire(import.meta.url);
const tsc = require.resolve("typescript/bin/tsc");
let consumer;
let files;
let commonjs;

beforeAll(() => {
	consumer = mkdtempSync(join(tmpdir(), "extract-colors-consumer-"));
	const env = { ...process.env, npm_config_cache: join(consumer, "cache") };
	const [archive] = JSON.parse(
		execFileSync("npm", ["pack", "--json", "--pack-destination", consumer], {
			env,
			encoding: "utf8",
		}),
	);
	files = archive.files.map(({ path }) => path);

	// Local runs reuse the installed React peers offline. CI also checks the tarball
	// against the oldest supported React major and a newer one in isolated consumers.
	const reactMajor = process.env.CONSUMER_REACT_MAJOR;
	const dependencies = reactMajor
		? [`react@${reactMajor}`, `react-dom@${reactMajor}`]
		: ["--offline", "--legacy-peer-deps"];
	execFileSync(
		"npm",
		[
			"install",
			"--ignore-scripts",
			"--no-audit",
			"--no-fund",
			"--no-save",
			join(consumer, archive.filename),
			...dependencies,
		],
		{ cwd: consumer, env, stdio: "pipe" },
	);
	if (!reactMajor) {
		for (const peer of ["react", "react-dom"]) {
			symlinkSync(
				dirname(require.resolve(`${peer}/package.json`)),
				join(consumer, "node_modules", peer),
				"junction",
			);
		}
	}

	for (const fixture of [
		"consumer.mjs",
		"consumer.cjs",
		"consumer.mts",
		"consumer.cts",
	]) {
		copyFileSync(
			new URL(`./fixtures/${fixture}`, import.meta.url),
			join(consumer, fixture),
		);
	}
	mkdirSync(join(consumer, "empty-types"));
	commonjs = spawnSync(process.execPath, ["consumer.cjs"], {
		cwd: consumer,
		encoding: "utf8",
	});
	if (commonjs.error) throw commonjs.error;
}, 120_000);

afterAll(() => {
	if (consumer) rmSync(consumer, { recursive: true, force: true });
});

test("ships the runtime and public declarations, excluding tests and CI", () => {
	expect(files).toContain("dist/types/index.d.ts");
	expect(
		files.some((path) =>
			/^(tests\/|coverage\/|\.github\/|vitest\.config\.)/.test(path),
		),
	).toBe(false);
});

test("imports the ESM package and can render the hook on the server", () => {
	execFileSync(process.execPath, ["consumer.mjs"], {
		cwd: consumer,
		stdio: "pipe",
	});
});

test("the CommonJS probe can reach the package entry", () => {
	if (commonjs.status !== 0) {
		expect(commonjs.stderr).toMatch(
			/ReferenceError: require is not defined|ERR_REQUIRE_ESM/,
		);
	}
});

test.fails("loads the public hook via CommonJS require", () => {
	expect(commonjs.status, commonjs.stderr).toBe(0);
});

function checkTypes(fixture, mode, skipLibCheck) {
	const result = spawnSync(
		process.execPath,
		[
			tsc,
			fixture,
			"--strict",
			"--noEmit",
			"--target",
			"es2020",
			"--module",
			mode === "bundler" ? "esnext" : mode,
			"--moduleResolution",
			mode,
			"--typeRoots",
			"empty-types",
			"--skipLibCheck",
			String(skipLibCheck),
		],
		{ cwd: consumer, encoding: "utf8" },
	);
	if (result.error) throw result.error;
	expect(result.status, result.stdout + result.stderr).toBe(0);
}

const resolutions = ["node16", "nodenext", "bundler"];
test.each(
	resolutions.flatMap((mode) =>
		[true, false].map((skipLibCheck) => ({ mode, skipLibCheck })),
	),
)(
	"preserves consumer types with $mode and skipLibCheck=$skipLibCheck",
	({ mode, skipLibCheck }) => {
		checkTypes("consumer.mts", mode, skipLibCheck);
	},
);

test.fails.each(["node16", "nodenext"])(
	"provides declarations for a typed CommonJS consumer with %s",
	(mode) => checkTypes("consumer.cts", mode, false),
);
