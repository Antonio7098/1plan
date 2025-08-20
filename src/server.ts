import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";

const PROJECT_NAME = "1plan-mcp-docs";
const VERSION = "0.1.0";

const baseDocsDir = path.resolve(process.env.DOCS_DIR || path.join(process.cwd(), "docs"));

function resolveSafePath(relativePath: string): string {
	const normalizedRel = relativePath.replace(/\\/g, "/");
	const target = path.resolve(baseDocsDir, normalizedRel);
	const baseWithSep = baseDocsDir.endsWith(path.sep) ? baseDocsDir : baseDocsDir + path.sep;
	if (!(target === baseDocsDir || target.startsWith(baseWithSep))) {
		throw new Error("Path escapes base docs directory");
	}
	return target;
}

async function ensureDirForFile(filePath: string): Promise<void> {
	const dir = path.dirname(filePath);
	await fs.mkdir(dir, { recursive: true });
}

async function listFilesRecursively(dir: string, extensions?: string[]): Promise<string[]> {
	const results: string[] = [];
	const entries = await fs.readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			const nested = await listFilesRecursively(full, extensions);
			results.push(...nested);
		} else if (!extensions || extensions.length === 0) {
			results.push(full);
		} else {
			const ext = path.extname(entry.name).toLowerCase();
			if (extensions.includes(ext)) results.push(full);
		}
	}
	return results;
}

const server = new McpServer({ name: PROJECT_NAME, version: VERSION });

server.tool(
	"list_files",
	"List files under the docs directory (optionally filter by extensions)",
	{
		subpath: z.string().optional().describe("Subdirectory under docs to list from"),
		extensions: z.array(z.string()).optional().describe("File extensions to include, e.g. ['.md','.csv']")
	},
	async ({ subpath, extensions }) => {
		const dir = subpath ? resolveSafePath(subpath) : baseDocsDir;
		const exists = await fs
			.stat(dir)
			.then((s) => s.isDirectory())
			.catch(() => false);
		if (!exists) {
			return { content: [{ type: "text", text: `Directory not found: ${dir}` }], isError: true } as any;
		}
		const files = await listFilesRecursively(dir, extensions?.map((e) => e.toLowerCase()));
		const rels = files.map((f) => path.relative(baseDocsDir, f));
		return { content: [{ type: "text", text: rels.join("\n") }] };
	}
);

server.tool(
	"read_file",
	"Read a text file under docs",
	{ path: z.string().describe("Path under docs") },
	async ({ path: relPath }) => {
		const full = resolveSafePath(relPath);
		const text = await fs.readFile(full, "utf8");
		return { content: [{ type: "text", text }] };
	}
);

server.tool(
	"write_file",
	"Create or replace a text file under docs",
	{
		path: z.string().describe("Path under docs"),
		content: z.string().describe("File content"),
		createMissingDirs: z.boolean().optional().default(true)
	},
	async ({ path: relPath, content, createMissingDirs }) => {
		const full = resolveSafePath(relPath);
		if (createMissingDirs) await ensureDirForFile(full);
		await fs.writeFile(full, content, "utf8");
		return { content: [{ type: "text", text: `Wrote ${path.relative(baseDocsDir, full)}` }] };
	}
);

server.tool(
	"delete_file",
	"Delete a file under docs",
	{ path: z.string().describe("Path under docs") },
	async ({ path: relPath }) => {
		const full = resolveSafePath(relPath);
		await fs.rm(full, { force: true });
		return { content: [{ type: "text", text: `Deleted ${path.relative(baseDocsDir, full)}` }] };
	}
);

server.tool(
	"bootstrap_docs",
	"Generate PRD, Technical Overview, Features CSV, Sprint Overview, and SPR-001 for the MCP document server",
	{ overwrite: z.boolean().optional().default(false) },
	async ({ overwrite }) => {
		const files: Array<{ rel: string; content: string }> = [
			{ rel: "planning/prd.md", content: PRD_MD },
			{ rel: "planning/technical-overview.md", content: TECH_OVERVIEW_MD },
			{ rel: "ops/features.csv", content: FEATURES_CSV },
			{ rel: "ops/sprints/overview.md", content: SPRINTS_OVERVIEW_MD },
			{ rel: "ops/sprints/SPR-001.md", content: SPR_001_MD }
		];
		const written: string[] = [];
		for (const f of files) {
			const target = resolveSafePath(f.rel);
			await ensureDirForFile(target);
			const exists = await fs
				.stat(target)
				.then(() => true)
				.catch(() => false);
			if (!exists || overwrite) {
				await fs.writeFile(target, f.content, "utf8");
				written.push(path.relative(baseDocsDir, target));
			}
		}
		return { content: [{ type: "text", text: written.length ? `Wrote:\n${written.join("\n")}` : "No files written (already exist)." }] };
	}
);

const transport = new StdioServerTransport();
server.connect(transport);

const PRD_MD = `# 1PLAN MCP Document Server

📄 Product Requirements Document (PRD)

- Purpose: a local, file-backed MCP server that lets agents list, read, create, and edit project docs (Markdown/CSV) safely via stdio.
- Version: 0.1.0
- Status: Draft

## Table of Contents
- 1. Overview
- 2. Key Features & Scope
- 3. User Stories & Flows
- 4. Example Interactions
- 5. Functional Requirements
- 6. Non-Functional Requirements
- 7. UX/UI Requirements
- 8. Technical Requirements
- 9. Success Metrics (KPIs)
- 10. Timeline & Milestones
- 11. Risks & Assumptions
- 12. Market & positioning
- 13. Test Plan

## 1. Overview

### Problem
Agents need a repeatable way to manage project documents (PRDs, technical plans, sprints) programmatically, with guardrails.

### What users value most
- Safe filesystem access (no path traversal)
- Simple CRUD over Markdown/CSV
- Project scaffolding in one command

### Elevator pitch
A minimal, secure MCP server that turns your folder into an editable knowledge workspace for agents.

### Audience
- Solo builders and teams integrating MCP clients (Cursor, Claude, etc.)

## 2. Key Features & Scope

### MVP Focus Decisions
- Delight moment: one tool bootstraps PRD, Tech Overview, Features, and Sprints.
- 48-hour slice: stdio server + CRUD + bootstrap docs.
- Cost control: local filesystem only.

### Core Features
- List/read/create/update/delete files under \`docs/\`.
- Bootstrap canonical docs (PRD, Technical Overview, Features CSV, Sprints).
- Configurable base directory via \`DOCS_DIR\`.

### Optional / Later
- Full-text search, semantic search, tag index, templates.

### Out of Scope
- Networked DB, auth, remote storage.

## 3. User Stories & Flows
- As a user, I can generate project docs with a single command.
- As an agent, I can list and read files to gather context.
- As an agent, I can write or update files idempotently.

## 4. Example Interactions
- list_files → read_file → write_file (edit) → delete_file
- bootstrap_docs → open docs in editor → iterate

## 5. Functional Requirements
- Guardrails: paths must stay under base dir.
- Deterministic write behavior; directory auto-create.
- Bootstrap writes idempotent unless overwrite=true.

## 6. Non-Functional Requirements
- p95 basic ops < 50ms for small files.
- Works offline; no network calls.
- Logs via MCP client.

## 7. UX/UI Requirements
- N/A (headless server). Clear tool names and parameters.

## 8. Technical Requirements
- TypeScript + @modelcontextprotocol/sdk over stdio.
- Node 18+.
- Zod schemas for tool params.

## 9. Success Metrics (KPIs)
- Time-to-setup < 5 min.
- Bootstrap success rate 100% on empty repo.

## 10. Timeline & Milestones
- SPR-001: Server scaffold + CRUD + bootstrap.
- SPR-002: Search + templates (planned).

## 11. Risks & Assumptions
- Risk: accidental path traversal → mitigated by safe resolver.
- Assumption: editor/client speaks MCP stdio.

## 12. Market & positioning
- Focus on dev workflows; complements IDE assistants.

## 13. Test Plan
- Unit: safe path, CRUD ops.
- E2E: bootstrap -> list -> read contents.
`;

const TECH_OVERVIEW_MD = `# 1PLAN MCP Server: Technical Overview

## 1. Core Data Model
- Document (implicit, file-backed)
  - Fields: \`path\` (relative to base), \`content\` (UTF-8)

## 2. Tooling (MCP)
- list_files(subpath?, extensions?) → string list
- read_file(path) → text
- write_file(path, content, createMissingDirs=true) → ack
- delete_file(path) → ack
- bootstrap_docs(overwrite=false) → writes canonical docs

## 3. Architecture
- MCP server (stdio) written in TypeScript
- Filesystem storage under \`docs/\`
- Path guard ensures operations stay inside base directory

## 4. Validation & Guardrails
- Zod schemas for tool args
- Safe path resolver blocks path traversal

## 5. Observability
- Return informative text results; clients can log

## 6. Performance Targets
- p95 list/read/write small files < 50ms locally

## 7. Configuration
- \`DOCS_DIR\` env var to point base directory (default: \`./docs\`)

## 8. Future Extensions
- Index for search (full-text, embedding-based)
- Templates directory and generator
`;

const FEATURES_CSV = `feature_id,feature,version,status,area
FEAT-001,MCP Stdio Server Scaffold,0.1.0,planned,backend
FEAT-002,Docs BaseDir Configuration,0.1.0,planned,backend
FEAT-003,Safe Path Resolver,0.1.0,planned,backend
FEAT-004,List Files Tool,0.1.0,planned,api
FEAT-005,Read File Tool,0.1.0,planned,api
FEAT-006,Write File Tool,0.1.0,planned,api
FEAT-007,Delete File Tool,0.1.0,planned,api
FEAT-008,Bootstrap Docs Tool,0.1.0,planned,api
FEAT-009,Docs Scaffolding (PRD/Tech/Features/Sprints),0.1.0,planned,product
FEAT-010,Unit Tests (path & CRUD),0.1.0,planned,qa
`;

const SPRINTS_OVERVIEW_MD = `# Sprint Overview

High-level view of planned sprints for the MCP server MVP.

## Cadence & Conventions
- Cadence: 1-2 days
- Status values: planned | active | done | canceled
- Definition of Done: demoable, type-check green, no P0 bugs, docs updated
- Links: [PRD](../../planning/prd.md) · [Technical Overview](../../planning/technical-overview.md) · [Features CSV](../features.csv)

## Sprint Checklist
- [ ] [SPR-001 — MCP Core & Docs](./SPR-001.md) (server + CRUD + bootstrap). Features: FEAT-001|FEAT-003|FEAT-004|FEAT-005|FEAT-006|FEAT-007|FEAT-008|FEAT-009

## Portfolio View (All Planned Sprints)
| sprint_id | name | start_date | end_date | objective | themes | features (IDs) | owners | status |
|---|---|---|---|---|---|---|---|---|
| [SPR-001](./SPR-001.md) | MCP Core & Docs | <YYYY-MM-DD> | <YYYY-MM-DD> | Ship stdio server + CRUD + bootstrap | backend, api | FEAT-001|FEAT-003|FEAT-004|FEAT-005|FEAT-006|FEAT-007|FEAT-008|FEAT-009 | <owner(s)> | active |

## Milestones (Cross-Sprint)
- <YYYY-MM-DD> MCP server ready for local use

## KPI & SLO Focus
- Time-to-bootstrap < 1 min
- CRUD p95 < 50ms
`;

const SPR_001_MD = `# Sprint SPR-001 — MCP Core & Docs

Ship a local TypeScript MCP server over stdio with file-backed CRUD and a bootstrap tool to generate project docs.

## Meta
- Sprint ID: SPR-001
- Status: active
- Start date: <YYYY-MM-DD>
- End date: <YYYY-MM-DD>
- Links: [Overview](./overview.md) · [PRD](../../planning/prd.md) · [Technical Overview](../../planning/technical-overview.md) · [Features CSV](../features.csv)

## Objectives (Tick when achieved)
- [ ] Deliver stdio MCP server (TypeScript)
- [ ] CRUD tools: list/read/write/delete
- [ ] Bootstrap tool writes PRD/Tech/Features/Sprints

## Planned Tasks
- [ ] Implement safe path resolver and base dir config
- [ ] Implement tools and validations (Zod)
- [ ] Write embedded doc templates
- [ ] Manual E2E: bootstrap → list → read

## Scope
In scope
- CRUD and bootstrap

Out of scope
- Full-text/semantic search
- Remote stores, auth

## Features in this Sprint
- [ ] FEAT-001 — MCP Stdio Server Scaffold (backend)
- [ ] FEAT-003 — Safe Path Resolver (backend)
- [ ] FEAT-004 — List Files Tool (api)
- [ ] FEAT-005 — Read File Tool (api)
- [ ] FEAT-006 — Write File Tool (api)
- [ ] FEAT-007 — Delete File Tool (api)
- [ ] FEAT-008 — Bootstrap Docs Tool (api)
- [ ] FEAT-009 — Docs Scaffolding (product)

## Acceptance Criteria
- [ ] Server starts and responds over stdio
- [ ] Tools succeed for files under docs
- [ ] Bootstrap writes all 5 docs when absent

## Risks & Mitigations
- Risk: path traversal → Mitigation: strict resolver
- Risk: client mismatch → Mitigation: use stdio protocol

## QA & Testing
- [ ] Type-check clean
- [ ] Manual E2E bootstrap + CRUD
`
