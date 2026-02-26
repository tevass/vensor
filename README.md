# vensor

`vensor` is a CLI to validate npm package compatibility across:

- `dependencies`
- `peerDependencies`
- runtime `engines` (for example `node`)

It helps you check whether a set of packages can coexist before installing or upgrading dependencies.

## Installation

```bash
pnpm add -D @tev4ss/vensor
```

Or run without installing globally:

```bash
npx @tev4ss/vensor check react --target next
```

## Requirements

- Node.js `>=18`

## Command

### `check <...packages>`

Check compatibility between npm packages, target packages, and runtime engines.

```bash
vensor check <...packages> [options]
```

### Options

- `--target [package]` One or more target packages to compare against (repeatable).
- `--engine <engine>` Validate engine constraints (repeatable), for example `--engine node=22`.
- `--json` Print JSON output for CI/automation.
- `--cwd <path>` Working directory used to resolve `package.json` when targets are not provided.

## Examples

Check a package against explicit targets:

```bash
vensor check react eslint --target next --target @emotion/react
```

Check engine compatibility together with package compatibility:

```bash
vensor check react --target next --engine node=22
```

Use JSON output in CI:

```bash
vensor check react --target next --engine node=22 --json
```

Use dependencies from another project as fallback targets:

```bash
vensor check react --cwd ./examples/my-app
```

## How compatibility is evaluated

### 1) Version resolution

- If a package is provided without version (for example `react`), `vensor` resolves to the latest stable release.
- If a package is provided with partial version (for example `react@17`), `vensor` resolves to the latest compatible version in that major.

### 2) Engine validation (`--engine`)

- The CLI reads package metadata from the npm registry.
- If a package declares `engines.node`, it checks the provided engine version with semver.
- Engine status is reported as compatible, incompatible, or unknown (when no engine is declared).

### 3) Package relationship validation (`--target`)

For each pair of packages `(A, B)`, the CLI validates declared relationships bidirectionally:

1. If `A` declares `B` in `dependencies` or `peerDependencies`, it validates that constraint.
2. Otherwise, if `B` declares `A`, it validates that constraint.
3. If neither side declares the other, status is `unknown`.

### 4) Fallback to `package.json`

When no `--target` is provided, `vensor` reads `dependencies` from `package.json` in `--cwd` and prompts you to select targets interactively.

## Output

### Default mode

- Human-readable compatibility report.
- Includes dependency and peer dependency checks.
- Includes engine checks.

### JSON mode (`--json`)

Outputs structured JSON for automation and CI pipelines.

## Exit codes

- `64` Missing required input (for example no targets and no `package.json` in `--cwd`).
- `65` Invalid CLI arguments.
- `1` Uncaught runtime error.

## Development

```bash
pnpm install
pnpm link --global
vensor ...
```

Run CLI in dev mode:

```bash
pnpm dev:exec check react --target next
```
