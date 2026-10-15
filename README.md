# Centrail Calculations

Reproducible API token-price and energy estimates, with explicit methods,
versioned parameters and reviewable source evidence.

`@centrail/calculations` is a TypeScript library for Node.js 22.12 and later. It
provides ESM modules and type declarations, with no runtime dependencies. Callers
choose the exact method and parameter artifact; the library does not fetch rates,
select a current catalog or collect usage data.

**Status:** [`@centrail/calculations@0.1.0`](https://www.npmjs.com/package/@centrail/calculations/v/0.1.0)
is published. Its bytes match the verified source build; see the
[publication receipt](docs/verification/npm-0.1.0.md) for checks and provenance
limitations. Retained pricing data is a proposal for review, not an accepted current
catalog. The Centrail app now imports this package for server energy totals; see the
[consumer status](docs/api.md#consumer-status). Energy estimates preserve a
historical method and its limitations.

## Install

```sh
npm install --save-exact @centrail/calculations@0.1.0
```

Use Node.js 22.12 or later. Import one of the modules listed below; there is no
root export. Supply an explicit reviewed parameter artifact. This package has no
CLI executable: `npx @centrail/calculations` is not an installation or setup flow.
A Node version manager such as mise supplies Node/npm; install the library in the
consuming project with npm. The same npm commands apply on native Windows.

To upgrade, install an explicitly reviewed version with
`npm install --save-exact @centrail/calculations@<version>` and verify your retained
inputs and artifacts against it. To remove the dependency, remove its imports and run
`npm uninstall @centrail/calculations`; retained parameter files belong to your
project and are not removed by npm.

## Try it locally

Install a current Node.js 22 LTS release (at least 22.12) or Node.js 24 and npm, then:

```sh
git clone https://github.com/braydenyancy/centrail-calculations.git
cd centrail-calculations
npm ci
npm run check
node examples/energy.mjs calculations/energy/parameters.v1.yaml
node examples/pricing.mjs calculations/pricing/proposal-2026-10-08/artifact.json
```

The examples use synthetic token counts and explicit retained parameters. They
do not read coding-tool history or send data anywhere. The pricing example shows
why two one-token events can have different totals under retained rounding methods.

`npm run check` checks types, runs the tests, regenerates retained artifacts and
tests an installed package in an isolated consumer. CI runs the checks on Linux,
macOS and Windows with Node.js 22 and 24. Check the workflow results for a
particular revision before relying on it.

To try a local development build in another project, run `npm pack` here and
install the resulting `.tgz` there with `npm install /path/to/package.tgz`.
The package contains the runtime and declarations; source evidence and parameter
artifacts stay in this repository. Retain the exact artifact used by your project.

## Use an explicit artifact

After building, this example runs from the repository root. An installed consumer
supplies its own reviewed parameter file.

```js
import { readFileSync } from "node:fs";
import {
  compileEnergyArtifact,
  replayEnergy,
} from "@centrail/calculations/energy";

const artifact = compileEnergyArtifact(
  readFileSync("calculations/energy/parameters.v1.yaml", "utf8"),
);
const estimate = replayEnergy(artifact, {
  input: 1_000,
  output: 250,
  cacheRead: 500,
  cacheWrite: 0,
});

// Retain method and parameter identity alongside the result.
console.log({
  methodId: artifact.parameters.methodId,
  methodRevision: artifact.parameters.methodRevision,
  parameterRevision: artifact.parameterRevision,
  unit: "kWh",
  rangeMeaning: "scenario-bounds",
  estimate,
});
```

Omitting a model selects the retained default model factor. The returned `low`,
`value` and `high` are scenario estimates, not measurements or confidence intervals.
See the [API and integration contract](docs/api.md) before integrating pricing or
energy into a product.

| Import | Purpose |
| --- | --- |
| `@centrail/calculations/pricing` | Import, validate, compare and replay token rates |
| `@centrail/calculations/energy` | Compile and replay retained energy parameters |
| `@centrail/calculations/workflow` | Build review proposals and explicit acceptance records |
| `@centrail/calculations/catalog-observations` | Preserve models.dev/OpenRouter observations for review |
| `@centrail/calculations/documents` | Strict documents, canonical JSON and content hashes |

There is no root export. Browser compatibility is not claimed.

## Methods and evidence

| Method | Contract |
| --- | --- |
| `token-rates-v1`, revision `1` | USD estimates rounded per event to six decimal places |
| `token-buckets-v3`, revision `1` | USD estimates aggregated with integer units of 10⁻¹² USD |
| `token-energy-v2` | Retained token-to-kWh coefficients, ordered model factors and scenario bounds |

Missing pricing evidence stays visible as partial or unpriced coverage; it is not
treated as a supported zero price. The retained pricing proposal contains 21 exact
entries and excludes 4,482 source entries, including 102 direct-provider entries
with unsupported dimensions. It is deliberately incomplete. Neither catalog dates nor upstream commits establish
historical price-effective dates.

Review the [pricing method](calculations/pricing/METHOD.md),
[energy method](calculations/energy/METHOD.md),
[fixture explanation](calculations/energy/fixtures/METHOD.md) and
[methodology review guide](docs/methodology.md). The
[versioning guide](docs/versioning.md) explains how package, schema, method and
parameter identities differ. [Evidence commands](calculations/README.md) reproduce
the retained proposals offline.

## Contribute

Verification covers distinct layers; agreement in one layer does not prove another.

| Comparison | Executed coverage | Remaining limits |
| --- | --- | --- |
| ccusage, Tokscale and other collection tools | [CLI comparison suite](https://github.com/braydenyancy/centrail-cli/pull/15) compares retained/generated file trees and token accounting | Separate from this library; no proof of billed cost |
| LiteLLM | Importer regressions and retained pricing snapshot regeneration; optional real `completion_cost` differential on seven synthetic cases | No live provider rates or billing invoices |
| Langfuse | Exact pinned `calculateUsageCosts` method execution on the same seven cases | Full ingestion, normalization, model matching and tier selection are outside this suite |
| models.dev / OpenRouter | Observation parser regressions and reviewable source records | No calculator execution; observations do not become accepted prices automatically |
| Energy | Retained coefficients/fixture regeneration, 32-model numerical replay and tamper rejection | Scenario estimates, not measured energy or independent scientific validation |

Run the optional cost comparisons with `npm run prepare:cost-comparisons` once,
then `npm run test:cost-comparisons` offline. See the
[comparison scope and reproduction](docs/verification/cost-comparisons.md).
`npm run test:published` separately verifies immutable public npm bytes and
installed-consumer behavior; it requires network access.

Useful contributions include counterexamples, clearer assumptions, better source
evidence, new methods and tests that expose numerical or coverage mistakes. Start
with [CONTRIBUTING.md](CONTRIBUTING.md). Maintainers use the
[release pattern](docs/releasing.md). Use the issue forms for bugs and methodology
proposals, and [SECURITY.md](SECURITY.md) for sensitive vulnerability reports.
Participation follows the [code of conduct](CODE_OF_CONDUCT.md).

Original code and documentation are licensed under [Apache-2.0](LICENSE).
[NOTICE](NOTICE) identifies retained third-party material and its licenses.
