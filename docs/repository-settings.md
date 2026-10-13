# Repository administration

Workflows and review guidance live in Git. GitHub permissions, branch protections
and npm publishing configuration are separate settings. The initial setup was
performed with collaborator write access; the owner must apply and verify the
settings below. These files describe desired settings, not proof they are enabled.

## Main branch and reviews

After the first successful CI and CodeQL runs on `main`, the repository owner can
apply the checked-in configuration from a checkout with GitHub CLI:

```sh
gh api --method PATCH repos/braydenyancy/centrail-calculations --input .github/repository-settings/repository.json
gh api --method POST repos/braydenyancy/centrail-calculations/rulesets --input .github/repository-settings/main-ruleset.json
```

The ruleset requires current checks, one approving code-owner review, review
of the latest push by another person and resolved conversations. It dismisses
stale approvals and prevents force pushes/deletion, with no administrator bypass.
Both named maintainers in [CODEOWNERS](../.github/CODEOWNERS) must retain write
access for ownership matching. Squash merges produce the required linear history.

`CI passed` is a stable aggregate: every Node.js 22/24 job on Ubuntu, macOS and
Windows must pass. A separate native code-scanning rule requires CodeQL results
and blocks introduced high/critical security findings and error-level findings.
A green CodeQL workflow only proves analysis completed; it does not prove there
are no findings. This rule covers pull-request-introduced alert locations, not a
blanket guarantee that every historical alert is closed. `Dependency review` runs
on pull requests; add it to required contexts after its first successful run
confirms the name and repository support. Do not enable a required check that
cannot run for an incoming pull request.

Create the ruleset once. To change an existing ruleset, use its ID with
`PUT /repos/braydenyancy/centrail-calculations/rulesets/{ruleset_id}` and the same
desired-state file; do not create duplicate rulesets. Inspect actual state:

```sh
gh api repos/braydenyancy/centrail-calculations/rulesets
gh api repos/braydenyancy/centrail-calculations/rules/branches/main
```

## Security and automation

Enable GitHub private vulnerability reporting so sensitive reports have a private
channel. The owner can enable it and verify the result:

```sh
gh api --method PUT repos/braydenyancy/centrail-calculations/private-vulnerability-reporting
gh api repos/braydenyancy/centrail-calculations/private-vulnerability-reporting
```

In the repository settings, verify dependency graph, Dependabot alerts, secret
scanning and push protection where available. Dependabot version updates are
declared in [.github/dependabot.yml](../.github/dependabot.yml). The advanced CodeQL
workflow is checked in; avoid enabling a duplicate default CodeQL setup.

Set default workflow token permissions to read-only. Enable the GitHub setting
"Allow GitHub Actions to create and approve pull requests" so release preparation
can open its version PR. The workflow creates PRs; it does not approve them. Main
still requires human review. The owner can apply the setting with:

```sh
gh api --method PUT repos/braydenyancy/centrail-calculations/actions/permissions/workflow --input .github/repository-settings/actions-workflow-permissions.json
```

Workflow jobs request narrowly scoped permissions where needed. Require approval
before running workflows from first-time external
contributors. GitHub Actions are pinned to reviewed commit hashes; Dependabot
proposes updates rather than silently changing those revisions.

## Publishing

Follow [releasing.md](releasing.md) for the `npm` environment, release-tag
restrictions, npm scope/package ownership and trusted publisher configuration.
Leave `NPM_PUBLISH_ENABLED` unset until those prerequisites are satisfied. Public
repository setup alone does not publish or reserve the npm package name.

Repository settings should be rechecked after ownership transfers or permission
changes. GitHub [documents personal-account access](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository)
and [code-scanning merge protection](https://docs.github.com/en/code-security/concepts/code-scanning/merge-protection).
