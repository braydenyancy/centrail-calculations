# Historical initial package verification

This is a historical record, not the current test matrix, dependency contract or
release configuration. For development use [CONTRIBUTING.md](../CONTRIBUTING.md),
[package scripts](../package.json) and the [CI workflow](../.github/workflows/ci.yml).

2026-10-09. This receipt covers the standalone package, its retained evidence and
the repository's verification commands. It does not establish adoption by a CLI
or server, an accepted pricing catalog, npm publication or scientific measurement.

At that revision, `npm run check` passed on Node.js 22.23.1 and 24.21.0:

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
bytes and results. `npm run test:package` checks the current checkout; reproducing
the initial bytes requires the recorded source and toolchain. Hashes describe this
initial artifact, not every future version. Unit tests and
fixed outputs demonstrate implementation behavior, not independent scientific
accuracy or complete billing coverage.

Local Actionlint validation passes for all workflows. Release guards reject tag
and package-name mismatches, changed or multiple tarballs, and receipt/version
mismatches. Publishing was disabled at this capture; current release requirements
are in [releasing.md](releasing.md).

Hosted platform results are recorded by [CI](https://github.com/braydenyancy/centrail-calculations/actions/workflows/ci.yml)
and [CodeQL](https://github.com/braydenyancy/centrail-calculations/actions/workflows/codeql.yml).
Use the run for the exact commit being reviewed. The local checks above do not
substitute for the native Windows/macOS jobs or prove owner-only settings are enabled.

## Document-parser security follow-up

The first hosted CodeQL analysis identified potential polynomial backtracking in
the method frontmatter parser. Literal delimiter searches replace that expression;
13 added regressions bring the suite to 159 passing tests. All ten retained
proposal files still regenerate byte-for-byte, and packed consumers pass.

An independent comparison over 33,102 retained/generated cases found the same
accepted metadata and body bytes and the same rejected inputs. A bounded local
probe rejected a 7 MB malformed document in approximately 22 ms. That observation
supports the structural removal of backtracking; it is not a general latency SLA.
The initial package receipt above remains historical because the parser repair
changes the package's code bytes. Hosted analysis and alert state must be checked
for the exact follow-up commit.
