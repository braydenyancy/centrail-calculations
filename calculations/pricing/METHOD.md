---
{
  "schemaVersion": 1,
  "id": "api-token-rate-estimate",
  "revision": "pricing-replay-v1",
  "title": "API token-rate estimates",
  "kind": "pricing",
  "inputUnit": "tokens",
  "outputUnit": "USD",
  "assumptions": ["Exact provider/model identities and reviewed one-hop aliases determine rates.", "Assignment token-rates-v1 rounds each event to micro-USD; live token-buckets-v3 retains finer units through aggregation.", "Legacy Anthropic cache residuals use the retained one-hour assumption only for valid live inputs."],
  "exclusions": ["Provider invoices and subscription charges", "Unknown billing dimensions, service variants and non-text rates", "Automatic source acceptance or historical repricing"]
}
---

Each nonzero supported token bucket is multiplied by its explicit USD-per-million
rate. Missing rates produce partial coverage, never a free-price claim. A component
marked not applicable cannot price a positive bucket. Exact zero is a supported
rate with a value of zero. Source effective dates remain unknown unless separately
evidenced; the catalog date and upstream commit do not establish them.

Choose the retained calculation method explicitly when replaying. Its parameter
hash refers to the immutable local artifact. Live and frozen rounding remain
distinct, and issued artifacts are not regenerated. Exact integer units and a
decimal USD string are retained; the numeric USD field is for compatibility.

Acquisition, normalization, validation, proposal and acceptance are separate steps.
The importer rejects ambiguous JSON keys and records unsupported entries with
reasons. A scheduled caller may generate this proposal; it cannot accept it.
