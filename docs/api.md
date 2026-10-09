# API and integration contract

The package exports five ESM subpaths, each with TypeScript declarations. It has no
default catalog and no root barrel export. The runtime does not include the
repository's retained source snapshots or parameter artifacts; select and retain
those explicitly in a consuming application.

## Pricing

```js
import { readFileSync } from "node:fs";
import {
  loadPricingArtifact,
  replayPricing,
} from "@centrail/calculations/pricing";

const artifact = loadPricingArtifact(
  readFileSync("calculations/pricing/proposal-2026-10-08/artifact.json", "utf8"),
);
const result = replayPricing(artifact, "token-buckets-v3", [{
  provider: "openai",
  model: "chat-latest",
  input: 1_000,
  output: 250,
  cacheRead: 0,
  cacheCreation: 0,
  cacheWrite: 0,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  completeness: "complete",
}]);

console.log(result.usdExact, result.coverage, result.issues);
```

This is a synthetic usage example against a **proposed**, incomplete catalog.
Loading an artifact validates its structure and content hash; it does not approve
its rates. Production callers choose a reviewed artifact explicitly.

`input`, `output`, `cacheRead` and `cacheCreation` are disjoint normalized counters.
Do not pass an inclusive provider input total alongside its cached subset. The
cache-write counters describe `cacheCreation`; they are not additional tokens.
Use safe, nonnegative integer counts. Provider-specific parsing, normalization,
duplicate reconciliation and authorization happen before calling this package.

The current identity grammar supports exact `openai` and `anthropic` provider
identities with explicit model strings. It does not prove that a request used
direct API billing. Supported entries represent `direct-api-text-tokens`; route,
subscription, batch, region, modality or service-specific pricing needs evidence
and a supported contract before use. Explicit one-hop aliases are allowed;
unknown models do not inherit an arbitrary nearby price.

| Result field | How to use it |
| --- | --- |
| `usdExact` | Exact decimal USD string for the selected method |
| `units`, `denominator` | Integer numerator and scale; use integer arithmetic when aggregating |
| `usd` | Approximate numeric compatibility value |
| `coverage`, `pricedTokens`, `tokens`, `issues` | Keep incomplete or unavailable evidence visible |
| `assumptions` | Retained assumptions, including eligible legacy cache treatment |
| `methodId`, `methodRevision`, `parameterRevision` | Replay identity; persist with the result |

An unpriced result may have `usdExact: "0"`. That does **not** establish that usage
was free. A supported zero rate is different from absent evidence. Preserve both
coverage and amount in reports.

The [pricing example](../examples/pricing.mjs) executes both retained methods:
`token-rates-v1` rounds each event to micro-USD; `token-buckets-v3` keeps finer
integer units through aggregation. Preserve event boundaries for historical replay.
Changing a method or regrouping events can change the result.

## Energy

`compileEnergyArtifact(parameterText)` validates the strict JSON-subset YAML and
computes its content identity. `replayEnergy(artifact, tokens, model?)` accepts
`input`, `output`, `cacheRead` and `cacheWrite` counts.
`replayEnergyFromTotal(artifact, totalTokens, model?, mix?)` uses the retained
rounded `chat` or `coding` mixture; the default is `chat`.

Both replay functions return `{ low, value, high }` in kWh. Persist the artifact's
`methodId`, `methodRevision` and `parameterRevision` with that result; they are not
repeated in the return value. The [energy example](../examples/energy.mjs) shows
that envelope.

The retained energy method sanitizes negative and nonfinite token values to zero
for compatibility. This differs from pricing's rejection of malformed counts;
validate input at your ingestion boundary. Unknown or omitted models use the
retained default factor; known matching is ordered and case-normalized. Bounds
are scenarios, not confidence intervals. Carbon, water, training and embodied
hardware impacts are outside this method.

## Evidence and review

- `documents`: `parseJsonStrict`, `canonicalJson`, `sha256` and
  `readMethodDocument` provide strict data parsing and reproducible identities.
- `pricing`: `importLiteLLMPricing` converts pinned source evidence within the
  supported scope; `createPricingArtifact`, `resolvePricing` and `diffPricing`
  validate, resolve and compare artifacts.
- `workflow`: `proposePricing` creates a review proposal;
  `renderPricingMethodology` renders its explanation; `recordPricingAcceptance`
  records an exact proposal hash, timestamp and review reference. Unresolved
  comparisons prevent acceptance. This function does not authenticate a reviewer
  or update a consuming application's active catalog.
- `catalog-observations`: `observeCatalog` preserves supported models.dev or
  OpenRouter evidence with `review-only` status. Observations retain source units
  and unsupported dimensions for review; they are not normalized tariffs.

See the [evidence commands](../calculations/README.md) for offline file operations
and the [security boundaries](../SECURITY.md) when designing an ingestion service.
