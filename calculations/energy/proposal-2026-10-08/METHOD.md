---
{
  "schemaVersion": 1,
  "id": "token-energy",
  "revision": "token-energy-v2",
  "title": "Retained token-to-energy estimate",
  "kind": "energy",
  "inputUnit": "tokens",
  "outputUnit": "kWh",
  "assumptions": ["Price ratios proxy model compute and cache work; they are not energy measurements.", "Low, central and high are scenario bounds, not statistical confidence intervals.", "Negative and nonfinite token quantities contribute zero for compatibility with the retained method.", "Unknown model names use the retained default range; first matching ordered model rule wins.", "Total-only estimates use rounded illustrative chat or coding blended rates."],
  "exclusions": ["Training and embodied hardware impacts", "Measured per-request electricity", "Carbon, water, and equivalency conversions", "Live financial registry rates"]
}
---

# Retained token-to-energy estimate

This local library preserves the energy component of the existing footprint method
v2. It has no production caller. The retained parameters and every original citation
are in `parameters.v1.yaml`, using the strict JSON subset of YAML. Its source-file
hash identifies the local coefficients captured; the source effective date remains
unknown. Existing citation claims are preserved, not newly verified measurements.

Each token class is multiplied by its kWh-per-million coefficient, the four terms
are summed, multiplied by the first matching model factor, and divided by one
million. Repeat with all low, all central, and all high parameters. Total-only
inputs divide by one million first, then multiply the rounded blended rate and
model factor; preserving operation order preserves floating-point compatibility.

The coding shares total 0.997 and are illustrative. They are retained as explanatory
parameters, not normalized or used to recompute the already rounded blended rates.
The cache-write coefficient is the existing rounded 0.49, not a fresh 1.25-times-input
calculation. Financial price updates cannot alter this retained parameter artifact.
Changing either detail requires a separately reviewed parameter revision.

Replay requires the exact content hash and explicit method revision. Editing
parameters changes their hash; it does not accept a new version or update a pointer.
Carbon, water and equivalencies continue to belong to separate methods. No new
statistical confidence, environmental boundary or measurement accuracy is claimed.
