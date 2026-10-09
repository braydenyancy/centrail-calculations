# API token\-rate estimates

Status: proposed, awaiting review.

Parameter revision: `90e707af812dbc3a46a495b358da6dd21f05149e8cbfcaef159cab0639c9348e`. Catalog as-of: 2026-10-08; this is not a historical effective date.

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

## Assumptions

- Exact provider/model identities and reviewed one\-hop aliases determine rates\.
- Assignment token\-rates\-v1 rounds each event to micro\-USD; live token\-buckets\-v3 retains finer units through aggregation\.
- Legacy Anthropic cache residuals use the retained one\-hour assumption only for valid live inputs\.

## Exclusions

- Provider invoices and subscription charges
- Unknown billing dimensions, service variants and non\-text rates
- Automatic source acceptance or historical repricing

## Candidate coverage

21 exact entries; 0 explicit aliases; 4482 excluded source entries.

| Exclusion reason | Count |
| --- | ---: |
| non\_direct\_identity | 61 |
| unsupported\_dimensions | 102 |
| unsupported\_mode | 47 |
| unsupported\_provider | 4272 |

## Source evidence

- litellm at d174c43518a479fe584703eb7829d4a022f0f955; SHA-256 `be1a889d69b552a42dd6c3ec34adc95789ba0870d3da6ebf9aa3b925ed6d2bc8`; license MIT; notice: SOURCE\-LICENSE\.txt.

## Review changes

- added: openai / chat\-latest
- added: openai / computer\-use\-preview
- added: openai / gpt\-3\.5\-turbo
- added: openai / gpt\-3\.5\-turbo\-16k
- added: openai / gpt\-4
- added: openai / gpt\-4\-1106\-preview
- added: openai / gpt\-4\-turbo
- added: openai / gpt\-5\-chat
- added: openai / gpt\-5\-chat\-latest
- added: openai / gpt\-5\-codex
- added: openai / gpt\-5\.1\-chat\-latest
- added: openai / gpt\-5\.1\-codex
- added: openai / gpt\-5\.1\-codex\-max
- added: openai / gpt\-5\.1\-codex\-mini
- added: openai / gpt\-5\.2\-chat\-latest
- added: openai / gpt\-5\.2\-codex
- added: openai / gpt\-5\.3\-chat\-latest
- added: openai / gpt\-5\.5\-cyber
- added: openai / gpt\-rosalind\-research
- added: openai / o3\-deep\-research
- added: openai / o4\-mini\-deep\-research

0 retained source comparisons. Full values, exclusions and reasons are in the adjacent JSON proposal and artifact.
