# Package releases

**Merge product code → review the generated release PR → merge → immutable
`vX.Y.Z` tag → verified CI artifacts → npm environment approval → npm.**

Release Please updates version, lockfile and changelog from conventional runtime
`feat:`/`fix:` commits. The configured `exclude-paths` omit `docs/`, `tests/` and
`.github/` from release calculation. Ordinary documentation/test commits do not request a new version.
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
- Check npm’s displayed activation requirements when configuring trust and verify
  the first publication before retiring old automation tokens.
  Set `NPM_PUBLISH_ENABLED=true` only when these prerequisites are ready.

Owner settings are external configuration; a merged workflow does not apply them.
Read-only verification on October 15 found `NPM_PUBLISH_ENABLED=true`, a `v*`
**Tag** deployment policy, and required reviewers `braydenyancy` and `alynes` with
self-review prevented. See the [review receipt](verification/docs-review-2026-10-15.md).
[Repository settings](repository-settings.md) covers main/CodeQL protection.

## Approval consistency decision

Calculations still requires npm environment approval; the CLI repository has
removed that reviewer gate and publishes automatically after its release PR.
Keep following the calculations gate until the owners decide otherwise. The
recommended alignment is to retain human review on the release PR and remove the
second npm approval, matching the CLI. Alternatively, retain and explicitly own
the extra gate here. No settings change is implied by this documentation.

## Each release

1. Review the version/changelog and green Linux/macOS/Windows Node 22/24 checks.
   `npm run check` verifies types, tests, build, retained artifacts and packed consumers.
2. Merge the release PR; preparation creates the immutable tag and starts tag CI.
3. Approve the `npm` environment for that intended tag. Read-only preparation tests
   the package; the OIDC publisher downloads the same tested tarball and checks its
   hash. It installs no dependencies and performs no tests/builds with publishing credentials.
4. Verify registry bytes, channel and provenance receipt. Stable uses `latest`,
   prerelease uses `next`. CI uses GitHub-hosted Node 24/npm 11.5.1+ and no token fallback.

The verifier polls a missing published version six times, one second apart; it
does not have the CLI repository’s ten-minute propagation window. A registry
propagation delay can fail verification after a successful publish. Retry the
existing tag workflow after an interruption or delayed registry visibility.
Matching immutable versions are reused; byte mismatches fail, and a stale stable release cannot replace a newer
`latest`. Never republish a version or move a published tag. Provenance metadata
presence is checked; the verification does not independently validate its signature chain.

The published 0.1.0 was verified against 94b9dbf and has no retrospective CI provenance.
Its [publication receipt](verification/npm-0.1.0.md) remains authoritative; do not republish it.
Package publication does not activate a pricing catalog, adopt a method in a consumer
or rewrite history. Each consumer upgrades its dependency and policy explicitly.

Rehearsals: [SDK and release-boundary receipt](verification/2026-10-12-release-automation.json),
[generated PR checks](verification/2026-10-13-release-pr-checks.json).
Platform references: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/),
[GitHub workflow triggering](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow).
