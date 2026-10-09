# Security policy

## Report a vulnerability

Use GitHub's **Report a vulnerability** action on the repository's
[Security page](https://github.com/braydenyancy/centrail-calculations/security)
when private vulnerability reporting is available. Include affected versions,
impact and a minimal synthetic reproduction. Do not include credentials, personal
transcripts or production data.

If that action is unavailable, open an issue requesting a private reporting
channel **without exploit details or sensitive attachments**. Do not assume a
public issue, pull request or workflow log is confidential.

For numerical disagreements without a security impact, use the calculation-bug
or methodology issue form.

## Supported versions

This project is in pre-release development and has no published npm version yet.
Security fixes target the current development branch; there is no maintained
release support matrix or promised backport schedule at this stage. Before the
first package release, review this policy with the release documentation.

## Trust boundaries

- Content hashes identify bytes. They do not authenticate an author, establish
  a source's accuracy or prove a proposal was accepted by your organization.
- Callers select trusted, reviewed parameter artifacts. Validation is not a
  sandbox for attacker-authored artifacts; energy parameters include model
  regular expressions. Bound input sizes and processing resources at ingestion.
- Library imports do not fetch catalogs or read usage files. Repository scripts
  read and write explicitly selected local paths. Acquisition and approval stay
  outside the calculation functions.
- Authorization, privacy, tenant isolation, usage normalization and persisted
  accounting remain the consuming application's responsibility. Do not trust a
  client-supplied total as authoritative server accounting.

Report a violation of these implemented boundaries as a potential security bug.
