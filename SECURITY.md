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

Report vulnerabilities affecting the latest stable release through the channel
above. Identify the installed version, not just a branch name; consult
[npm](https://www.npmjs.com/package/@centrail/calculations) and
[release history](https://github.com/braydenyancy/centrail-calculations/releases)
for published versions. Security fixes target the current development branch and
are delivered in a new version; published package contents are not replaced. There is no promised backport
schedule for older patch versions or prereleases, including the bootstrap
`0.0.0-stage` version.

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
