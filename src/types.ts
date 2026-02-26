import type { OverrideProperties } from "type-fest";
import z, { string } from "zod";

const compatibilityStatus = z.enum(["compatible", "incompatible", "unknown"]);

const compatibilityResultSchema = z.object({
	id: string(),
	name: z.string(),
	version: z.string(),
	status: compatibilityStatus,
	required: z.string(),
});

export type CompatibilityResult = z.infer<typeof compatibilityResultSchema>;

const packageDependencyKeysSchema = z.enum([
	"dependencies",
	"peerDependencies",
]);

export type PackageDependencyKeys = z.infer<typeof packageDependencyKeysSchema>;

const packageDependencyGroupsSchema = z.object({
	dependencies: z.array(compatibilityResultSchema),
	peerDependencies: z.array(compatibilityResultSchema),
});

export type PackageDependencyGroups = z.infer<
	typeof packageDependencyGroupsSchema
>;

const compatibilityGroupItemsSchema = packageDependencyGroupsSchema.extend({
	engines: z.array(compatibilityResultSchema),
});

export type CompatibilityGroupItemsKeys =
	keyof typeof compatibilityGroupItemsSchema.shape;

const compatibilityGroupsSchema = z.record(
	z.string(),
	compatibilityGroupItemsSchema,
);

export type CompatibilityGroups = z.infer<typeof compatibilityGroupsSchema>;

// -------------------------------
// ------------ Guards -----------
// -------------------------------

export function isCompatibleResult(
	result: CompatibilityResult,
): result is OverrideProperties<CompatibilityResult, { status: "compatible" }> {
	return result.status === "compatible";
}

export function isIncompatibleResult(
	result: CompatibilityResult,
): result is OverrideProperties<
	CompatibilityResult,
	{ status: "incompatible" }
> {
	return result.status === "incompatible";
}

export function isUnknownResult(
	result: CompatibilityResult,
): result is OverrideProperties<CompatibilityResult, { status: "unknown" }> {
	return result.status === "unknown";
}