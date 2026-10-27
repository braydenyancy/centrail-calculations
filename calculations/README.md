# Retained calculations and evidence commands

This directory keeps method documents, source evidence and immutable parameter
proposals. It contains no active catalog pointer. Method documents and dated
proposals are content-addressed historical evidence, not current integration or deployment
status. For example, the energy document's original “no production caller” statement
describes its extraction date; it is not a claim about later consumer adoption.
Do not rewrite those bytes to update product status. Use [the API guide](../docs/api.md)
for current integration contracts.

Commands prepare proposals or replay a selected artifact; they cannot activate rates in a consuming application.

The runtime implementation is in `src/`. These commands run from the repository
root after `npm ci`. They are developer tools, not installed package executables.
All file acquisition happens separately: no command below fetches a remote catalog.

## Reproduce the retained evidence

```sh
npm run test:artifacts
```

This regenerates the retained pricing and energy proposal files in temporary
directories and compares their bytes. The dated directories remain proposals;
matching their bytes does not establish acceptance or present-day source accuracy.

## Generate a pricing proposal

Run this as one line in your shell, substituting your explicitly retained files:

```sh
npm run calculations -- propose-pricing --source source.json --manifest source-manifest.json --notice SOURCE-LICENSE.txt --method calculations/pricing/METHOD.md --out new-pricing-proposal
```

The output directory must not exist. Optional `--previous artifact.json` adds a
semantic difference and `--comparisons comparisons.json` retains source
discrepancies. Output includes exact source bytes and notice, the normalized
manifest, parameter artifact, proposal and methodology explanation.

The source manifest has this grammar. Replace the hash and revision with the
exact evidence you retained; the values below are placeholders.

```json
{
  "asOf": "2026-10-08",
  "source": {
    "id": "litellm",
    "revision": "<immutable 40-character commit>",
    "sha256": "<64 lowercase hex digits for retained source bytes>",
    "retainedAt": "source.json",
    "license": "MIT",
    "notice": "SOURCE-LICENSE.txt"
  },
  "aliases": []
}
```

The import checks the source digest and preserves unsupported entries with
reasons. Catalog as-of dates and upstream commits are not price-effective dates.
Do not treat excluded entries as free or silently substitute another model.
See [pricing/METHOD.md](pricing/METHOD.md).

## Compile energy parameters

```sh
npm run calculations -- compile-energy --parameters calculations/energy/parameters.v1.yaml --method calculations/energy/METHOD.md --out new-energy-proposal
```

The output directory must not exist. The artifact and manifest retain parameter
and method-document identities. The method preserves historical scenario estimates;
it does not claim measured request energy. See [energy/METHOD.md](energy/METHOD.md)
and the [fixture explanation](energy/fixtures/METHOD.md).

YAML parameter files and Markdown frontmatter use the strict JSON subset of YAML
1.2. Duplicate keys, custom tags, aliases and executable expressions are rejected.
Canonical JSON sorts object keys and ends with one newline. Array order is
preserved unless its schema explicitly defines a sortable collection.

## Replay a pricing artifact

```sh
npm run calculations -- replay-pricing --artifact pricing-artifact.json --method-id token-rates-v1 --events synthetic-events.json
```

Use `token-buckets-v3` to select the other retained pricing method. The events
file is a JSON array using the [normalized input contract](../docs/api.md).
Retain exact output, coverage and method/parameter identities. The command does
not persist results or rewrite history.

## Preserve catalog observations

```sh
npm run observe-catalog -- openrouter source.json manifest.json NOTICE.txt new-observation-directory
```

Use `models-dev` instead of `openrouter` for that source format. Retain the source
bytes and applicable notice separately. This manifest consists of exactly these
six fields, without the pricing proposal's `asOf`/`source`/`aliases` wrapper:

```json
{
  "id": "openrouter",
  "revision": "sha256:<same 64 lowercase hex digest as sha256>",
  "sha256": "<64 lowercase hex digest of exact source bytes>",
  "retainedAt": "source.json",
  "license": "<reviewed source license or terms identifier>",
  "notice": "NOTICE.txt"
}
```

A pinned 40-character commit also works as `revision`; mutable labels do not.
Unknown manifest keys and duplicate source keys/identities are rejected. The
command retains bytes, normalized manifest paths, notice and observations in a
new directory. Every observation remains `review-only`.

Observations preserve full public model records and pricing fields, including
nulls, decimal source text, thresholds and non-token fees. `tokenRateUnit` applies
only to token-rate fields. Request, image and audio fields retain source-specific
units and need review. These observations are not normalized tariffs, independent
billing verification or accepted pricing artifacts.

## Review and acceptance

The `workflow` module keeps evidence proposals separate from acceptance records.
Acceptance binds a review reference, explicit timestamp and exact proposal hash;
unresolved comparisons prevent it. The function does not authenticate reviewers
or update a consumer's chosen catalog. Follow the
[methodology review guide](../docs/methodology.md).

Retained method documents and proposal files are content-addressed evidence.
Create new proposals for changes; do not rewrite historical files in place.
