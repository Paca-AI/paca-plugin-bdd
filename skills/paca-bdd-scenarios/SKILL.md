---
name: paca-bdd-scenarios
description: Write, review, and verify Given/When/Then BDD acceptance-criteria scenarios attached to a Paca task, using the com.paca.bdd plugin's tools. Use when asked to write acceptance criteria, define test scenarios, turn a requirement into Given/When/Then behavior, check whether a task's scenarios are complete or testable, or confirm that finished work satisfies its scenarios.
triggers:
  - /paca-bdd-scenarios
  - acceptance criteria
  - given when then
  - bdd scenario
  - gherkin
  - test scenarios
---

# BDD Scenarios Skill

This plugin (`com.paca.bdd`) attaches lightweight Given/When/Then acceptance-criteria scenarios to a Paca task. Each scenario is a short title plus three free-text clauses — deliberately not strict Gherkin (no step tables, tags, outlines, or status/approval field). A scenario is either on the task or it isn't.

Scenarios are the task's **definition of done**: other skills read them to implement, test and review the work. Write them so someone who has never seen the task could verify it from the scenario alone.

## Tools

- `bdd_list_scenarios(projectId, taskId)` — list every scenario on a task.
- `bdd_get_scenario(projectId, taskId, scenarioId)` — one scenario's full detail.
- `bdd_create_scenario(projectId, taskId, title, given?, when?, then?)` — only `title` is required.
- `bdd_update_scenario(projectId, taskId, scenarioId, title?, given?, when?, then?)` — partial: only the fields you pass change.
- `bdd_delete_scenario(projectId, taskId, scenarioId)` — permanent.

Resolve `projectId`/`taskId` with `list_projects` / `get_task_by_number` first. Note: `get_task` already appends a `## BDD Scenarios` section, but it lists **titles only** — call `bdd_list_scenarios` / `bdd_get_scenario` whenever you need the Given/When/Then text. Every create/update/delete is already on the task's activity feed; do not also post a comment summarizing it unless asked.

## Choose the mode

| The user wants… | Mode |
|---|---|
| New scenarios from a requirement or task | **Write** |
| An opinion on, or cleanup of, existing scenarios | **Review** |
| To know whether finished work meets the scenarios | **Verify** |

## Write

1. **Load context.** `get_task_by_number`, `list_task_activities` (decisions already made), then `search_docs` / `read_doc` for the spec and glossary. Use the project's own vocabulary.
2. **Check what exists.** `bdd_list_scenarios` first. Sharpen with `bdd_update_scenario`; never add a duplicate, and prefer an update over delete-and-recreate.
3. **Settle ambiguity first.** If the requirement leaves a rule open (who is allowed? what at the limit? existing data?), ask a few specific questions, each with your recommended answer (`ask_user_question` if available). A wrong scenario is worse than a missing one. Bigger gaps: `paca-clarify`.
4. **Cover behavior, not the screen.** Consider the happy path, boundaries (empty, one, max, just over), failure and rejection, permissions and state, and one adjacent regression. Skip what does not apply; most tasks need 3–8 scenarios. Over ~10 means the task is too big — suggest `paca-breakdown`.
5. **One behavior per scenario.** "Login succeeds with valid credentials" and "Login rejected with wrong password" are two scenarios. If a *Then* joins unrelated outcomes with "and", split it.
6. **Plain prose, one or two sentences per clause:**
   - **Title** — 5–8 words naming the behavior verified ("Expired invite link is rejected").
   - **Given** — only the state that matters.
   - **When** — exactly one action or event.
   - **Then** — an observable, checkable outcome: what is shown, returned, stored, or *not* sent. Never "works correctly", "is handled", "is fast"; put numbers on limits.
7. **Declarative, not procedural.** Intent and outcome, not clicks; no selectors, table names or function names — they go stale.
8. **Build incrementally.** Create with just a title while the behavior is unsettled, then fill the clauses. Do not leave one half-empty without telling the user.
9. **Report:** scenarios created/changed, open questions, categories deliberately skipped.

Example — Title: `Login rejected after five wrong passwords`. Given: `an active account that has failed to sign in four times in the last 15 minutes`. When: `a fifth sign-in attempt uses a wrong password`. Then: `sign-in is refused, the account is locked for 15 minutes, and the user is told how long to wait`.

## Review

`bdd_list_scenarios`, then `bdd_get_scenario` for thin ones; compare with the task and docs. Report only real problems:

| Smell | Fix |
|---|---|
| Vague *Then* ("works", "handled") | Replace with an observable result |
| Several behaviors / several *When*s | Split |
| Procedural (clicks, fields) | Rewrite as intent and outcome |
| Implementation leak | Rewrite at behavior level |
| Duplicate or overlapping | Merge, keep the sharper wording |
| Contradicts another scenario, the task or a doc | Surface it and ask — never silently pick a side |
| Untestable | Say what would make it observable |

Then list **gaps**: task requirements no scenario covers, and missing failure/boundary/permission cases. Apply `bdd_update_scenario` only for clear wording fixes the user asked for; ask before deleting anything.

## Verify

1. `bdd_list_scenarios`; for each find specific evidence: a passing test that exercises the *When* and asserts the *Then*, an observed result from running the feature, or the PR diff plus CI (test name, command and output, file and line).
2. Mark each **met** (with evidence), **not met** (what was observed) or **not verified** (why). Code that merely looks right is not evidence.
3. Report the table. For anything not met, say whether the code or the scenario is wrong; propose scenario changes and wait for confirmation. Record the outcome with `add_task_comment` (verification is not a scenario change, so the activity feed does not already cover it).

## Constraints

- `title` must be non-empty on create and update.
- No priority, tag or status on a scenario — do not smuggle one into the text; that belongs on the task.
- Scenarios are cascade-deleted with their task.
- Never rewrite or delete a scenario just to make verification pass.
