import boxen from "boxen";
import kleur from "kleur";
import semver from "semver";
import treeify, { type TreeObject } from "treeify";

import { PACKAGE_DEPENDENCY_KEYS } from "../constants";
import type { PackageDefinition } from "../npm/types";
import {
	type CompatibilityGroupItemsKeys,
	type CompatibilityGroups,
	type CompatibilityResult,
	isCompatibleResult,
	isIncompatibleResult,
	type PackageDependencyGroups,
} from "../types";

interface FormatResultParams {
	result: CompatibilityResult;
}

function formatResultToTree({ result }: FormatResultParams): TreeObject {
	if (isCompatibleResult(result)) {
		return {
			[`✅ ${result.id}`]: {
				[kleur.green(`(required ${result.required})`)]: "",
			},
		};
	}

	if (isIncompatibleResult(result)) {
		return {
			[`❌ ${result.id}`]: {
				[kleur.red(`required ${result.required}`)]: "",
			},
		};
	}

	return {
		[kleur.yellow(`${result.name} no declared`)]: "",
	};
}

interface BuildCompatibilityGroupsParams {
	subjects: PackageDefinition[];
	candidates: PackageDefinition[];
	enginesSpecs: Array<[string, string]>;
}

export function buildCompatibilityGroups({
	subjects,
	candidates,
	enginesSpecs,
}: BuildCompatibilityGroupsParams): CompatibilityGroups {
	const groups = subjects.reduce<CompatibilityGroups>((groups, subject) => {
		const { dependencies, peerDependencies } = PACKAGE_DEPENDENCY_KEYS.reduce(
			(groups, key) => {
				const target = subject[key];

				const results = candidates.map<CompatibilityResult>((pkg) => {
					const expected = target[pkg.name];

					if (!expected) {
						return {
							id: pkg.id,
							name: pkg.name,
							version: pkg.version,
							status: "unknown",
							required: "",
						};
					}

					const isCompatible = semver.satisfies(pkg.version, expected);

					if (!isCompatible) {
						return {
							id: pkg.id,
							name: pkg.name,
							version: pkg.version,
							status: "incompatible",
							required: expected,
						};
					}

					return {
						id: pkg.id,
						name: pkg.name,
						version: pkg.version,
						status: "compatible",
						required: expected,
					};
				});

				groups[key] = results;

				return groups;
			},
			{} as PackageDependencyGroups,
		);

		const engines = enginesSpecs.map<CompatibilityResult>(
			([engine, version]) => {
				const expected = subject.engines[engine];

				const id = `${engine}@${version}`;

				if (!expected) {
					return {
						id,
						name: engine,
						version: subject.version,
						status: "unknown",
						required: "",
					};
				}

				const isCompatible = semver.satisfies(version, expected);

				if (!isCompatible) {
					return {
						id,
						name: engine,
						version,
						status: "incompatible",
						required: expected,
					};
				}

				return {
					id,
					name: engine,
					version,
					status: "compatible",
					required: expected,
				};
			},
		);

		groups[subject.id] = {
			dependencies,
			peerDependencies,
			engines,
		};

		return groups;
	}, {} as CompatibilityGroups);

	return groups;
}

interface BuildCompatibilityGroupReportParams {
	groups: CompatibilityGroups;
	title: string;
}

export function buildCompatibilityGroupReport({
	groups,
	title,
}: BuildCompatibilityGroupReportParams): string {
	const rows = Object.entries(groups).map(([name, group]) => {
		const content = Object.entries(group)
			.filter(([_, results]) => !!results.length)
			.reduce(
				(tree, [key, results]) => {
					const target = key as CompatibilityGroupItemsKeys;

					const subTree = results
						.map((result) => formatResultToTree({ result }))
						.reduce<Record<string, string>>(
							(acc, line) => Object.assign(acc, line),
							{},
						);

					tree[target] = subTree;

					return tree;
				},
				{} as Record<CompatibilityGroupItemsKeys, Record<string, string>>,
			);

		const root = kleur.bold().blue(name);
		const tree = treeify.asTree(content, false, true);

		const row = [root, tree].join("\n");

		return row;
	});

	const text = rows.join("\n").trim();

	return boxen(text, {
		title,
		titleAlignment: "center",
		borderStyle: "round",
		padding: 1,
	});
}