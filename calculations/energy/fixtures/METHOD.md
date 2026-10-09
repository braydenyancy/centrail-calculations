# Retained energy compatibility fixtures

`legacy.v2.json` records expected outputs of the historical Centrail footprint
method v2 for synthetic inputs. `v2` names that footprint method, corresponding
to the retained library revision `token-energy-v2`; it is not a fixture schema
version, a second dataset collection or evidence that a deployed method was
superseded. The fixture is retained as a stable numerical compatibility reference.

The top-level `metadata` describes the fixture: `description` states its purpose
and evidence boundary, `methodRevision` identifies the calculation, and
`methodDocument` links this explanation relative to the fixture file. Tests read
`tokens`, `totalTokens` and `models`; descriptive metadata does not alter expected
results.

The 32 model strings exercise ordered matching, aliases, ambiguous names, case
normalization and unknown/empty fallbacks. They are test identifiers, not a
verified catalog of available models. Every model uses the same invented token
breakdown (`tokens`). The independent `totalTokens` input exercises both rounded
`chat` and `coding` mixtures; it is not the sum of that breakdown. `energy`,
`chat` and `coding` contain expected kWh estimates with `low`, `value` and `high`
scenario bounds, not statistical confidence intervals or measured electricity.

The retained parameter capture is documented as 2026-10-08 in
[`../parameters.v1.yaml`](../parameters.v1.yaml), including the historical
coefficient-source path and SHA-256. Its effective date is unknown. That path
identifies provenance; it is not a dependency on another checkout. The fixture
itself did not record a separate capture timestamp or generator command; neither
is inferred here.

[`tests/energy.test.ts`](../../../tests/energy.test.ts) checks exact JavaScript
numerical equality against the retained replay functions. The standalone package
does not import the original application's footprint functions. Preserving their
captured outputs proves compatibility with those cases, not independent
environmental accuracy. Formula assumptions and exclusions remain in the
[energy method](../METHOD.md).

Keep the numerical cases stable: do not regenerate expected outputs merely to
make a changed implementation pass. Review a changed calculation as a separate
method revision. Descriptive metadata changes the fixture file's byte hash but
not its numerical cases. The fixture and this explanatory file are not inputs to
`compile-energy`; they do not determine the retained parameter, method-document,
artifact or proposal-manifest hashes.
