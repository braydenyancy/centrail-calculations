# Changelog

Changes affecting behavior, methods, artifact formats or source coverage belong
here. Package versions and calculation identities are separate; see
[versioning](docs/versioning.md).

## 0.1.0 — 2026-10-11

- Extract deterministic pricing, energy, document, proposal and catalog-observation
  modules into one standalone package with ESM exports and TypeScript declarations.
- Preserve `token-rates-v1`, `token-buckets-v3` and `token-energy-v2` replay behavior,
  explicit content hashes and partial pricing coverage.
- Retain licensed pricing evidence, unaccepted proposals and synthetic energy
  compatibility fixtures with methodology documentation.
- Add isolated package checks, offline artifact regeneration, portable CI and
  contribution guidance. Publication does not establish production adoption.
- Replace backtracking in method frontmatter parsing with literal delimiter
  searches; preserve accepted document bytes and reject malformed large inputs.

The npm tarball matches source commit `94b9dbf`; see the
[publication receipt](docs/verification/npm-0.1.0.md). No GitHub version tag or
build-provenance attestation was available when this publication was verified.
