package main

import (
	"encoding/json"
	"testing"

	plugin "github.com/Paca-AI/plugin-sdk-go"
	"github.com/Paca-AI/plugin-sdk-go/plugintest"
)

// ── Helpers ───────────────────────────────────────────────────────────────────

const (
	testProjectID = "project-1"
	testTaskID    = "task-1"
)

func setupPlugin(t *testing.T) *plugintest.Context {
	t.Helper()
	tc := plugintest.NewContext(t)

	// Seed the tasks table (public schema, accessed via search_path).
	tc.DB.SeedRows("tasks", []string{"id", "project_id", "deleted_at"}, [][]any{
		{testTaskID, testProjectID, nil},
	})
	// Seed empty plugin table so INSERT/SELECT/DELETE can operate on it.
	tc.DB.SeedRows("bdd_scenarios",
		[]string{"id", "task_id", "title", "given_text", "when_text", "then_text", "created_at", "updated_at"},
		nil)

	var p bddPlugin
	if err := p.Init(tc.PluginContext()); err != nil {
		t.Fatal("Init failed:", err)
	}
	return tc
}

func callerReq() plugintest.Request {
	return plugintest.Request{
		Caller: plugin.CallerIdentity{
			ProjectID:  testProjectID,
			CallerID:   "member-1",
			CallerRole: "PROJECT_MEMBER",
		},
		PathParams: map[string]string{},
	}
}

func withPathParams(req plugintest.Request, params map[string]string) plugintest.Request {
	m := make(map[string]string, len(req.PathParams)+len(params))
	for k, v := range req.PathParams {
		m[k] = v
	}
	for k, v := range params {
		m[k] = v
	}
	req.PathParams = m
	return req
}

// ── BDD Scenario CRUD tests ───────────────────────────────────────────────────

func TestListScenarios_Empty(t *testing.T) {
	tc := setupPlugin(t)
	res := tc.Call("GET", "/tasks/:taskId/bdd-scenarios",
		withPathParams(callerReq(), map[string]string{"taskId": testTaskID}))

	if res.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", res.StatusCode, res.BodyString())
	}
	var env struct {
		Success bool          `json:"success"`
		Data    []bddScenario `json:"data"`
	}
	if err := json.Unmarshal(res.Body, &env); err != nil {
		t.Fatal(err)
	}
	if !env.Success || len(env.Data) != 0 {
		t.Fatalf("expected empty list, got %+v", env.Data)
	}
}

func TestCreateAndListScenario(t *testing.T) {
	tc := setupPlugin(t)

	// Create
	res := tc.Call("POST", "/tasks/:taskId/bdd-scenarios",
		withPathParams(callerReq(), map[string]string{"taskId": testTaskID}).
			WithJSONBody(map[string]string{
				"title": "Login scenario",
				"given": "a user with valid credentials",
				"when":  "the user submits the login form",
				"then":  "the user is redirected to the dashboard",
			}))

	if res.StatusCode != 201 {
		t.Fatalf("expected 201, got %d: %s", res.StatusCode, res.BodyString())
	}
	var createEnv struct {
		Data bddScenario `json:"data"`
	}
	if err := json.Unmarshal(res.Body, &createEnv); err != nil {
		t.Fatal(err)
	}
	if createEnv.Data.Title != "Login scenario" {
		t.Fatalf("unexpected title: %s", createEnv.Data.Title)
	}
	if createEnv.Data.Given != "a user with valid credentials" {
		t.Fatalf("unexpected given: %s", createEnv.Data.Given)
	}

	// List
	listRes := tc.Call("GET", "/tasks/:taskId/bdd-scenarios",
		withPathParams(callerReq(), map[string]string{"taskId": testTaskID}))

	if listRes.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", listRes.StatusCode, listRes.BodyString())
	}
	var listEnv struct {
		Data []bddScenario `json:"data"`
	}
	if err := json.Unmarshal(listRes.Body, &listEnv); err != nil {
		t.Fatal(err)
	}
	if len(listEnv.Data) != 1 || listEnv.Data[0].Title != "Login scenario" {
		t.Fatalf("expected 1 scenario, got %+v", listEnv.Data)
	}
}

func TestCreateScenario_MissingTitle(t *testing.T) {
	tc := setupPlugin(t)

	res := tc.Call("POST", "/tasks/:taskId/bdd-scenarios",
		withPathParams(callerReq(), map[string]string{"taskId": testTaskID}).
			WithJSONBody(map[string]string{"title": ""}))

	if res.StatusCode != 400 {
		t.Fatalf("expected 400, got %d", res.StatusCode)
	}
}

func TestGetScenario(t *testing.T) {
	tc := setupPlugin(t)

	createRes := tc.Call("POST", "/tasks/:taskId/bdd-scenarios",
		withPathParams(callerReq(), map[string]string{"taskId": testTaskID}).
			WithJSONBody(map[string]string{"title": "Fetch scenario"}))
	var createEnv struct {
		Data bddScenario `json:"data"`
	}
	if err := json.Unmarshal(createRes.Body, &createEnv); err != nil {
		t.Fatal(err)
	}

	getRes := tc.Call("GET", "/tasks/:taskId/bdd-scenarios/:scenarioId",
		withPathParams(callerReq(), map[string]string{
			"taskId":     testTaskID,
			"scenarioId": createEnv.Data.ID,
		}))

	if getRes.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", getRes.StatusCode, getRes.BodyString())
	}
	var getEnv struct {
		Data bddScenario `json:"data"`
	}
	if err := json.Unmarshal(getRes.Body, &getEnv); err != nil {
		t.Fatal(err)
	}
	if getEnv.Data.ID != createEnv.Data.ID {
		t.Fatalf("expected same ID, got %s", getEnv.Data.ID)
	}
	if getEnv.Data.Title != "Fetch scenario" {
		t.Fatalf("unexpected title: %s", getEnv.Data.Title)
	}
}

func TestUpdateScenario(t *testing.T) {
	tc := setupPlugin(t)

	createRes := tc.Call("POST", "/tasks/:taskId/bdd-scenarios",
		withPathParams(callerReq(), map[string]string{"taskId": testTaskID}).
			WithJSONBody(map[string]string{
				"title": "Original",
				"given": "initial given",
				"when":  "initial when",
				"then":  "initial then",
			}))
	if createRes.StatusCode != 201 {
		t.Fatalf("expected 201, got %d: %s", createRes.StatusCode, createRes.BodyString())
	}
	var createEnv struct {
		Data bddScenario `json:"data"`
	}
	_ = json.Unmarshal(createRes.Body, &createEnv)

	patchRes := tc.Call("PATCH", "/tasks/:taskId/bdd-scenarios/:scenarioId",
		withPathParams(callerReq(), map[string]string{
			"taskId":     testTaskID,
			"scenarioId": createEnv.Data.ID,
		}).WithJSONBody(map[string]string{"title": "Updated", "given": "updated given"}))

	if patchRes.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", patchRes.StatusCode, patchRes.BodyString())
	}
	var patchEnv struct {
		Data bddScenario `json:"data"`
	}
	_ = json.Unmarshal(patchRes.Body, &patchEnv)

	if patchEnv.Data.ID != createEnv.Data.ID {
		t.Fatalf("expected same ID, got %s", patchEnv.Data.ID)
	}
	if patchEnv.Data.Title != "Updated" {
		t.Fatalf("expected updated title, got %s", patchEnv.Data.Title)
	}
	if patchEnv.Data.Given != "updated given" {
		t.Fatalf("expected updated given, got %s", patchEnv.Data.Given)
	}
	// When and Then should be preserved from original
	if patchEnv.Data.When != "initial when" {
		t.Fatalf("expected preserved when, got %s", patchEnv.Data.When)
	}
	if patchEnv.Data.Then != "initial then" {
		t.Fatalf("expected preserved then, got %s", patchEnv.Data.Then)
	}
	if patchEnv.Data.UpdatedAt == createEnv.Data.UpdatedAt {
		t.Fatal("expected updated timestamp to change")
	}
}

func TestDeleteScenario(t *testing.T) {
	tc := setupPlugin(t)

	createRes := tc.Call("POST", "/tasks/:taskId/bdd-scenarios",
		withPathParams(callerReq(), map[string]string{"taskId": testTaskID}).
			WithJSONBody(map[string]string{"title": "To Delete"}))
	var env struct {
		Data bddScenario `json:"data"`
	}
	_ = json.Unmarshal(createRes.Body, &env)

	delRes := tc.Call("DELETE", "/tasks/:taskId/bdd-scenarios/:scenarioId",
		withPathParams(callerReq(), map[string]string{
			"taskId":     testTaskID,
			"scenarioId": env.Data.ID,
		}))

	if delRes.StatusCode != 204 {
		t.Fatalf("expected 204, got %d: %s", delRes.StatusCode, delRes.BodyString())
	}

	// Confirm gone
	listRes := tc.Call("GET", "/tasks/:taskId/bdd-scenarios",
		withPathParams(callerReq(), map[string]string{"taskId": testTaskID}))
	var listEnv struct {
		Data []bddScenario `json:"data"`
	}
	_ = json.Unmarshal(listRes.Body, &listEnv)
	if len(listEnv.Data) != 0 {
		t.Fatalf("expected empty list after delete, got %+v", listEnv.Data)
	}
}

func TestGetScenario_NotFound(t *testing.T) {
	tc := setupPlugin(t)

	res := tc.Call("GET", "/tasks/:taskId/bdd-scenarios/:scenarioId",
		withPathParams(callerReq(), map[string]string{
			"taskId":     testTaskID,
			"scenarioId": "nonexistent-id",
		}))

	if res.StatusCode != 404 {
		t.Fatalf("expected 404, got %d", res.StatusCode)
	}
}

func TestDeleteScenario_NotFound(t *testing.T) {
	tc := setupPlugin(t)

	res := tc.Call("DELETE", "/tasks/:taskId/bdd-scenarios/:scenarioId",
		withPathParams(callerReq(), map[string]string{
			"taskId":     testTaskID,
			"scenarioId": "nonexistent-id",
		}))

	if res.StatusCode != 404 {
		t.Fatalf("expected 404, got %d", res.StatusCode)
	}
}

// ── 404 guard tests ───────────────────────────────────────────────────────────

func TestListScenarios_UnknownTask(t *testing.T) {
	tc := setupPlugin(t)
	res := tc.Call("GET", "/tasks/:taskId/bdd-scenarios",
		withPathParams(callerReq(), map[string]string{"taskId": "nonexistent"}))

	if res.StatusCode != 404 {
		t.Fatalf("expected 404, got %d", res.StatusCode)
	}
}

func TestCreateScenario_UnknownTask(t *testing.T) {
	tc := setupPlugin(t)
	res := tc.Call("POST", "/tasks/:taskId/bdd-scenarios",
		withPathParams(callerReq(), map[string]string{"taskId": "nonexistent"}).
			WithJSONBody(map[string]string{"title": "Test"}))

	if res.StatusCode != 404 {
		t.Fatalf("expected 404, got %d", res.StatusCode)
	}
}

// ── Multiple scenarios test ───────────────────────────────────────────────────

func TestMultipleScenarios(t *testing.T) {
	tc := setupPlugin(t)

	titles := []string{"Scenario A", "Scenario B", "Scenario C"}
	for _, title := range titles {
		res := tc.Call("POST", "/tasks/:taskId/bdd-scenarios",
			withPathParams(callerReq(), map[string]string{"taskId": testTaskID}).
				WithJSONBody(map[string]string{"title": title}))
		if res.StatusCode != 201 {
			t.Fatalf("expected 201 for %q, got %d: %s", title, res.StatusCode, res.BodyString())
		}
	}

	listRes := tc.Call("GET", "/tasks/:taskId/bdd-scenarios",
		withPathParams(callerReq(), map[string]string{"taskId": testTaskID}))
	if listRes.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", listRes.StatusCode, listRes.BodyString())
	}
	var listEnv struct {
		Data []bddScenario `json:"data"`
	}
	if err := json.Unmarshal(listRes.Body, &listEnv); err != nil {
		t.Fatal(err)
	}
	if len(listEnv.Data) != 3 {
		t.Fatalf("expected 3 scenarios, got %d", len(listEnv.Data))
	}
}
