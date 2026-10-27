# Package releases

**Merge product code → review the generated release PR → merge → immutable
`vX.Y.Z` tag → verified CI artifacts → npm environment approval → npm.**

Release Please updates version, lockfile and changelog from conventional runtime
`feat:`/`fix:` commits. Its [configuration](../release-please-config.json) declares
release paths and exclusions; ordinary documentation/test commits do not request
a new version.
GitHub's built-in token suppresses downstream PR/tag events; preparation explicitly
starts CI and CodeQL at the release branch and publication at the tag. A branch cannot publish.

## Owner setup

- GitHub Settings → Actions → General: allow Actions to create PRs. GitHub's
  combined checkbox also mentions approval; the workflow does not approve PRs.
  Keep human review and `CI passed` required on `main`.
- Settings → Environments → `npm`: required reviewer, **Prevent self-review**,
  selected deployment **Tag** rule `v*`. Remove the old `v*` **Branch** rule.
- Protect published tags against updates/deletion while permitting intended
  creation by the release workflow; do not grant a blanket bypass.
- npm package Settings → Trusted publishing: GitHub owner `braydenyancy`, repo
  `centrail-calculations`, workflow `publish.yml`, environment `npm`.
  Explicitly permit direct `npm publish`; stage-only permission is insufficient.
- Check npm's current activation requirements when configuring trust. Verify the
  first publication before retiring old automation tokens.
  Set `NPM_PUBLISH_ENABLED=true` only when these prerequisites are ready.

Owner settings are external configuration; a merged workflow does not apply them.
Verify live settings before publishing; historical setup receipts are not proof
that those settings still apply.
[Repository settings](repository-settings.md) covers main/CodeQL protection.

## Each release

1. Review the version/changelog and green checks for the [CI runtime matrix](../.github/workflows/ci.yml).
   `npm run check` verifies types, tests, build, retained artifacts and packed consumers.
2. Merge the release PR; preparation creates the immutable tag and starts tag CI.
3. Approve the `npm` environment for that intended tag. Read-only preparation tests
   the package; the OIDC publisher downloads the same tested tarball and checks its
   hash. It installs no dependencies and performs no tests/builds with publishing credentials.
4. Verify registry bytes, channel and provenance receipt. Stable uses `latest`,
   prerelease uses `next`. Runtime/npm pins and the no-token-fallback publication
   steps live in [publish.yml](../.github/workflows/publish.yml).

Update `.node-version`, both CI matrix floors, publication job pins and package/lockfile
`engines` together for future security floors. The publisher and registry verifier
have no checkout, so their Node versions are explicit workflow pins.

Registry visibility can lag a successful publication. The verifier's bounded retry
policy is implemented in [release-registry.mjs](../scripts/release-registry.mjs).
Retry the existing tag workflow after an interruption or delayed registry visibility. Matching immutable versions
are reused; byte mismatches fail, and a stale stable release cannot replace a newer
`latest`. Never republish a version or move a published tag. Provenance metadata
presence is checked; the verification does not independently validate its signature chain.

The published 0.1.0 was verified against 94b9dbf and has no retrospective CI provenance.
Its [publication identity](verification.md#published-010-compatibility) is retained; do not republish it.
Package publication does not activate a pricing catalog, adopt a method in a consumer
or rewrite history. Each consumer upgrades its dependency and policy explicitly.

Platform references: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/),
[GitHub workflow triggering](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow).
