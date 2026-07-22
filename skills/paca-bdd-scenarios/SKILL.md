---
name: paca-bdd-scenarios
description: Write, read, update, and manage Given/When/Then BDD acceptance-criteria scenarios attached to a Paca task, using the com.paca.bdd plugin's tools. Use when asked to write acceptance criteria, define test scenarios, add Given/When/Then behavior, or turn a requirement into BDD scenarios for a task.
triggers:
  - /paca-bdd-scenarios
  - acceptance criteria
  - given when then
  - bdd scenario
  - gherkin
---

# BDD Scenarios Skill

This plugin (`com.paca.bdd`) attaches lightweight Given/When/Then acceptance-criteria scenarios to a Paca task. Each scenario is a short title plus three free-text clauses — it's deliberately not strict Gherkin syntax (no step tables, tags, scenario outlines, or a status/approval field). A scenario is either present on the task or it isn't; there's no draft/approved workflow to manage.

## When to use this skill

Use it when asked to:
- Write or define acceptance criteria for a task
- Turn a requirement into Given/When/Then scenarios
- Add, review, edit, or remove BDD/test scenarios on a task

## Tools

- `bdd_list_scenarios(projectId, taskId)` — list every scenario on a task.
- `bdd_get_scenario(projectId, taskId, scenarioId)` — fetch one scenario's full detail.
- `bdd_create_scenario(projectId, taskId, title, given?, when?, then?)` — create a scenario. Only `title` is required; the three clauses can be filled in now or later.
- `bdd_update_scenario(projectId, taskId, scenarioId, title?, given?, when?, then?)` — partial update: only the fields you pass change, everything else is preserved.
- `bdd_delete_scenario(projectId, taskId, scenarioId)` — permanently remove a scenario.

`projectId`/`taskId` come from the core `list_projects`/`list_tasks` tools — resolve those first if you don't already have them in context.

## Workflow

1. **Confirm the task.** Resolve `projectId` and `taskId` from context, or via `list_projects`/`list_tasks`.
2. **Check what's already there.** Call `bdd_list_scenarios` before creating anything — don't add a duplicate of a scenario that already covers the same behavior. If you're refining existing coverage, prefer `bdd_update_scenario` over deleting and recreating.
3. **One scenario per distinct behavior.** Break a requirement into separate scenarios instead of one scenario trying to cover every case — e.g. "Successful login with valid credentials" and "Login rejected with wrong password" are two scenarios, not one. Keep titles short and specific (roughly 5-8 words, naming the behavior being verified, not the feature).
4. **Write Given/When/Then as plain prose, not formal Gherkin.** These are free-text fields — a sentence or two each, not step-table syntax. For example:
   - Given: "the user is on the login page with a valid, unexpired account"
   - When: "they submit the correct email and password"
   - Then: "they are redirected to the dashboard and see a welcome toast"
5. **Build incrementally when useful.** You don't need all three clauses at creation time — create with just a title if the behavior is still being worked out, then `bdd_update_scenario` to fill in Given/When/Then as they become clear. An omitted field is simply left unset; passing a new value replaces only that clause.
6. **Don't separately narrate what you did.** Every create/update/delete is already recorded on the task's activity feed automatically — no need to also post a task comment summarizing it, unless the user asked for an explanation of your reasoning.
7. **Scenarios are cascade-deleted with their task** — no separate cleanup needed if the task itself is deleted.

## Constraints

- `title` must be non-empty on both create and update.
- There's no priority, tag, or status field on a scenario — don't invent one inside the title or Given/When/Then text. If the user wants that kind of tracking, it belongs on the task itself (priority, labels), not the scenario.
