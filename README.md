# 1Plan: Agent-Accessible Project Knowledge API + MCP

**Turn your project folder into an agent-accessible knowledge workspace.**

A database-backed API with an MCP (Model Context Protocol) gateway that lets AI agents reliably create, read, update, and organize project documentation—PRDs, technical plans, features, and sprints—with proper validation, search, and observability.

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/Antonio7098/1plan.git
cd 1plan
npm install

# Start development
npm run dev

# Configure your MCP client (Claude Desktop, Cursor, etc.)
# Point to: node dist/server.js
# Set env: MCP_API_URL=http://localhost:4000 MCP_API_TOKEN=dev-token
```

## 🎯 What Problem Does This Solve?

- **Ad-hoc file edits** lack consistency, history, and validation
- **Agents need reliable CRUD** with clear contracts and relationships
- **Projects need structured knowledge** that scales from solo to team

**Solution**: A proper database + API + MCP gateway that provides agents with safe, typed access to your project's knowledge.

## 🏗️ Architecture

```
Agent (Claude, Cursor) ↔ MCP Server (stdio) ↔ API (Fastify) ↔ Database (SQLite/Postgres)
```

- **MCP Server**: Stateless gateway over stdio
- **API**: Fastify + Prisma with OpenAPI docs
- **Database**: SQLite (dev) → Postgres (prod)
- **Observability**: Structured logs, metrics, rate limiting

## 📋 Core Features

### Document Management
- **CRUD for documents**: PRDs, tech overviews, sprint pages, freeform
- **Validation**: Zod schemas, typed errors, idempotency
- **Search**: Full-text search (SQLite FTS5 / Postgres tsvector)

### Project Organization  
- **Features**: CSV import/export, status tracking
- **Sprints**: Checklists, timeline management
- **Projects**: Multi-project scoping

### Agent Integration
- **MCP Tools**: `create_document`, `list_documents`, `update_sprint`, etc.
- **Safe Access**: Token auth, rate limiting, input validation
- **Real-time**: Cursor pagination, streaming responses

## 📖 Documentation

- **[PRD](docs/planning/prd.md)**: Product requirements and vision
- **[Technical Overview](docs/planning/technical-overview.md)**: Architecture and data models  
- **[Sprint Plan](docs/ops/sprints/overview.md)**: 7-sprint roadmap to v1.0
- **[Features](docs/ops/features.csv)**: Complete feature catalog

## 🔧 Development

### Prerequisites
- Node.js 18+
- TypeScript
- Docker (optional)

### Local Development
```bash
# Install dependencies
npm install

# Start API in development mode
npm run dev

# Build for production
npm run build

# Run MCP server
DOCS_DIR=./docs node dist/server.js
```

### Project Structure
```
1plan/
├── docs/                    # Planning documentation
│   ├── planning/           # PRD, technical overview
│   └── ops/               # Features, sprints, monitoring
├── src/                    # TypeScript source
│   └── server.ts          # MCP server implementation  
├── api/                   # API source (planned)
└── docker-compose.yml     # Local development stack (planned)
```

## 🧪 Testing

```bash
# Type check
npm run build

# Unit tests (planned)
npm test

# Integration tests (planned)  
npm run test:integration

# E2E smoke (planned)
npm run test:e2e
```

## 🚢 Deployment

### Docker
```bash
# Build and run locally
docker-compose up

# Production deployment
docker build -t 1plan-api .
```

### Environment Variables
```bash
# API Configuration
DATABASE_URL=postgresql://...
API_PORT=4000
NODE_ENV=production

# MCP Configuration  
MCP_API_URL=https://api.yourproject.com
MCP_API_TOKEN=your-service-token
DOCS_DIR=/path/to/docs
```

## 🔌 MCP Client Setup

### Claude Desktop
```json
{
  "mcpServers": {
    "1plan": {
      "command": "node",
      "args": ["/path/to/1plan/dist/server.js"],
      "env": {
        "MCP_API_URL": "http://localhost:4000",
        "MCP_API_TOKEN": "dev-token"
      }
    }
  }
}
```

### Available MCP Tools
- `create_document` - Create PRDs, tech docs, etc.
- `list_documents` - Browse by project/type
- `update_document` - Edit content
- `create_feature` - Add to feature catalog
- `create_sprint` - Plan sprints with checklists
- `search_documents` - Full-text search

## 📈 Roadmap

**Current Status**: Planning & Architecture ✅

### Sprint Plan (7 sprints to v1.0)
1. **[SPR-001](docs/ops/sprints/SPR-001.md)**: Foundation & API (Fastify, Prisma, docs CRUD)
2. **[SPR-002](docs/ops/sprints/SPR-002.md)**: MCP Gateway (stdio server, tools)
3. **[SPR-003](docs/ops/sprints/SPR-003.md)**: Features & Sprints (endpoints, CSV)
4. **[SPR-004](docs/ops/sprints/SPR-004.md)**: Observability & Guardrails
5. **[SPR-005](docs/ops/sprints/SPR-005.md)**: Search & Performance
6. **[SPR-006](docs/ops/sprints/SPR-006.md)**: Testing & Release
7. **[SPR-007](docs/ops/sprints/SPR-007.md)**: Auth & Scoping

## 🤝 Contributing

1. **Check the [Sprint Overview](docs/ops/sprints/overview.md)** to see current priorities
2. **Pick a feature** from [features.csv](docs/ops/features.csv)  
3. **Follow the patterns** established in the planning docs
4. **Submit a PR** with tests and documentation

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Inspired by structured planning methodologies
- Designed for the agent-first development workflow

---

**Ready to give your agents structured access to your project knowledge?** 

⭐ Star this repo if you find it useful!  
🐛 [Report issues](https://github.com/Antonio7098/1plan/issues)  
💡 [Request features](https://github.com/Antonio7098/1plan/discussions)
