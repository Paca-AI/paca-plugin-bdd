package main

import (
	"fmt"

	plugin "github.com/Paca-AI/plugin-sdk-go"
	"github.com/google/uuid"
)

// ── Domain types ──────────────────────────────────────────────────────────────

type bddScenario struct {
	ID        string `json:"id"`
	TaskID    string `json:"task_id"`
	Title     string `json:"title"`
	Given     string `json:"given"`
	When      string `json:"when"`
	Then      string `json:"then"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// ── Row scanner helper ────────────────────────────────────────────────────────

type scanner struct {
	idx map[string]int
	row []any
}

func newRowScanner(cols []string, row []any) *scanner {
	idx := make(map[string]int, len(cols))
	for i, c := range cols {
		idx[c] = i
	}
	return &scanner{idx: idx, row: row}
}

func (s *scanner) str(col string) string {
	i, ok := s.idx[col]
	if !ok || i >= len(s.row) || s.row[i] == nil {
		return ""
	}
	if v, ok := s.row[i].(string); ok {
		return v
	}
	return fmt.Sprintf("%v", s.row[i])
}

// ── Scenario route handlers ───────────────────────────────────────────────────

// listScenarios handles GET /tasks/:taskId/bdd-scenarios.
// Returns all BDD scenarios for the task ordered by creation date.
func (p *bddPlugin) listScenarios(req *plugin.Request, res *plugin.Response) {
	taskID := req.PathParam("taskId")
	projectID := req.Caller.ProjectID

	if !p.taskBelongsToProject(taskID, projectID, res) {
		return
	}

	scenarios, err := p.fetchScenariosForTask(taskID)
	if err != nil {
		p.log.Error("listScenarios: " + err.Error())
		res.Error(500, "failed to list bdd scenarios")
		return
	}
	ok(res, scenarios)
}

// createScenario handles POST /tasks/:taskId/bdd-scenarios.
func (p *bddPlugin) createScenario(req *plugin.Request, res *plugin.Response) {
	taskID := req.PathParam("taskId")
	projectID := req.Caller.ProjectID

	if !p.taskBelongsToProject(taskID, projectID, res) {
		return
	}

	type body struct {
		Title string `json:"title"`
		Given string `json:"given"`
		When  string `json:"when"`
		Then  string `json:"then"`
	}
	b, err := plugin.JSONBody[body](req)
	if err != nil || b.Title == "" {
		res.Error(400, "title is required")
		return
	}

	id := uuid.New().String()
	now := nowStr()
	_, err = p.db.Exec(
		`INSERT INTO bdd_scenarios (id, task_id, title, given_text, when_text, then_text, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		id, taskID, b.Title, b.Given, b.When, b.Then, now, now,
	)
	if err != nil {
		p.log.Error("createScenario insert: " + err.Error())
		res.Error(500, "failed to create bdd scenario")
		return
	}
	scenario := bddScenario{
		ID:        id,
		TaskID:    taskID,
		Title:     b.Title,
		Given:     b.Given,
		When:      b.When,
		Then:      b.Then,
		CreatedAt: now,
		UpdatedAt: now,
	}
	plugin.RecordActivity(taskID, projectID, req.Caller.UserID, "task.bdd_scenario.created",
		map[string]any{"title": b.Title, "_description": "added BDD scenario: \"" + b.Title + "\""})
	created(res, scenario)
}

// getScenario handles GET /tasks/:taskId/bdd-scenarios/:scenarioId.
func (p *bddPlugin) getScenario(req *plugin.Request, res *plugin.Response) {
	taskID := req.PathParam("taskId")
	scenarioID := req.PathParam("scenarioId")
	projectID := req.Caller.ProjectID

	if !p.taskBelongsToProject(taskID, projectID, res) {
		return
	}

	result, err := p.db.Query(
		`SELECT id, task_id, title, given_text, when_text, then_text, created_at, updated_at
		 FROM bdd_scenarios
		 WHERE id = $1 AND task_id = $2`,
		scenarioID, taskID,
	)
	if err != nil {
		p.log.Error("getScenario query: " + err.Error())
		res.Error(500, "failed to get bdd scenario")
		return
	}
	if len(result.Rows) == 0 {
		res.Error(404, "bdd scenario not found")
		return
	}
	sc := newRowScanner(result.Columns, result.Rows[0])
	ok(res, rowToScenario(sc))
}

// updateScenario handles PATCH /tasks/:taskId/bdd-scenarios/:scenarioId.
func (p *bddPlugin) updateScenario(req *plugin.Request, res *plugin.Response) {
	taskID := req.PathParam("taskId")
	scenarioID := req.PathParam("scenarioId")
	projectID := req.Caller.ProjectID

	if !p.taskBelongsToProject(taskID, projectID, res) {
		return
	}

	type body struct {
		Title *string `json:"title"`
		Given *string `json:"given"`
		When  *string `json:"when"`
		Then  *string `json:"then"`
	}
	b, err := plugin.JSONBody[body](req)
	if err != nil {
		res.Error(400, "invalid request body")
		return
	}
	if b.Title == nil && b.Given == nil && b.When == nil && b.Then == nil {
		res.Error(400, "no fields to update")
		return
	}
	if b.Title != nil && *b.Title == "" {
		res.Error(400, "title must not be empty")
		return
	}

	// Fetch current state so we can preserve unpatched fields.
	cur, err := p.db.Query(
		`SELECT id, task_id, title, given_text, when_text, then_text, created_at, updated_at
		 FROM bdd_scenarios
		 WHERE id = $1 AND task_id = $2`,
		scenarioID, taskID,
	)
	if err != nil {
		p.log.Error("updateScenario fetch: " + err.Error())
		res.Error(500, "failed to update bdd scenario")
		return
	}
	if len(cur.Rows) == 0 {
		res.Error(404, "bdd scenario not found")
		return
	}
	sc := newRowScanner(cur.Columns, cur.Rows[0])

	updTitle := sc.str("title")
	updGiven := sc.str("given_text")
	updWhen := sc.str("when_text")
	updThen := sc.str("then_text")
	createdAt := sc.str("created_at")

	if b.Title != nil {
		updTitle = *b.Title
	}
	if b.Given != nil {
		updGiven = *b.Given
	}
	if b.When != nil {
		updWhen = *b.When
	}
	if b.Then != nil {
		updThen = *b.Then
	}

	now := nowStr()
	affected, err := p.db.Exec(
		`UPDATE bdd_scenarios
		 SET title = $1, given_text = $2, when_text = $3, then_text = $4, updated_at = $5
		 WHERE id = $6 AND task_id = $7`,
		updTitle, updGiven, updWhen, updThen, now, scenarioID, taskID,
	)
	if err != nil {
		p.log.Error("updateScenario update: " + err.Error())
		res.Error(500, "failed to update bdd scenario")
		return
	}
	if affected == 0 {
		res.Error(404, "bdd scenario not found")
		return
	}
	// Collect which fields changed for the activity record.
	var changedFields []string
	if b.Title != nil && *b.Title != sc.str("title") {
		changedFields = append(changedFields, "title")
	}
	if b.Given != nil && *b.Given != sc.str("given_text") {
		changedFields = append(changedFields, "given")
	}
	if b.When != nil && *b.When != sc.str("when_text") {
		changedFields = append(changedFields, "when")
	}
	if b.Then != nil && *b.Then != sc.str("then_text") {
		changedFields = append(changedFields, "then")
	}
	plugin.RecordActivity(taskID, projectID, req.Caller.UserID, "task.bdd_scenario.updated",
		map[string]any{"title": updTitle, "changes": changedFields, "_description": "updated BDD scenario: \"" + updTitle + "\""})
	ok(res, bddScenario{
		ID:        scenarioID,
		TaskID:    taskID,
		Title:     updTitle,
		Given:     updGiven,
		When:      updWhen,
		Then:      updThen,
		CreatedAt: createdAt,
		UpdatedAt: now,
	})
}

// deleteScenario handles DELETE /tasks/:taskId/bdd-scenarios/:scenarioId.
func (p *bddPlugin) deleteScenario(req *plugin.Request, res *plugin.Response) {
	taskID := req.PathParam("taskId")
	scenarioID := req.PathParam("scenarioId")
	projectID := req.Caller.ProjectID

	if !p.taskBelongsToProject(taskID, projectID, res) {
		return
	}

	// Fetch title before deletion for the activity record.
	titleResult, err := p.db.Query(
		`SELECT title FROM bdd_scenarios WHERE id = $1 AND task_id = $2`,
		scenarioID, taskID,
	)
	if err != nil {
		p.log.Error("deleteScenario title fetch: " + err.Error())
		res.Error(500, "failed to delete bdd scenario")
		return
	}
	if len(titleResult.Rows) == 0 {
		res.Error(404, "bdd scenario not found")
		return
	}
	scenarioTitleSC := newRowScanner(titleResult.Columns, titleResult.Rows[0])
	scenarioTitle := scenarioTitleSC.str("title")

	affected, err := p.db.Exec(
		`DELETE FROM bdd_scenarios WHERE id = $1 AND task_id = $2`,
		scenarioID, taskID,
	)
	if err != nil {
		p.log.Error("deleteScenario: " + err.Error())
		res.Error(500, "failed to delete bdd scenario")
		return
	}
	if affected == 0 {
		res.Error(404, "bdd scenario not found")
		return
	}
	plugin.RecordActivity(taskID, projectID, req.Caller.UserID, "task.bdd_scenario.deleted",
		map[string]any{"title": scenarioTitle, "_description": "removed BDD scenario: \"" + scenarioTitle + "\""})
	res.NoContent()
}

// ── Task deleted event ────────────────────────────────────────────────────────

// handleTaskDeleted handles the task.deleted event.
// The bdd_scenarios table has ON DELETE CASCADE from tasks, but this handler
// ensures any remaining data is cleaned up if the cascade fails.
func (p *bddPlugin) handleTaskDeleted(evt *plugin.Event) {
	type payload struct {
		TaskID string `json:"task_id"`
	}
	ev, err := plugin.JSONPayload[payload](evt)
	if err != nil || ev.TaskID == "" {
		p.log.Warn("task.deleted: invalid payload")
		return
	}
	if _, err := p.db.Exec(
		`DELETE FROM bdd_scenarios WHERE task_id = $1`, ev.TaskID,
	); err != nil {
		p.log.Error("task.deleted cleanup: " + err.Error())
	}
}

// ── Internal helpers ──────────────────────────────────────────────────────────

// taskBelongsToProject validates that the given task exists in the project.
// Sets a 404 error on res and returns false when validation fails.
func (p *bddPlugin) taskBelongsToProject(taskID, projectID string, res *plugin.Response) bool {
	result, err := p.db.Query(
		`SELECT id FROM tasks
		 WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL`,
		taskID, projectID,
	)
	if err != nil {
		p.log.Error("taskBelongsToProject: " + err.Error())
		res.Error(500, "internal error")
		return false
	}
	if len(result.Rows) == 0 {
		res.Error(404, "task not found")
		return false
	}
	return true
}

// fetchScenariosForTask returns all BDD scenarios for a task ordered by creation date.
func (p *bddPlugin) fetchScenariosForTask(taskID string) ([]bddScenario, error) {
	result, err := p.db.Query(
		`SELECT id, task_id, title, given_text, when_text, then_text, created_at, updated_at
		 FROM bdd_scenarios
		 WHERE task_id = $1
		 ORDER BY created_at`,
		taskID,
	)
	if err != nil {
		return nil, err
	}

	scenarios := make([]bddScenario, 0, len(result.Rows))
	for _, row := range result.Rows {
		sc := newRowScanner(result.Columns, row)
		scenarios = append(scenarios, rowToScenario(sc))
	}
	return scenarios, nil
}

// rowToScenario maps a scanned DB row to a bddScenario.
func rowToScenario(sc *scanner) bddScenario {
	return bddScenario{
		ID:        sc.str("id"),
		TaskID:    sc.str("task_id"),
		Title:     sc.str("title"),
		Given:     sc.str("given_text"),
		When:      sc.str("when_text"),
		Then:      sc.str("then_text"),
		CreatedAt: sc.str("created_at"),
		UpdatedAt: sc.str("updated_at"),
	}
}
