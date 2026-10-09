# Releasing the package

Repository setup is not an npm release. The initial `0.1.0` package is unpublished;
the publish job stays disabled until the repository variable
`NPM_PUBLISH_ENABLED` is explicitly set to `true`.

The release entry point is a reviewed `v*` tag, handled by
[publish.yml](../.github/workflows/publish.yml). Do not publish from a developer
machine. The version tag must equal `v` followed by `package.json`'s version, and
the tagged commit must be reachable from the repository's `main` branch.

## Owner setup before a first release

These settings require repository or npm ownership; committing a workflow does
not configure them. Review their actual state before enabling publication.

1. Confirm control of the `@centrail` npm scope and `@centrail/calculations`
   package name. Configure a trusted publisher for the exact GitHub owner
   `braydenyancy`, repository `centrail-calculations`, workflow `publish.yml`
   and environment `npm`. Allow the `npm publish` action explicitly; a publisher
   configured only to stage releases does not permit this workflow's publication.
2. Resolve first-publication bootstrap before enabling the workflow if the package
   does not yet exist on npm. The current trusted-publisher setup expects a
   registered package. Establish an approved tag/CI bootstrap path; the repository
   does not provide a manual-publish or long-lived-token fallback.
3. Create the GitHub `npm` environment. Require an appropriate reviewer, prevent
   self-review and disable administrator bypass where supported. Restrict its
   deployment tags to `v*` and verify the restriction excludes ordinary branches.
4. Protect `main` with pull-request review and the stable `CI passed` check.
   Configure the actual security check names after their first successful runs;
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

- Update the package version and lockfile, and turn the relevant `Unreleased`
  changelog entries into a dated version section. Explain changed APIs, methods,
  artifact formats, parameter coverage and migration needs separately.
- Run `npm run check` and inspect a clean packed package. Retained source snapshots
  belong in the repository; only the allowlisted runtime, declarations and package
  notices belong in the tarball.
- Review and merge the release preparation. Ensure the intended commit has passed
  Linux, macOS and Windows checks on Node.js 22 and 24. Push only the approved
  version tag.

The tag workflow reruns the full verification matrix. A job with read-only
repository permissions prepares the package and verifies the exact tarball in an
isolated consumer. A separate environment-gated job downloads that same-run
artifact, verifies its SHA-256 against the test receipt and checks its package
name, version and tag before publishing with provenance and lifecycle scripts disabled. It does
not install dependencies or run repository tests with publishing credentials.
Prerelease versions use the `next` npm distribution tag; stable versions use
`latest`.

## Release receipt

After publication, verify the registry version, tarball integrity, provenance and
exported modules against the workflow artifact. Record the version, source commit,
verification run and any remaining limitations in the release notes. Update
[SECURITY.md](../SECURITY.md) to describe the releases actually maintained.

Do not replace an existing version or move a published release tag to different
code. Correct a release with a new reviewed version and an explanation. Package
publication never accepts a pricing proposal, changes a consumer's active catalog
or rewrites a historical result.
