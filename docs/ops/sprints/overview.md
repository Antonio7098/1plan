# Sprint Overview

High-level view of planned sprints for the API + MCP MVP.

## Cadence & Conventions
- Cadence: 1-2 days
- Timezone: Europe/London
- Status values: planned | active | done | canceled
- Definition of Done: demoable, tests green (unit/integration/E2E smoke), no P0 bugs, docs updated
- Links: [PRD](../../planning/prd.md) · [Technical Overview](../../planning/technical-overview.md) · [Features CSV](../features.csv)

## Sprint Checklist
- [ ] [SPR-001 — Foundation & API](./SPR-001.md) (db) (scaffold, schema, docs CRUD). Features: FEAT-001|FEAT-002|FEAT-003|FEAT-004|FEAT-009|FEAT-021|FEAT-025|FEAT-026|FEAT-028|FEAT-032
- [ ] [SPR-002 — MCP Gateway](./SPR-002.md) (MCP server, tools, resources, pagination). Features: FEAT-016|FEAT-017|FEAT-018|FEAT-031|FEAT-012|FEAT-011
- [ ] [SPR-003 — Features & Sprints](./SPR-003.md) (db) (endpoints + CSV import/export + seed). Features: FEAT-005|FEAT-006|FEAT-019|FEAT-020
- [ ] [SPR-004 — Observability & Guardrails](./SPR-004.md) (logs, metrics, rate limits, errors, security). Features: FEAT-014|FEAT-013|FEAT-015|FEAT-011|FEAT-030|FEAT-034
- [ ] [SPR-005 — Search & Performance](./SPR-005.md) (db) (LIKE search + optional FTS + load). Features: FEAT-007|FEAT-008|FEAT-024
- [ ] [SPR-006 — Testing & Release](./SPR-006.md) (integration/E2E, docker, backups, docs). Features: FEAT-022|FEAT-023|FEAT-027|FEAT-029|FEAT-032
- [ ] [SPR-007 — Auth & Scoping](./SPR-007.md) (service token, project scoping). Features: FEAT-010|FEAT-003
- [ ] [SPR-008 — Launch & Release](./SPR-008.md) (demo assets, CI/CD, GitHub Pages, v1.0). Features: FEAT-032|FEAT-027|FEAT-026|FEAT-009|FEAT-036|FEAT-037|FEAT-038|FEAT-039

## Portfolio View (All Planned Sprints)
| sprint_id | name | start_date | end_date | objective | themes | features (IDs) | owners | status |
|---|---|---|---|---|---|---|---|---|
| [SPR-001](./SPR-001.md) | Foundation & API | <YYYY-MM-DD> | <YYYY-MM-DD> | Ship API scaffold, schema, docs CRUD | backend | FEAT-001|FEAT-002|FEAT-003|FEAT-004|FEAT-009|FEAT-021|FEAT-025|FEAT-026|FEAT-028|FEAT-032 | <owner(s)> | active |
| [SPR-002](./SPR-002.md) | MCP Gateway | <YYYY-MM-DD> | <YYYY-MM-DD> | Stdio MCP with tools/resources | ai, backend | FEAT-016|FEAT-017|FEAT-018|FEAT-031|FEAT-012|FEAT-011 | <owner(s)> | planned |
| [SPR-003](./SPR-003.md) | Features & Sprints | <YYYY-MM-DD> | <YYYY-MM-DD> | Feature + sprint endpoints; CSV | backend | FEAT-005|FEAT-006|FEAT-019|FEAT-020 | <owner(s)> | planned |
| [SPR-004](./SPR-004.md) | Observability & Guardrails | <YYYY-MM-DD> | <YYYY-MM-DD> | Logs, metrics, rate limits, errors | infra | FEAT-014|FEAT-013|FEAT-015|FEAT-011|FEAT-030|FEAT-034 | <owner(s)> | planned |
| [SPR-005](./SPR-005.md) | Search & Performance | <YYYY-MM-DD> | <YYYY-MM-DD> | Search and load/perf tuning | backend, infra | FEAT-007|FEAT-008|FEAT-024 | <owner(s)> | planned |
| [SPR-006](./SPR-006.md) | Testing & Release | <YYYY-MM-DD> | <YYYY-MM-DD> | Tests, packaging, ops | qa, infra | FEAT-022|FEAT-023|FEAT-027|FEAT-029|FEAT-032 | <owner(s)> | planned |
| [SPR-007](./SPR-007.md) | Auth & Scoping | <YYYY-MM-DD> | <YYYY-MM-DD> | Service token + project scopes | backend, infra | FEAT-010|FEAT-003 | <owner(s)> | planned |
| [SPR-008](./SPR-008.md) | Launch & Release | <YYYY-MM-DD> | <YYYY-MM-DD> | Demo assets, CI/CD, GitHub Pages, v1.0 | release, infra | FEAT-032|FEAT-027|FEAT-026|FEAT-009|FEAT-036|FEAT-037|FEAT-038|FEAT-039 | <owner(s)> | planned |

## Milestones (Cross-Sprint)
- <YYYY-MM-DD> API + MCP ready for pilot (SPR-001, SPR-002)
- <YYYY-MM-DD> Features/Sprints usable (SPR-003)
- <YYYY-MM-DD> Observability and guardrails baseline (SPR-004)
- <YYYY-MM-DD> Search + perf targets met (SPR-005)
- <YYYY-MM-DD> Release artifacts and backups in place (SPR-006)
- <YYYY-MM-DD> v1.0 public launch ready (SPR-008)

## Risks & Dependencies
- Dependencies: Prisma migrations precede feature endpoints, MCP depends on API
- Risks: scope creep; mitigate by strict acceptance criteria and feature flags

## KPI & SLO Focus
- p95 API < 150ms dev; < 250ms prod
- MCP tool success rate ≥ 99%
- CI: 100% green on main
