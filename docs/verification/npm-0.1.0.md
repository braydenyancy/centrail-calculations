# npm 0.1.0 publication verification

Verified October 12, 2026 against the public registry and an isolated installation.
`@centrail/calculations@0.1.0` was published on October 11 at
18:33:46.984 UTC; `latest` resolves to `0.1.0`. A bootstrap `0.0.0-stage` version
also exists and is not the stable installation target.

## Contents and source

- [Registry metadata](https://registry.npmjs.org/@centrail%2Fcalculations)
- [Published tarball](https://registry.npmjs.org/@centrail/calculations/-/calculations-0.1.0.tgz)
- [Matching source commit](https://github.com/braydenyancy/centrail-calculations/commit/94b9dbf60507c8beab82a583101d3074a3dd2c16)
- [Source CI](https://github.com/braydenyancy/centrail-calculations/actions/runs/38003355448)
- [Source CodeQL](https://github.com/braydenyancy/centrail-calculations/actions/runs/38003355394)

The downloaded tarball's SHA-256 is
`ee7c8f3e90a7f586e7e0cdf1e9916793d334522bdb0b0c19f38034dae930356e`.
It exactly matches the package verification receipt produced for the linear
method-delimiter parser repair at `94b9dbf`. All fourteen packaged files match
that build, including the parser repair and published root metadata. The registry
SHA-1 and SHA-512 integrity fields also match the earlier verified package.

## Installed-consumer checks

An empty temporary consumer installed the exact public version using
`npm install --ignore-scripts --no-audit --no-fund` with an explicit public
registry, empty user/global npm configuration and a separate temporary cache.
Node.js 24.21.0 imported all five public exports. The installation added one
package with no runtime dependencies.

- Thirty-two retained energy cases passed all 96 assertions; tampered artifact
  identity was rejected.
- The known pricing example returned `0.000002` for per-event rounding and
  `0.000001` for aggregate rounding.
- The known energy example returned low/value/high estimates of `0.0000915`,
  `0.000897` and `0.00149799` kWh.
- The installed lockfile's registry integrity matched the verified tarball.

This establishes that the public npm artifact is installable and behaves like
the previously tested build. It does not establish production application adoption.

## Provenance limits

At verification there was no GitHub version tag, GitHub release or Publish
workflow run. Registry metadata did not include `gitHead` or `dist.attestations`,
and the npm attestation endpoint returned 404. Content equality identifies the
matching source build; it is not an authenticated claim about who built or
published it. This receipt does not create a retrospective provenance attestation.

The checked-in release workflow is the required path for subsequent versions.
Its environment and npm trusted publisher must be verified before use; see
[releasing](../releasing.md). Existing versions and published bytes are immutable.
