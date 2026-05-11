// Package main implements the com.paca.bdd backend WASM plugin.
//
// It provides CRUD routes for BDD scenarios (Given/When/Then) scoped to tasks,
// and handles the task.deleted event to cascade-delete orphaned data.
package main

import (
	"time"

	plugin "github.com/Paca-AI/plugin-sdk-go"
)

// nowStr returns the current UTC time as an RFC3339Nano string.
func nowStr() string {
	return time.Now().UTC().Format(time.RFC3339Nano)
}

// bddPlugin implements plugin.Plugin.
type bddPlugin struct {
	db  *plugin.DB
	log *plugin.Logger
}

// Init registers all routes and event handlers on the provided context.
func (p *bddPlugin) Init(ctx *plugin.Context) error {
	p.db = ctx.DB()
	p.log = ctx.Log()

	// Event handlers
	ctx.On("task.deleted", p.handleTaskDeleted)

	// BDD scenario CRUD
	ctx.Route("GET", "/tasks/:taskId/bdd-scenarios", p.listScenarios)
	ctx.Route("POST", "/tasks/:taskId/bdd-scenarios", p.createScenario)
	ctx.Route("GET", "/tasks/:taskId/bdd-scenarios/:scenarioId", p.getScenario)
	ctx.Route("PATCH", "/tasks/:taskId/bdd-scenarios/:scenarioId", p.updateScenario)
	ctx.Route("DELETE", "/tasks/:taskId/bdd-scenarios/:scenarioId", p.deleteScenario)

	return nil
}

// Shutdown is a no-op for this plugin.
func (p *bddPlugin) Shutdown() {}

// envelope wraps successful API responses to match the host's standard format.
type envelope struct {
	Success bool `json:"success"`
	Data    any  `json:"data"`
}

func ok(res *plugin.Response, data any) {
	res.JSON(200, envelope{Success: true, Data: data})
}

func created(res *plugin.Response, data any) {
	res.JSON(201, envelope{Success: true, Data: data})
}
