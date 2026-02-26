import { z } from "zod";

/**
 * Can implement more fields from the npm registry package definition to more robust compatibility checks.
 * Like `peerDependenciesMeta` and `optionalDependencies`.
 *
 * Reference: https://github.com/npm/registry/blob/master/docs/responses/package-metadata.md
 */
export const packageDefinitionSchema = z
	.object({
		_id: z.string(),
		name: z.string(),
		version: z.string(),
		dependencies: z.record(z.string(), z.string().optional()).default({}),
		peerDependencies: z.record(z.string(), z.string().optional()).default({}),
		engines: z
			.record(z.string().or(z.literal("node")), z.string().optional())
			.default({}),
	})
	.transform(({ _id, ...rest }) => ({
		id: _id,
		...rest,
	}));

export type PackageDefinition = z.infer<typeof packageDefinitionSchema>;

export const packageMetadataSchema = z.object({
	name: z.string(),
	"dist-tags": z.object({ latest: z.string() }),
	versions: z.record(z.string(), packageDefinitionSchema),
});

export type PackageMetadata = z.infer<typeof packageMetadataSchema>;