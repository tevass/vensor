import fs from "node:fs";
import type { PackageJson } from "type-fest";

const { version } = JSON.parse(
	fs.readFileSync(new URL("../package.json", import.meta.url)).toString(),
) as PackageJson;

export const VERSION = version ?? "0.1.0";

export const NPM_REGISTRY_URL = "https://registry.npmjs.org";

export const PACKAGE_DEPENDENCY_KEYS = [
	"dependencies",
	"peerDependencies",
] as const;

export const EXIT_CODES = {
	UNCAUGHT: 1,
	MISSING_ARGS: 64,
	INVALID_ARGS: 65,
};