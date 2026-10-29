# Verification

Run `npm run check` after the setup in [CONTRIBUTING.md](../CONTRIBUTING.md).
It checks types, unit fixtures, documentation links, byte-for-byte regeneration
of retained artifacts, and packed CLI/server/browser consumers. The
[CI workflow](../.github/workflows/ci.yml) owns the supported runtime/platform matrix.
The package check builds and installs a real tarball into an isolated consumer,
then exercises numerical compatibility and tamper rejection with synthetic fixtures.
Do not substitute a sibling checkout, global package or unpublished files.
Use checks for the exact revision under review; old run reports are not evidence
that a new build passes. Generated reports belong outside Git.

For pricing changes, the optional [calculator differentials](verification/cost-comparisons.md)
compare pinned external implementations against synthetic fixtures. Neither
fixture agreement nor artifact reproducibility establishes scientific accuracy,
complete capture, provider billing accuracy or consumer adoption.

## Published 0.1.0 compatibility

`npm run test:published` is an optional public-registry check of immutable version
`0.1.0`, not the moving `latest` channel. It installs an isolated consumer without
inherited credentials or lifecycle scripts, checks the tarball digest and lockfile
integrity, and exercises installed behavior. It does not compare old package bytes
to evolving development source. Native macOS/Windows execution of this optional
registry check remains unverified.

The pinned SHA-256 is
`ee7c8f3e90a7f586e7e0cdf1e9916793d334522bdb0b0c19f38034dae930356e`,
matching [source commit 94b9dbf](https://github.com/braydenyancy/centrail-calculations/commit/94b9dbf60507c8beab82a583101d3074a3dd2c16).
This was a content comparison, not authenticated build provenance: no GitHub
version tag or build attestation was available at verification. Never republish
that version. New publications follow [the release workflow](releasing.md).
