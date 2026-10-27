# Centrail Calculations

Replayable price and energy estimates from normalized AI token usage. The library
keeps method identity, parameter hashes, rounding and missing-price coverage
explicit so applications can explain and reproduce their results.

It provides TypeScript types and ESM modules. Callers supply a reviewed parameter
artifact; the library does not collect usage, fetch rates or choose a catalog.
The [Centrail app](https://github.com/braydenyancy/centrail) presents usage and work,
and the [CLI](https://github.com/braydenyancy/centrail-cli) collects local evidence.
This package supplies calculation methods independently of either application.

## Install

```sh
npm install --save-exact @centrail/calculations
```

Use the README bundled with the installed version for its supported API and
runtime. This checkout documents development code and can be ahead of npm.
Version **0.1.0 is Node-only** and has no `createEnergyCalculator`. See the
[API compatibility notes](docs/api.md#runtime-and-release-compatibility) and
[release history](https://github.com/braydenyancy/centrail-calculations/releases).

Import a specific module; there is no root export:

| Import suffix | Purpose |
| --- | --- |
| `/energy` | Token-to-kWh estimates and scenario bounds |
| `/pricing` | Exact-decimal pricing, rounding and coverage |
| `/documents` | Strict parsing, canonical JSON and content hashes |
| `/workflow` | Review proposals and explicit acceptance records |
| `/catalog-observations` | Retain catalog evidence for review |

## Run an example

From a clone of this repository, use the Node version in [`.node-version`](.node-version):

```sh
npm ci
npm run build
node examples/energy.mjs calculations/energy/parameters.v1.yaml
node examples/pricing.mjs calculations/pricing/proposal-2026-10-08/artifact.json
```

These examples use synthetic token counts and retained parameters. Parameter files
are not included in the npm package. Installed consumers retain their own reviewed
artifacts; see [API examples and result contracts](docs/api.md).

Price estimates are not provider invoices. Missing prices remain unpriced or
partial, not free. Retained pricing catalogs are proposals, not current accepted
rates. Energy bounds are scenarios, not measurements or confidence intervals;
water, carbon and equivalence conversions are outside the energy method.

## Documentation and development

- [API and integration](docs/api.md) — inputs, outputs, runtime support and repeated calculations.
- [Methods and review](docs/methodology.md) — assumptions, evidence and proposal acceptance.
- [Versioning and replay](docs/versioning.md) — package, method and parameter identities.
- [Retained evidence](calculations/README.md) — historical artifacts and reproduction commands.
- [Contributing](CONTRIBUTING.md) — development setup and `npm run check`.
- [Releases](docs/releasing.md) — maintainer publication workflow.
- [Security](SECURITY.md) — vulnerability reporting and trust boundaries.

[Apache-2.0](LICENSE). Retained third-party evidence keeps its own license and
attribution in [NOTICE](NOTICE). Participation follows the [code of conduct](CODE_OF_CONDUCT.md).
