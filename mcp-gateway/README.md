# 1Plan MCP Gateway

A Model Context Protocol (MCP) server that provides AI agents with tools to interact with the 1Plan API for managing projects, documents, features, and sprints.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- 1Plan API server running (see `../api/`)

### Installation
```bash
npm install
```

### Configuration
Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` to configure your API connection:
```bash
# API Configuration
API_BASE_URL=http://localhost:4000/api/v1
API_TOKEN=                    # Optional API token
API_TIMEOUT=30000

# MCP Configuration  
MCP_SERVER_NAME=1plan-gateway
MCP_SERVER_VERSION=1.0.0
LOG_LEVEL=info
```

### Running the Server
```bash
# Development mode with hot reload
npm run dev

# Build and run production
npm run build
npm start
```

## 🛠️ Available Tools

### Project Management
- `create_project` - Create a new project
- `get_project` - Retrieve a project by ID
- `list_projects` - List all projects
- `update_project` - Update project details
- `delete_project` - Delete a project (cascades to documents)

### Document Management  
- `create_document` - Create a new document in a project
- `get_document` - Retrieve a document by ID
- `list_documents` - List documents with filtering and pagination
- `update_document` - Update document content or metadata
- `delete_document` - Delete a document

### Document Types
- `PRD` - Product Requirements Document
- `TECH_OVERVIEW` - Technical Overview
- `SPRINT_OVERVIEW` - Sprint Overview
- `SPRINT` - Sprint Document
- `FREEFORM` - General-purpose document

## 📚 Available Resources

### Read-Only Resources
- `1plan://projects` - Live list of all projects
- `1plan://document-types` - Available document types and descriptions
- `1plan://recent-documents` - Recently updated documents
- `1plan://api-health` - API health status

## 🧪 Testing

### Run E2E Tests
```bash
# Comprehensive end-to-end test
node e2e-test.js

# Simple startup test
node simple-test.js
```

### Example Usage
```bash
# Start the MCP server (stdio mode)
npm run dev

# In another terminal, send MCP requests:
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npm run dev

# Create a project
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"create_project","arguments":{"name":"My Project"}}}' | npm run dev
```

## 🔧 Development

### Project Structure
```
src/
├── lib/
│   ├── api-client.ts    # HTTP client for 1Plan API
│   ├── config.ts        # Environment configuration
│   └── logger.ts        # Structured logging
├── tools/
│   ├── documents.ts     # Document management tools
│   └── projects.ts      # Project management tools
├── resources/
│   └── index.ts         # Read-only MCP resources
├── types/
│   └── mcp-types.ts     # Type definitions and schemas
└── server.ts            # Main MCP server
```

### Key Features
- ✅ **Zod Validation** - All tool arguments validated with Zod schemas
- ✅ **Request Tracing** - Request ID propagation from MCP → API
- ✅ **Idempotency** - Write operations support idempotency keys
- ✅ **Error Mapping** - HTTP errors mapped to proper MCP error codes
- ✅ **Input Sanitization** - Comprehensive input validation and sanitization
- ✅ **Structured Logging** - Request/response logging with correlation IDs
- ✅ **Timeout Handling** - Configurable timeouts for API calls
- ✅ **TypeScript** - Full type safety with strict TypeScript

### Building
```bash
npm run build
```

### Linting & Formatting
```bash
# Add when implemented
npm run lint
npm run format
```

## 🔌 Integration

### Claude Desktop Configuration
Add to your Claude Desktop MCP settings:
```json
{
  "mcpServers": {
    "1plan": {
      "command": "node",
      "args": ["/path/to/1plan/mcp-gateway/dist/server.js"],
      "env": {
        "API_BASE_URL": "http://localhost:4000/api/v1"
      }
    }
  }
}
```

### API Requirements
The MCP Gateway requires a running 1Plan API server. See `../api/README.md` for API setup instructions.

## 📊 Monitoring

### Health Checks
- MCP server startup logs indicate successful connection
- API health status available via `1plan://api-health` resource
- Request/response logging with correlation IDs

### Error Handling
- HTTP errors (400, 404, 409, 500) mapped to MCP error codes
- Network timeouts handled gracefully
- Input validation errors provide detailed feedback

## 🚧 Roadmap

### Planned Features (SPR-003+)
- [ ] Cursor pagination implementation
- [ ] Circuit breaker pattern for API calls
- [ ] Resource quota enforcement per client
- [ ] Tool permission matrix
- [ ] Retry & backoff policies
- [ ] Features and Sprints management tools

---

Built with ❤️ for the 1Plan project management system.
