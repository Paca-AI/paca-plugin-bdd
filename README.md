# paca-plugin-bdd

A first-party [Paca](https://github.com/Paca-AI/paca) plugin that adds **BDD (Behaviour-Driven Development) scenarios** to tasks.

Each task can have multiple BDD scenarios, each with a title and Given / When / Then narrative.

---

## Structure

```
paca-plugin-bdd/
├── plugin.json          # Plugin manifest (ID, routes, extension points, MCP entry)
├── backend/             # Go WASM backend (plugin-sdk-go)
│   ├── main.go          # WASM entry point
│   ├── plugin.go        # Plugin struct + Init/Shutdown
│   ├── scenarios.go     # Route + event handlers
│   ├── plugin_test.go   # Unit tests (plugintest)
│   ├── go.mod / go.sum
│   └── migrations/
│       └── 0001_create_bdd_scenarios.sql
├── frontend/            # React micro-frontend (vite-plugin-federation)
│   ├── src/
│   │   ├── types.ts
│   │   ├── BDDScenariosSection.tsx  # Exposed component
│   │   └── BDDScenarioCard.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── mcp/                 # MCP tools (plugin-sdk-mcp)
    ├── src/
    │   └── index.ts     # Tool definitions + handler
    ├── package.json
    ├── vite.config.ts
    └── tsconfig.json
```

---

## Plugin ID

`com.paca.bdd`

---

## Backend Routes

| Method   | Path                                                        | Description              |
| -------- | ----------------------------------------------------------- | ------------------------ |
| `GET`    | `/tasks/:taskId/bdd-scenarios`                              | List all scenarios       |
| `POST`   | `/tasks/:taskId/bdd-scenarios`                              | Create a scenario        |
| `GET`    | `/tasks/:taskId/bdd-scenarios/:scenarioId`                  | Get a single scenario    |
| `PATCH`  | `/tasks/:taskId/bdd-scenarios/:scenarioId`                  | Update a scenario        |
| `DELETE` | `/tasks/:taskId/bdd-scenarios/:scenarioId`                  | Delete a scenario        |

**Event subscription:** `task.deleted` — cascades deletion of all scenarios for the task.

---

## Frontend Extension Point

| Key               | Value                                  |
| ----------------- | -------------------------------------- |
| Extension Point   | `task.detail.section`                  |
| Component         | `BDDScenariosSection`                  |
| Remote Entry      | `/plugins/com.paca.bdd/assets/remoteEntry.js` |
| Order             | 20                                     |

---

## MCP Tools

| Tool Name              | Description                              |
| ---------------------- | ---------------------------------------- |
| `bdd_list_scenarios`   | List all scenarios for a task            |
| `bdd_get_scenario`     | Get a single scenario by ID              |
| `bdd_create_scenario`  | Create a new scenario                    |
| `bdd_update_scenario`  | Update title, Given, When, or Then       |
| `bdd_delete_scenario`  | Delete a scenario                        |

---

## Development

### Backend

```bash
cd backend

# Run tests
go test ./...

# Build WASM (requires Go 1.24+)
GOOS=wasip1 GOARCH=wasm go build -o ../dist/backend.wasm .
```

### Frontend

```bash
cd frontend
npm install
npm run build      # Produces dist/assets/remoteEntry.js
npm run typecheck
```

### MCP

```bash
cd mcp
npm install
npm run build      # Produces dist/mcp.js
npm run typecheck
```
