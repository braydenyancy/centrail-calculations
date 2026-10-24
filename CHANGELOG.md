# Changelog

Changes affecting behavior, methods, artifact formats or source coverage belong
here. Package versions and calculation identities are separate; see
[versioning](docs/versioning.md).

## Unreleased

- Document the existing npm `0.1.0` publication, installation and verification
  receipt. No runtime or methodology change.

## [0.2.0](https://github.com/braydenyancy/centrail-calculations/compare/v0.1.0...v0.2.0) (2026-10-24)


### ⚠ BREAKING CHANGES

* supported Node.js versions are now ^22.23.4 || ^24.22.1. Earlier patch releases and untested majors no longer satisfy package engines.

### Bug Fixes

* require patched Node.js 22 and 24 runtimes ([#24](https://github.com/braydenyancy/centrail-calculations/issues/24)) ([1ca0549](https://github.com/braydenyancy/centrail-calculations/commit/1ca05497a1bacf2d7d608753930222820e31621b))

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
