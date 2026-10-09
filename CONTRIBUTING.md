# Contributing

Help make calculation results easier to reproduce, understand and challenge.
Bug reports, documentation corrections and carefully scoped method proposals are
welcome. A reproducible counterexample is as useful as a patch.

Search existing issues first. Open a methodology proposal before making a large
change to a formula, model-matching rule, source importer or supported billing
dimension. Small fixes can go straight to a pull request. For sensitive findings,
follow [SECURITY.md](SECURITY.md).

## Development

Use a current Node.js 22 LTS release (at least 22.12) or Node.js 24 and npm. From a clean checkout:

```sh
npm ci
npm run check
```

Individual commands are `npm run typecheck`, `npm test`, `npm run build`,
`npm run test:artifacts` and `npm run test:package`. The package test builds and
installs a real tarball into an isolated consumer. Do not rely on a sibling app
checkout, a globally installed package or unpublished files to make a test pass.
Use portable Node.js helpers for filesystem and process work.
The [initial verification receipt](docs/verification.md) records what the bootstrap
checks demonstrate and where their evidence stops.

| Directory | Responsibility |
| --- | --- |
| `src/` | Library code; explicit inputs and deterministic calculations |
| `tests/` | Synthetic examples, boundary cases and regression tests |
| `calculations/` | Method documents, retained source evidence and parameter proposals |
| `scripts/` | Local evidence preparation and verification commands |
| `examples/` | Executable package usage with synthetic token inputs |
| `docs/` | Integration contracts, methodology review and versioning |

## Numerical and evidence changes

Follow the [methodology review guide](docs/methodology.md). Explain the problem,
the affected population and the proposed result with a concrete example. Include
units, rounding, coverage and failure behavior, not just a total.

Preserve old method identities and artifacts needed for replay. Never refresh
expected values merely to make a changed calculation pass. A deliberate numerical
change needs an explained difference and the appropriate method or parameter
revision. Keep API and artifact-format changes explicit as well; see
[versioning](docs/versioning.md).

Source data needs an immutable revision or content digest, retrieval context,
applicable license or terms, and a retained notice when redistribution permits it.
Prefer primary evidence. Record disagreements and missing effective dates instead
of guessing. Retaining a citation does not establish that its claims are verified.

Use synthetic or explicitly redistributable fixtures. Remove personal transcripts,
account identifiers, authentication material and private repository paths before
sharing a reproduction. Do not add production data to an issue or pull request.

## Pull requests

Keep each change focused. Describe the resulting behavior, include a minimal
before/after example when useful, and report checks actually run. Add or adjust
tests for substantive behavior. Documentation changes should keep examples and
relative links runnable.

Maintainer review determines whether a contribution is accepted. Proposal creation,
merging code, publishing a package and selecting a catalog in a consuming product
are separate decisions. An acceptance record is evidence of review, not a grant of
authority to a caller.

Original contributions use the repository's [Apache-2.0 license](LICENSE).
Preserve third-party copyright and license notices; do not relabel external data
as original project material.
