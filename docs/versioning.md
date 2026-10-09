# Versioning and historical replay

Four identities answer different questions. Do not substitute one for another.

| Identity | What it identifies | When it changes |
| --- | --- | --- |
| npm package version | Runtime API, declarations and distributed implementation | A package release |
| `schemaVersion` | Grammar and meaning of a serialized document | An incompatible document-format change |
| Method ID and revision | Formula, operation order, rounding and interpretation | A numerical or semantic method change |
| `parameterRevision` | SHA-256 identity of canonical parameter content | Any parameter content change |

Source revisions and source-byte hashes identify evidence. A proposal also binds
its method-document hash; an acceptance record binds the exact proposal hash.
Those additional identities help explain where an artifact came from and what
was reviewed. Hashes do not establish author identity or source accuracy.

## Package compatibility

The initial package version is `0.1.0`, with no published release yet. During
`0.x`, minor versions may introduce API changes; document them in the changelog
and pin exact package versions in consumers that require controlled adoption.
Patch versions should remain API-compatible. Before `1.0`, review and document
the supported public API and compatibility policy.

Package API compatibility does not permit silently changing historical method
results. A new formula needs a new method revision and explained regression
evidence even when the TypeScript signature is unchanged. Publishing a package
does not select a catalog or activate a method in a consumer.

## Retained identities

Pricing exposes `token-rates-v1` and `token-buckets-v3`, both with implementation
revision `1`. The former rounds each event to six decimal USD places; the latter
aggregates integer units at 10⁻¹² USD. Their different answers at tiny amounts
are part of the contract, not a rounding bug to normalize away.

Energy retains `methodId: "token-energy"` and
`methodRevision: "token-energy-v2"`. The `v2` in `legacy.v2.json` refers to the
historical footprint method, not a JSON schema or package version. Energy's
parameter-file name `parameters.v1.yaml` does not replace its content hash.

## What a consumer must retain

Retain the exact normalized inputs, event boundaries relevant to rounding, method
identity, parameter artifact and hash, and the result with coverage/assumptions.
Record the package version used as implementation provenance. Energy results also
need an explicit kWh unit and scenario-bound meaning.

Selecting a new parameter artifact may change current estimates. It must not
rewrite issued historical results under the same identity. Replay historical
results with their original method and parameters; expose a comparison separately
when applying a newer estimate is useful.

An unsupported schema or method should fail explicitly. Do not guess from a file
name, select a nearby model or substitute today's artifact for missing history.
