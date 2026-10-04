# Contributing

This repository is a showcase marketplace: it lists mods that live and are
developed in their own repositories. Code, issues and pull requests for a mod
go there:

- [apolenkov/claude-shell-flow](https://github.com/apolenkov/claude-shell-flow)
- [apolenkov/claude-council](https://github.com/apolenkov/claude-council)

Changes here are limited to `.claude-plugin/marketplace.json` and the README.

```sh
npm ci            # tooling and the git hooks (lefthook)
npm run check     # prettier, and `claude plugin validate --strict .`
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org)
with a scope: `marketplace`, `repo`, `deps`, `ci`.
