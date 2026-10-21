# Documentation review — October 15, 2026

Reviewed source baseline: `588e9c0097734f4e88efc4e45a46f6a5280ce064`.
Only documentation changes are included. Retained methods, generated proposals,
CHANGELOG and dated JSON receipts remain byte-identical.

## Inventory and findings

The table groups factual claims by their canonical home. Counts below are
finding groups, not sentences or an implied numerical coverage measure.

| Surface | Claims checked against | Disposition |
| --- | --- | --- |
| README, package description | `package.json`, exports, build/pack scripts, examples, registry test | Correct Node/ESM/dependency/package claims; add install/upgrade/removal boundaries and complete replay identity |
| `AGENTS.md`, `CLAUDE.md`, CONTRIBUTING | Scripts, release workflow, repository layout | Correct; release guidance remains centralized |
| SECURITY, CODE_OF_CONDUCT, issue and PR templates | Package version, validation boundaries, issue URLs, repository owner | Correct; private reporting remains conditional on availability |
| `docs/api.md`, `docs/versioning.md` | Five runtime modules and tests | Correct method/schema/counter/coverage contracts; add current consumer status |
| `docs/methodology.md`, `calculations/README.md` | Proposal/acceptance code, both script argument parsers, artifact replay test | Correct evidence commands; qualify historical adoption language without altering hashes |
| Root and retained METHOD files, generated methodology, fixtures README | Parameters, importer, energy matching/arithmetic, fixture tests | Numerical and evidence claims match; historical “no production caller” is superseded by current consumer status |
| `docs/releasing.md`, workflow comments, release config | Workflows, registry verifier, live GitHub settings | Clarify excluded paths, current approval gate, retry window and unverified activation deadline |
| `docs/repository-settings.md`, checked-in settings, CODEOWNERS | Read-only main rules and npm environment API | Desired settings remain distinguished from observed configuration |
| `docs/verification.md`, dated verification records, CHANGELOG | Historical scope; current check and published-package test | Preserve history; point bootstrap receipt to current release instructions |
| Cost-comparison guide and receipts | Preparation/runner/adapter source and seven retained fixtures | Scope and pins match; optional Python setup not rerun |

Eight finding groups addressed: **three stale** (adoption status, release-setting
snapshot, bootstrap release instructions), **one unsupported** (unverified fixed
two-day trust deadline), **four missing** (library lifecycle commands, complete
README replay identity, approval-policy difference, short registry retry window).
No broken existing relative links or duplicate canonical document required removal.
No clearly wrong or insecure implementation was established in this review.

## Verification

From the repository root:

```sh
npm ci --ignore-scripts
npm run check
npm run test:published
node scripts/check-doc-links.mjs
```

`npm run check` passed on Linux with Node 24.21.0: 176 tests in seven files,
typechecking, ten byte-identical retained proposal files, overwrite refusal,
and two isolated installed-package consumers. Each consumer exercised all five
exports, 32 energy cases (96 assertions), tamper rejection, declarations without
ambient Node types and both documented examples. See the
[check output](docs-review-2026-10-15/check.log).

`npm run test:published` passed against immutable public version 0.1.0. Its
SHA-256 remained `ee7c8f3e90a7f586e7e0cdf1e9916793d334522bdb0b0c19f38034dae930356e`;
runtime/declarations/package contract matched, while README and development
scripts intentionally differed. This verifies installation and example behavior,
not provenance signatures or deployed adoption. The existing verifier in
`scripts/test-published.mjs` reproduces the check.

The existing `npm run test:docs` verifies relative paths. The retained
`node scripts/check-doc-links.mjs` also checks fragments: 25 Markdown files,
60 local links, zero failures. The cross-repository
source link was checked against the app checkout at the linked immutable commit.
Native Windows/macOS and the optional Python comparison suite were not rerun.

An initial restricted-shell run failed child-process execution with `EPERM`;
the permitted full run passed. No application or test behavior was changed to
accommodate the execution boundary.

## Live release configuration and decision

Read-only commands used (no settings writes):

```sh
gh api repos/braydenyancy/centrail-calculations/environments/npm
gh api repos/braydenyancy/centrail-calculations/environments/npm/deployment-branch-policies
gh api repos/braydenyancy/centrail-calculations/actions/variables/NPM_PUBLISH_ENABLED
gh api repos/braydenyancy/centrail-calculations/rules/branches/main
gh api repos/braydenyancy/centrail-cli/environments/npm
```

Observed: calculations requires either `braydenyancy` or `alynes`, prevents
self-review, permits `v*` tags and has publishing enabled. CLI has no npm required
reviewer. Main requires one code-owner approval, latest-push review, resolved
conversations, `CI passed`, strict status checks, linear history and CodeQL merge
protection. These observations can change independently of repository files.

Owners must decide whether to remove calculations’ second approval to match the
CLI (**recommended**) or retain it as an intentional extra gate. Until then,
[the release runbook](../releasing.md) describes the existing gate. npm-side
trusted-publisher configuration was not inspected. The current primary
[npm trusted-publishing documentation](https://docs.npmjs.com/trusted-publishers/)
was fetched to check the decisive external link, supported tool versions and
allowed actions; it did not substantiate the previous fixed two-day deadline.
