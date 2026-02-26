import ky from "ky";
import npa, { type Result } from "npm-package-arg";
import semver from "semver";

import { NPM_REGISTRY_URL } from "../constants";

import {
	type PackageDefinition,
	type PackageMetadata,
	packageDefinitionSchema,
	packageMetadataSchema,
} from "./types";

const ALLOWED_NPA_TYPES: Array<Result["type"]> = ["range", "tag", "version"];

const http = ky.create({
	prefixUrl: NPM_REGISTRY_URL,
	timeout: 1000 * 10, // 10 seconds
	retry: {
		limit: 2,
		methods: ["get"],
		statusCodes: [408, 500, 502, 503, 504],
	},
});

interface NPMFetchPackageOptions {
	name: string;
}

async function fetchPackageMetadata(
	options: NPMFetchPackageOptions,
): Promise<PackageMetadata> {
	const { name } = options;

	const result = npa(name);
	const pkg = result.escapedName ?? result.name ?? name;

	const response = await http.get(pkg).json();

	return packageMetadataSchema.parse(response);
}

async function fetchPackage(
	options: NPMFetchPackageOptions,
): Promise<PackageDefinition> {
	const { name } = options;

	const result = npa(name);
	const pkg = result.escapedName ?? result.name ?? name;
	const version = result.fetchSpec ?? result.rawSpec;

	const response = await http.get(`${pkg}/${version}`).json();

	return packageDefinitionSchema.parse(response);
}

export const NPM = {
	async getPackage(
		options: NPMFetchPackageOptions,
	): Promise<PackageDefinition> {
		const { name } = options;
		const result = npa(name);

		const hasInvalidType = !ALLOWED_NPA_TYPES.includes(result.type);
		if (hasInvalidType) {
			throw new Error(`Invalid package format for: ${name}`);
		}

		if (result.type === "version" || result.type === "tag") {
			return fetchPackage({ name });
		}

		const hasOnlyPackageName = result.rawSpec === "*";
		if (hasOnlyPackageName) {
			return fetchPackage({ name: name.concat("@latest") });
		}

		const pkg = result.escapedName ?? result.name ?? name;
		const metadata = await fetchPackageMetadata({ name: pkg });

		const version = semver.maxSatisfying(
			Object.keys(metadata.versions),
			result.rawSpec,
		);

		if (!version) {
			throw new Error(`Package version not found for: ${name}`);
		}

		const target = metadata.versions[version];
		if (!target) {
			throw new Error(`Package definition not found for: ${name}`);
		}

		return target;
	},
};