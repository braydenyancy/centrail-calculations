# Releasing the package

The initial `0.1.0` package is published on npm. Its exact contents were verified
against source commit `94b9dbf`; the [publication receipt](verification/npm-0.1.0.md)
records the checks and the absence of a GitHub release tag, Publish workflow run
and npm provenance attestation. Do not republish that version or describe it as
having CI provenance. A later release must use a new reviewed version.

The repository variable `NPM_PUBLISH_ENABLED` was `true` on October 12, 2026.
That flag alone does not establish a working publication path. The `npm`
environment existed with required reviewers, but its `v*` policy was a **branch**
policy rather than a **tag** policy, and self-review was allowed. Correct and
re-verify those settings against the requirements below before the next release.
The npm trusted-publisher configuration was not inspected by this verification.

Release preparation is automated by
[release-please.yml](../.github/workflows/release-please.yml). Runtime `fix:` and
`feat:` changes maintain a reviewed version/changelog PR; docs and tests alone do
not request a package release. Use conventional squash-merge titles. The manifest
starts from the already-published 0.1.0 and its verified runtime commit; no
retroactive tag or republish is created for that version.

The built-in GitHub token also suppresses `pull_request` events for generated
release PRs. Preparation explicitly dispatches the six-platform CI workflow at
the same-repository release branch, validating its main base and branch prefix
before dispatch. A product branch or fork cannot receive that dispatch.

Merge the release PR once its tests and human review pass. The automation creates
the immutable `v*` tag and starts publication at that tag. GitHub's default token
does not trigger another workflow by creating a tag, so the handoff explicitly
dispatches `publish.yml` with the tag ref. A dispatch from `main` cannot publish.
This also permits retrying the existing tag without changing it or creating a
new version. No personal access token or additional release-bot key is required.

The release entry point remains a reviewed `v*` tag, handled by
[publish.yml](../.github/workflows/publish.yml). Do not publish from a developer
machine. The version tag must equal `v` followed by `package.json`'s version, and
the tagged commit must be reachable from the repository's `main` branch.

## Owner setup before a release

These settings require repository or npm ownership; committing a workflow does
not configure them. Review their actual state before enabling publication.

1. Confirm control of the `@centrail` npm scope and `@centrail/calculations`
   package name. Configure a trusted publisher for the exact GitHub owner
   `braydenyancy`, repository `centrail-calculations`, workflow `publish.yml`
   and environment `npm`. Allow the `npm publish` action explicitly; a publisher
   configured only to stage releases does not permit this workflow's publication.
2. The package now exists on npm; first-publication bootstrap is complete.
   Confirm that the configured trusted publisher can publish the next version.
   The repository does not provide a manual-publish or long-lived-token fallback.
3. Create the GitHub `npm` environment. Require an appropriate reviewer, prevent
   self-review and disable administrator bypass where supported. Restrict its
   deployment tags to `v*` and verify the restriction excludes ordinary branches.
4. Protect `main` with pull-request review and the stable `CI passed` check.
   Enable native CodeQL merge protection for high/critical and error-level findings;
   see [repository settings](repository-settings.md). Protect release tags against
   unauthorized creation, updates and deletion.
5. Review package contents, third-party notices, the security support policy and
   npm's current trusted-publishing requirements. Configure publishing shortly
   before the approved release: current npm policy requires a new publisher's
   first successful use within two days. Enable `NPM_PUBLISH_ENABLED=true` only
   after the prerequisites are met.

The workflow uses Node.js 24 and requires npm 11.5.1 or later for trusted
publishing. Its publishing job uses short-lived OIDC credentials; there is no npm
token secret fallback. See npm's
[trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/).

## Prepare and verify

- Review the proposed package version, lockfile and dated changelog. Explain changed APIs, methods,
  artifact formats, parameter coverage and migration needs separately.
- Run `npm run check` and inspect a clean packed package. Retained source snapshots
  belong in the repository; only the allowlisted runtime, declarations and package
  notices belong in the tarball.
- Review and merge the release preparation PR. Ensure the intended commit has passed
  Linux, macOS and Windows checks on Node.js 22 and 24. Push only the approved
  version tag for an exceptional manual release; ordinary release preparation
  creates its tag and dispatches publication automatically.

The tag workflow reruns the full verification matrix. A job with read-only
repository permissions prepares the package and verifies the exact tarball in an
isolated consumer. A separate environment-gated job downloads that same-run
artifact, verifies its SHA-256 against the test receipt and checks its package
name, version and tag before publishing with provenance and lifecycle scripts disabled. It does
not install dependencies or run repository tests with publishing credentials.
Prerelease versions use the `next` npm distribution tag; stable versions use
`latest`.

Publication workflows serialize across all tags. Before publication, the
read-only preparation job checks the exact registry version: a 404 permits
publication, an outage fails the check, and an existing version must match the
tested tarball SHA-256 and registry checksums and contain provenance metadata.
An unpublished stable version must be greater than npm's current `latest`.
Matching existing versions are reused without another publish or dist-tag change.
A separate read-only job verifies the published bytes. This checks provenance
metadata presence; it does not independently verify the attestation signature.

If preparation could not dispatch CI, retry preparation on main or dispatch CI
at the existing release branch. Do not merge without the normal verification checks.

The [executed automation receipt](verification/2026-10-12-release-automation.json)
records actual pinned-SDK dry runs: current history requests no new release; a
synthetic runtime fix proposes aligned package/lockfile/manifest version 0.1.1;
a synthetic test-only fix requests none. Unit tests execute the actual workflow's
tag/manifest guard and registry retry boundaries. These probes create no PRs,
tags or publications and do not establish owner-setting readiness.

## Release receipt

After publication, verify the registry version, tarball integrity, provenance and
exported modules against the workflow artifact. Record the version, source commit,
verification run and any remaining limitations in the release notes. Update
[SECURITY.md](../SECURITY.md) to describe the releases actually maintained.

Do not replace an existing version or move a published release tag to different
code. Correct a release with a new reviewed version and an explanation. Package
publication never accepts a pricing proposal, changes a consumer's active catalog
or rewrites a historical result.
