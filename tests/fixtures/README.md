# Synthetic test fixtures

These files contain invented usage examples and fixed calculation outputs. They
are not captures of personal conversations, customer accounts or provider bills.
Original fixtures and consumer examples use the repository's
[Apache-2.0 license](../../LICENSE); retained upstream evidence keeps its own
license and notice.

| File | Origin and purpose |
| --- | --- |
| `litellm.synthetic.json` | Hand-written LiteLLM-shaped records for importer tests: three supported identities, a missing mode and an unsupported region. Names, dates and rates are test values, not provider pricing claims. |
| `energy-legacy-boundaries.json` | Eight synthetic boundary inputs evaluated with historical footprint method v2 at the recorded source revision. Fixed results preserve sanitization, floating-point operation order and ordered model matching. |
| `package-consumer.mjs` | Executable synthetic usage in an isolated installation of the packed library. Verifies exported runtime behavior without a sibling application checkout. |
| `package-consumer.mts` | TypeScript consumer of package declarations, checked independently of repository-only types. |

The pricing tests create a manifest around the synthetic source. Its repeated
commit characters are deliberately synthetic revision identifiers used to exercise
the manifest grammar; they do not point to a real upstream commit. Source-byte
digests are calculated from the actual fixture bytes. Real retained pricing
evidence, its immutable upstream pin and MIT notice live separately in
[`calculations/pricing/`](../../calculations/pricing/).

The energy boundary fixture records its historical implementation path and
revision as provenance labels. No original application source is imported to run
these tests. Each boundary name is decoded with `Number(name)`: this preserves
`NaN` and infinities that JSON cannot encode as numbers. The value is used in all
four token buckets for token replay, and as the total for total-only replay. Both
use the default model factor; total-only replay uses the `chat` mixture.

Those fixed outputs test compatibility, not environmental accuracy. The separate
[32-model fixture](../../calculations/energy/fixtures/METHOD.md) explains the wider
model-matching and mixture cases. Do not regenerate expected values to hide an
unexplained change; introduce a reviewed method or parameter revision and retain
historical expectations.
