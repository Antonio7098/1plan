# 1PLAN API + MCP: Technical Plan & Architecture

This document details the data models, API design, MCP gateway, validation, observability, and testing strategy.

## 1. Core Data Models

- Project
  - Fields: `id`, `name`, `slug`, `createdAt`

- Document (planning artifact)
  - Fields: `id`, `projectId`, `kind` ("prd"|"tech_overview"|"sprint_overview"|"sprint"|"freeform"), `title`, `slug?`, `content`, `createdAt`, `updatedAt`

- Feature
  - Fields: `id`, `projectId`, `featureId` (e.g., FEAT-001), `title`, `version`, `status`, `area`, `createdAt`, `updatedAt`

- Sprint
  - Fields: `id`, `projectId`, `code` (e.g., SPR-001), `name`, `status`, `startDate?`, `endDate?`, `overviewDocId?`, `createdAt`, `updatedAt`

- SprintItem
  - Fields: `id`, `sprintId`, `checked`, `text`, `createdAt`, `updatedAt`

### Indexes & Constraints (Prisma)
- `Document(projectId, kind, updatedAt)`
- `Feature(projectId, featureId)` unique
- `Sprint(projectId, code)` unique
- `SprintItem(sprintId, createdAt)`

## 2. API Design (Fastify + zod + Prisma)

### Endpoints
- Projects: POST `/v1/projects`, GET `/v1/projects/:id`, GET list
- Documents:
  - POST `/v1/docs` {projectId, kind, title, content}
  - GET `/v1/docs/:id`
  - PATCH `/v1/docs/:id` {title?, content?}
  - GET `/v1/docs` {projectId, kind?, q?, limit?, cursor?}
- Features:
  - POST `/v1/features`
  - GET `/v1/features/:id`
  - PATCH `/v1/features/:id`
  - GET `/v1/features` {projectId, status?, area?, q?, limit?, cursor?}
  - POST `/v1/features:importCsv`, GET `/v1/features:exportCsv`
- Sprints:
  - POST `/v1/sprints`
  - GET `/v1/sprints/:id`
  - PATCH `/v1/sprints/:id`
  - GET `/v1/sprints` {projectId, status?, limit?, cursor?}
  - POST `/v1/sprints/:id/items`, PATCH `/v1/sprints/:id/items/:itemId`

### Common
- Auth: Bearer token; rate limiting; `X-Request-Id` propagation
- Validation: zod schemas at route boundary with consistent 422 error shape
- Pagination: opaque `cursor` + `limit` (max 100)
- Idempotency: `X-Idempotency-Key` for create/update; server caches keys for 24h

### OpenAPI
- Generated via `fastify-oas` or `fastify-swagger` with JSON + Redoc UI
- Contract tests assert OpenAPI and runtime schemas stay in sync

## 3. MCP Gateway (TypeScript)

- Transport: stdio
- Config: `MCP_API_URL`, `MCP_API_TOKEN`
- Tools (subset):
  - `create_project` {name}
  - `create_document`, `get_document`, `update_document`, `list_documents`
  - `create_feature`, `get_feature`, `update_feature`, `list_features`, `import_features_csv`, `export_features_csv`
  - `create_sprint`, `get_sprint`, `update_sprint`, `list_sprints`, `add_sprint_item`, `update_sprint_item`
- Error mapping: 400/401/403/404/409/422/429/5xx → tool errors with messages and remediation hints

## 4. Architecture

```mermaid
flowchart LR
  MCP[MCP Server (stdio)] -->|Bearer| API[Fastify API]
  API --> DB[(Postgres/SQLite)]
  API --> IDX[Search/Index (optional)]
  API -.-> OAS[(OpenAPI Schema)]
  API --> LOGS[Structured Logs]
  API --> METRICS[Metrics]
```

- Local dev: SQLite, single process
- Production: Postgres, API in container; MCP runs where the client is

## 5. Validation & Guardrails
- zod for all inputs/outputs; consistent error shape with `code`, `message`, `fields`
- Payload caps (e.g., 1MB per document content via `fastify-formbody` limits)
- Rate limit per token (e.g., 60 req/min burst 120)
- CORS disabled by default; enable for known origins if needed

## 6. Observability & SLOs
- Logging: pino structured JSON with fields: `ts`, `level`, `requestId`, `route`, `user?`, `projectId?`, `status`, `latencyMs`
- Metrics: histograms `api_request_latency_ms`, counters `api_request_total`, `api_error_total`, gauge `db_pool_in_use`
- Tracing: basic requestId now; OpenTelemetry SDK later
- SLOs:
  - p95 latency for list endpoints < 250ms prod
  - Availability: 99.9% business hours
  - Error rate < 1%

## 7. Security
- Secrets via env (.env, never committed); runtime validation with zod
- Service tokens with minimum scope; rotation documented
- SQL safety via Prisma; no raw SQL unless parameterized and reviewed
- Backups: nightly DB snapshot (prod)

## 8. Testing Strategy
- Unit: schema validators, utilities
- Integration: API routes with SQLite test DB (transactional rollback between tests)
- Contract: OpenAPI generated → Spectral lint; runtime response validators
- E2E: CLI script or MCP client smoke flows
- Load: k6 scripts for list/search; assert p95 and no 5xx

## 9. Tooling & DevX
- Package scripts: dev, build, test, lint, typecheck, migrate, seed
- Pre-commit: eslint, prettier, typecheck
- CI: GitHub Actions matrix Node LTS; cache Prisma; upload coverage

## 10. Deployment
- Docker image for API; health checks `/healthz`
- Postgres (managed) or container with volume
- Env config per environment; feature flags via env or simple config file

## 11. Future Extensions
- Full-text search (FTS5/tsvector) with per-project index
- Role-based access control and audit logs
- Semantic search and embeddings store (optional)
