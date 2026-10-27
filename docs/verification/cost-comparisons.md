# Offline calculator differentials

The importer tests exercise Centrail code against LiteLLM-shaped data. They do
not execute LiteLLM's calculator. The CLI's ccusage/Tokscale comparisons exercise
collection and token accounting, a different layer. This optional suite adds
actual cost calculator execution against shared invented rates and usage.

`npm run test:cost-comparisons` executes LiteLLM `completion_cost` from pinned
release `1.105.0` and Langfuse `IngestionService.calculateUsageCosts` from commit
`a27d317564faa31c0f069595aa4825d1fda880ec`. The Langfuse method lives inside its
large ingestion service. The adapter verifies the complete source-file hash,
extracts the exact unchanged method and its TTL constants, strips TypeScript
types, and executes it with upstream's pinned Decimal `10.6.0`. It does not copy
or reimplement the calculator formula. This is isolated source-method execution,
not a full Langfuse ingestion test.

Both calculator locations are MIT licensed outside their enterprise directories:
[LiteLLM](https://github.com/BerriAI/litellm/blob/v1.105.0/LICENSE),
[Langfuse](https://github.com/langfuse/langfuse/blob/a27d317564faa31c0f069595aa4825d1fda880ec/LICENSE).
No upstream implementation is vendored or included in the published package.

## Preparation and execution

Prepare everything with one explicit network command, then run the offline suite:

```text
npm run prepare:cost-comparisons
npm run test:cost-comparisons
```

Preparation creates a fresh isolated Python environment, installs every pinned
version in `scripts/comparison-litellm-requirements.txt`, fetches the exact shallow
Langfuse commit and installs `decimal.js@10.6.0` without lifecycle scripts or
inherited npm configuration/credentials. Git, Python 3.13 and Node 24 are the
verified prerequisites; `--python` can select a different Python executable.
No Python shell activation, git clone or manual dependency setup is required.

The default setup is ignored `artifacts/cost-comparisons/environment/`, with
`configuration.json` and a resolved `preparation.json` receipt. Existing setup
directories are never overwritten; reuse them for repeated offline runs or choose
an empty directory with `npm run prepare:cost-comparisons -- --out directory`.
For that alternate location run `npm run test:cost-comparisons -- --config
 directory/configuration.json`. The default report is
`artifacts/cost-comparisons/report.json`; override with `--out receipt.json`.

Python package versions are pinned and checked at execution, but distribution
file hashes are not locked; the preparation receipt records resolved versions.
Langfuse's full source-file hash and Decimal's implementation hash are checked.
Preparation disables checkout newline conversion before fetching Langfuse so its
pinned source bytes survive Windows Git defaults.
Missing competitors, changed source and dependency drift fail rather than skip.
On Windows the setup runner uses the venv's `Scripts/python.exe`, and all npm
subprocesses invoke npm's JS entry through the current Node executable. Native
macOS and Windows execution remain unverified for this optional suite.

The LiteLLM subprocess receives no inherited credentials, selects its local model
map, replaces that map with synthetic test identities and blocks Python socket
connections. Attempted connections must stay at zero, including caught failures.
It runs in an isolated temporary working directory with SDK production mode,
which disables its development `.env` loading. A synthetic parent `.env` credential
checks that discovery never imports that credential. The unknown-model case must
produce the actual mapping error, never a generic network error.
It never calls a provider or tokenizer endpoint. The Langfuse method executes in
a VM context supplied only with its pinned Decimal dependency, with bounded
initialization and no process binding. It
receives already-normalized exclusive usage buckets and supplied prices.

## Cases and intentional differences

Seven retained synthetic fixtures in `tests/fixtures/cost-comparisons.synthetic.json` cover base input/output, cache reads, Anthropic 5m/1h cache
writes, explicit zero rates, sub-microdollar rounding, missing cache rates and an
unknown model. Five comparable cases must match Centrail's exact aggregate method
within `1e-12` USD. The receipt includes all inputs, upstream revisions and outputs.
Keep generated preparation and execution reports outside Git; rerun the suite
for the revision under review.

- Centrail's historical per-event method rounds `0.0000005` to `0.000001`;
  its aggregate method and both external calculators retain `0.0000005`.
- With a missing cache-read rate LiteLLM charges the base input rate. Centrail
  returns the known subtotal with partial coverage; Langfuse returns the known
  subtotal without Centrail's explicit coverage status. The suite asserts this
  difference instead of treating it as agreement.
- An unknown model returns an unpriced Centrail result, a LiteLLM mapping error,
  and no calculated Langfuse total. A numeric zero is not equivalent evidence.

These checks do not compare live provider rates, billing invoices, tokenizer
behavior, Langfuse normalization/model matching/tier selection, unsupported
providers, regional/batch/image/audio pricing, or full ingestion pipelines.
Centrail's own importer rejection tests cover unsupported providers; there is
currently no external differential for that policy. The retained LiteLLM price
snapshot and artifact regeneration remain separate checks and do not activate
the pending pricing proposal. Expand fixtures and pin changes deliberately;
never use a competitor's fallback as proof of accurate billing.
