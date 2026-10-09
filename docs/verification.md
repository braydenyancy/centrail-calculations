# Initial package verification

2026-10-09. This receipt covers the standalone package, its retained evidence and
the repository's verification commands. It does not establish adoption by a CLI
or server, an accepted pricing catalog, npm publication or scientific measurement.

`npm run check` passes on Node.js 22.23.1 and 24.21.0:

- 146 unit tests across five files, plus TypeScript checking and the ESM build.
- All ten retained pricing/energy proposal files regenerate byte-for-byte;
  overwriting an existing proposal directory is refused.
- Two clean consumers install the actual npm tarball offline without lifecycle
  scripts. Each exercises all five exports, 96 energy assertions over 32 model
  cases, tamper rejection and the distinct historical pricing-rounding methods.
- Packed declarations typecheck without ambient Node types. The declarations
  emitted by TypeScript 7.0.2 also pass a consumer check with TypeScript 5.9.3.
- Both documented executable examples run against the installed package.
- The package contains 14 allowlisted files and no runtime dependencies. The
  tarball produced on the two tested Node versions has the same SHA-256.

The [packed-package receipt](verification/initial-package.json) identifies those
bytes and results. Reproduce it with `npm run test:package -- --out artifacts`.
Hashes describe this initial artifact, not every future version. Unit tests and
fixed outputs demonstrate implementation behavior, not independent scientific
accuracy or complete billing coverage.

Local Actionlint validation passes for all workflows. Release guards reject tag
and package-name mismatches, changed or multiple tarballs, and receipt/version
mismatches. Publishing remains disabled until owner setup and release approval.

Hosted platform results are recorded by [CI](https://github.com/braydenyancy/centrail-calculations/actions/workflows/ci.yml)
and [CodeQL](https://github.com/braydenyancy/centrail-calculations/actions/workflows/codeql.yml).
Use the run for the exact commit being reviewed. The local checks above do not
substitute for the native Windows/macOS jobs or prove owner-only settings are enabled.
