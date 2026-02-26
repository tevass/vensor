import fs from "node:fs";
import path from "node:path";

import { cancel, isCancel, log, multiselect, outro } from "@clack/prompts";
import boxen from "boxen";
import type { CAC } from "cac";
import kleur from "kleur";
import semver from "semver";
import type { PackageJson } from "type-fest";
import { ZodError, z } from "zod";

import { EXIT_CODES } from "../constants";
import { NPM } from "../npm/fetch";

import {
	buildCompatibilityGroupReport,
	buildCompatibilityGroups,
} from "../utils/compatibility";

const stringArray = z
	.array(z.string())
	.or(z.string())
	.transform((value) => (Array.isArray(value) ? value : [value]))
	.pipe(z.array(z.string()));

const checkOptionsSchema = z.object({
	pkgs: z.array(z.string()),
	target: stringArray,
	json: z.boolean(),
	cwd: z.string(),
	engine: stringArray
		.transform((engines) => engines.map((engine) => engine.split("=")))
		.pipe(
			z.array(
				z.tuple([
					z.string(),
					z
						.string()
						.transform((version) => semver.coerce(version)?.version ?? version),
				]),
			),
		)
		.default([]),
});

export const check = {
	register(cli: CAC) {
		cli
			.command("check <...packages>")
			.option("--target [package]", "Package use to check compatibility", {
				default: [],
			})
			.option(
				"--engine <engine>",
				"Validates compatibility with the engine (e.g: node=20)",
			)
			.option("--json", "Output as JSON", { default: false })
			.option("--cwd <path>", "Current working directory", {
				default: process.cwd(),
			})
			.action(async (pkgs, opts) => {
				try {
					const options = checkOptionsSchema.parse({ pkgs, ...opts });

					const basePackages = Array.from(options.pkgs);
					const baseTargetsPackages = Array.from(options.target);

					const hasTargetsPackages = !!baseTargetsPackages.length;

					const packageJsonPath = path.resolve(options.cwd, "package.json");
					const hasPackageJson = fs.existsSync(packageJsonPath);

					if (!hasTargetsPackages && !hasPackageJson) {
						cancel(
							`No packages provided. Use ${kleur.italic().bold(`--target`)} or ensure a ${kleur.italic().bold(`package.json`)} exists in the ${kleur.italic().bold(`cwd`)}.`,
						);

						return process.exit(EXIT_CODES.MISSING_ARGS);
					}

					if (!hasTargetsPackages) {
						const buffer = await fs.promises.readFile(packageJsonPath);
						const packageJson = JSON.parse(buffer.toString()) as PackageJson;

						const projectDependencies = Object.entries(
							packageJson.dependencies ?? {},
						) as Array<[string, string]>;

						const projectDependenciesOptions = projectDependencies.map(
							([name, raw]) => {
								const version = semver.coerce(raw)?.version ?? raw;
								const target = `${name}@${version}`;

								return { name: target, value: target };
							},
						);

						const selectedDependencies = await multiselect({
							message: "Select the target packages to check compatibility:",
							options: projectDependenciesOptions,
							required: true,
						});

						if (isCancel(selectedDependencies)) {
							return cancel("Operation cancelled");
						}

						baseTargetsPackages.push(...selectedDependencies);
					}

					const [packages, targets] = await Promise.all([
						Promise.all(
							basePackages.map((target) => NPM.getPackage({ name: target })),
						),
						Promise.all(
							baseTargetsPackages.map((target) =>
								NPM.getPackage({ name: target }),
							),
						),
					]);

					const targetsGroups = buildCompatibilityGroups({
						subjects: targets,
						candidates: packages,
						enginesSpecs: options.engine,
					});

					const packagesGroups = buildCompatibilityGroups({
						subjects: packages,
						candidates: targets,
						enginesSpecs: options.engine,
					});

					if (options.json) {
						const data = {
							targets: targetsGroups,
							packages: packagesGroups,
						};

						return process.stdout.write(JSON.stringify(data).concat("\n"));
					}

					const targetReports = buildCompatibilityGroupReport({
						groups: targetsGroups,
						title: "Target packages",
					});

					const packagesReports = buildCompatibilityGroupReport({
						groups: packagesGroups,
						title: "Dependencies packages",
					});

					const completedReports = [targetReports, packagesReports]
						.sort((a, b) => a.length - b.length)
						.join("\n\n");

					log.message(
						boxen(completedReports, {
							title: "Compatibility Graph",
							titleAlignment: "center",
							borderStyle: "round",
							padding: 1,
						}),
					);

					return outro(kleur.green("Compatibility check completed!"));
				} catch (error) {
					if (error instanceof ZodError) {
						log.error(z.prettifyError(error));
						return process.exit(EXIT_CODES.INVALID_ARGS);
					}

					log.error(error);
					return process.exit(EXIT_CODES.UNCAUGHT);
				}
			});
	},
};