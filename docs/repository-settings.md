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
gh api --method PUT repos/braydenyancy/centrail-calculations/branches/main/protection --input .github/repository-settings/branch-protection.json
```

The protection requires current checks, one approving code-owner review, review
of the latest push by another person and resolved conversations. It dismisses
stale approvals, prevents force pushes/deletion and applies to administrators too.
Both named maintainers in [CODEOWNERS](../.github/CODEOWNERS) must retain write
access for ownership matching. Squash merges produce the required linear history.

`CI passed` is a stable aggregate: every Node.js 22/24 job on Ubuntu, macOS and
Windows must pass. Both CodeQL jobs are also required. `Dependency review` runs
on pull requests; add it to required contexts after its first successful run
confirms the name and repository support. Do not enable a required check that
cannot run for an incoming pull request.

Verify the actual setting rather than treating an API exit code as the receipt:

```sh
gh api repos/braydenyancy/centrail-calculations/branches/main/protection
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

Set default workflow token permissions to read-only and leave workflow-created
pull-request approvals disabled. Workflow jobs request narrowly scoped permissions
where needed. Require approval before running workflows from first-time external
contributors. GitHub Actions are pinned to reviewed commit hashes; Dependabot
proposes updates rather than silently changing those revisions.

## Publishing

Follow [releasing.md](releasing.md) for the `npm` environment, release-tag
restrictions, npm scope/package ownership and trusted publisher configuration.
Leave `NPM_PUBLISH_ENABLED` unset until those prerequisites are satisfied. Public
repository setup alone does not publish or reserve the npm package name.

Repository settings should be rechecked after ownership transfers or permission
changes. GitHub [documents personal-account access](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository)
and [branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
