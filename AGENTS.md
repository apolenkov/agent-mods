# Agent guidance

This repository is a Claude Code mod marketplace, not the implementation of its
listed plugins. Read [README.md](README.md), [CONTRIBUTING.md](CONTRIBUTING.md) and
[SECURITY.md](SECURITY.md).

- Edit marketplace metadata in `.claude-plugin/marketplace.json` and keep the
  README catalogue consistent. Each plugin is developed and released in its own
  repository; do not copy plugin code or add runtime layers here.
- Use `npm ci` and `npm run check` for formatting and marketplace validation.
  Runtime requirements are in `.nvmrc` and `package.json`; CI is in
  `.github/workflows/ci.yml`.
- Use the existing hooks and allowed Conventional Commit scopes from
  CONTRIBUTING, for example `docs(repo): ...`. Marketplace validation does not
  demonstrate that a listed plugin loaded or ran in a user's session.
