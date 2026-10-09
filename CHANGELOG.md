# Changelog

Changes affecting behavior, methods, artifact formats or source coverage belong
here. Package versions and calculation identities are separate; see
[versioning](docs/versioning.md).

## Unreleased

- Extract deterministic pricing, energy, document, proposal and catalog-observation
  modules into one standalone package with ESM exports and TypeScript declarations.
- Preserve `token-rates-v1`, `token-buckets-v3` and `token-energy-v2` replay behavior,
  explicit content hashes and partial pricing coverage.
- Retain licensed pricing evidence, unaccepted proposals and synthetic energy
  compatibility fixtures with methodology documentation.
- Add isolated package checks, offline artifact regeneration, portable CI and
  contribution guidance. No package release or production adoption is implied.
