# Parallel work: people and AI agents

## Principles

1. **One concern per branch** — e.g. `feat/web-messages-ui`, `feat/api-divine-intent`, `docs/api-surface`.
2. **Disjoint paths** — two contributors (or two Cursor agents) should rarely edit the same files. Split by **route** (`app/dashboard/messages/`) or **API domain** (`app/api/divine/`).
3. **Contract first** — if one stream changes UI and another changes APIs, align on [`API_SURFACE.md`](./API_SURFACE.md) and keep request/response shapes backward compatible when possible.

## Suggested workstreams

| Stream | Typical paths | Conflict risk |
|--------|----------------|---------------|
| Web UI | `app/**` (pages), `components/**` | High within the same feature—coordinate or serialize. |
| API / backend | `app/api/**`, `lib/**` | Medium—split by folder (`onlyfans`, `divine`, `stripe`). |
| Mobile shell | `capacitor.config.ts`, `mobile/**`, separate Expo repo (see `docs/MOBILE_APP_REPO.md`), `docs/mobile-app.md` | Low vs Next UI. |
| Docs | `docs/**` | Low unless editing the same file. |

## Cursor / multiple AI agents

- Use **separate chat sessions** or **separate agent tasks** for unrelated work.
- Prefer **one agent per branch**; avoid two agents patching the **same file** in parallel—they will overwrite each other on merge.
- Point agents at **scoped rules**: [`.cursor/rules/`](../.cursor/rules/) (`web`, `api`, `mobile`) so context matches the task.
- For cross-cutting changes (auth, env), **one owner** per PR.

## Git

- Naming: `feat/web-…`, `feat/api-…`, `feat/mobile-…`, `docs/…`.
- Update [`API_SURFACE.md`](./API_SURFACE.md) when you add or rename major API groups.
