import {
	PluginAPIClient,
	type PluginMCPContext,
	type PluginMCPEntry,
	type Tool,
	errorResult,
	textResult,
} from "@paca-ai/plugin-sdk-mcp";

// ── Domain types ──────────────────────────────────────────────────────────────

interface BDDScenario {
	id: string;
	task_id: string;
	title: string;
	given: string;
	when: string;
	then: string;
	created_at: string;
	updated_at: string;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatScenario(s: BDDScenario): string {
	return [
		`Scenario: ${s.title}`,
		`ID: ${s.id}`,
		`Task: ${s.task_id}`,
		"",
		s.given ? `Given: ${s.given}` : "Given: (not set)",
		s.when ? `When:  ${s.when}` : "When:  (not set)",
		s.then ? `Then:  ${s.then}` : "Then:  (not set)",
	].join("\n");
}

// ── Tool definitions ──────────────────────────────────────────────────────────

const UUID_DESC =
	"The technical UUID of the %s (e.g., '550e8400-e29b-41d4-a716-446655440000').";

const tools: Tool[] = [
	{
		name: "bdd_list_scenarios",
		description: "List all BDD scenarios for a specific task in a project.",
		inputSchema: {
			type: "object",
			properties: {
				projectId: {
					type: "string",
					description:
						UUID_DESC.replace("%s", "project") +
						" Use list_projects to get the project ID.",
				},
				taskId: {
					type: "string",
					description:
						UUID_DESC.replace("%s", "task") +
						" Use list_tasks to get the task ID.",
				},
			},
			required: ["projectId", "taskId"],
		},
	},
	{
		name: "bdd_get_scenario",
		description: "Get the full details of a single BDD scenario by its ID.",
		inputSchema: {
			type: "object",
			properties: {
				projectId: {
					type: "string",
					description:
						UUID_DESC.replace("%s", "project") +
						" Use list_projects to get the project ID.",
				},
				taskId: {
					type: "string",
					description:
						UUID_DESC.replace("%s", "task") +
						" Use list_tasks to get the task ID.",
				},
				scenarioId: {
					type: "string",
					description:
						UUID_DESC.replace("%s", "scenario") +
						" Use bdd_list_scenarios to get the scenario ID.",
				},
			},
			required: ["projectId", "taskId", "scenarioId"],
		},
	},
	{
		name: "bdd_create_scenario",
		description: "Create a new BDD scenario for a task.",
		inputSchema: {
			type: "object",
			properties: {
				projectId: {
					type: "string",
					description:
						UUID_DESC.replace("%s", "project") +
						" Use list_projects to get the project ID.",
				},
				taskId: {
					type: "string",
					description:
						UUID_DESC.replace("%s", "task") +
						" Use list_tasks to get the task ID.",
				},
				title: {
					type: "string",
					description: "The title of the new BDD scenario.",
				},
				given: {
					type: "string",
					description:
						"The Given condition describing the initial state (optional).",
				},
				when: {
					type: "string",
					description: "The When event/action that occurs (optional).",
				},
				then: {
					type: "string",
					description:
						"The Then expected outcome or assertion (optional).",
				},
			},
			required: ["projectId", "taskId", "title"],
		},
	},
	{
		name: "bdd_update_scenario",
		description:
			"Update an existing BDD scenario's title, Given, When, or Then fields. All fields are optional — only provided fields are changed.",
		inputSchema: {
			type: "object",
			properties: {
				projectId: {
					type: "string",
					description:
						UUID_DESC.replace("%s", "project") +
						" Use list_projects to get the project ID.",
				},
				taskId: {
					type: "string",
					description:
						UUID_DESC.replace("%s", "task") +
						" Use list_tasks to get the task ID.",
				},
				scenarioId: {
					type: "string",
					description:
						UUID_DESC.replace("%s", "scenario") +
						" Use bdd_list_scenarios to get the scenario ID.",
				},
				title: {
					type: "string",
					description: "New title for the scenario (optional).",
				},
				given: {
					type: "string",
					description: "New Given condition text (optional).",
				},
				when: {
					type: "string",
					description: "New When event/action text (optional).",
				},
				then: {
					type: "string",
					description: "New Then expected outcome text (optional).",
				},
			},
			required: ["projectId", "taskId", "scenarioId"],
		},
	},
	{
		name: "bdd_delete_scenario",
		description: "Permanently delete a BDD scenario from a task.",
		inputSchema: {
			type: "object",
			properties: {
				projectId: {
					type: "string",
					description:
						UUID_DESC.replace("%s", "project") +
						" Use list_projects to get the project ID.",
				},
				taskId: {
					type: "string",
					description:
						UUID_DESC.replace("%s", "task") +
						" Use list_tasks to get the task ID.",
				},
				scenarioId: {
					type: "string",
					description:
						UUID_DESC.replace("%s", "scenario") +
						" Use bdd_list_scenarios to get the scenario ID.",
				},
			},
			required: ["projectId", "taskId", "scenarioId"],
		},
	},
];

// ── Plugin entry ──────────────────────────────────────────────────────────────

const entry: PluginMCPEntry = {
	tools,

	async handleToolCall(
		name: string,
		args: Record<string, unknown>,
		context: PluginMCPContext,
	) {
		const api = new PluginAPIClient(context);

		try {
			switch (name) {
				case "bdd_list_scenarios": {
					const { projectId, taskId } = args as {
						projectId: string;
						taskId: string;
					};
					const scenarios = await api.pluginGet<BDDScenario[]>(
						`projects/${projectId}/tasks/${taskId}/bdd-scenarios`,
					);
					if (scenarios.length === 0) {
						return textResult("No BDD scenarios found for this task.");
					}
					return textResult(
						scenarios
							.map((s: BDDScenario, i: number) => `${i + 1}. ${formatScenario(s)}`)
							.join("\n\n---\n\n"),
					);
				}

				case "bdd_get_scenario": {
					const { projectId, taskId, scenarioId } = args as {
						projectId: string;
						taskId: string;
						scenarioId: string;
					};
					const scenario = await api.pluginGet<BDDScenario>(
						`projects/${projectId}/tasks/${taskId}/bdd-scenarios/${scenarioId}`,
					);
					return textResult(formatScenario(scenario));
				}

				case "bdd_create_scenario": {
					const { projectId, taskId, ...rest } = args as {
						projectId: string;
						taskId: string;
						title: string;
						given?: string;
						when?: string;
						then?: string;
					};
					const scenario = await api.pluginPost<BDDScenario>(
						`projects/${projectId}/tasks/${taskId}/bdd-scenarios`,
						rest,
					);
					return textResult(`BDD scenario created:\n\n${formatScenario(scenario)}`);
				}

				case "bdd_update_scenario": {
					const { projectId, taskId, scenarioId, ...patch } = args as {
						projectId: string;
						taskId: string;
						scenarioId: string;
						title?: string;
						given?: string;
						when?: string;
						then?: string;
					};
					const scenario = await api.pluginPatch<BDDScenario>(
						`projects/${projectId}/tasks/${taskId}/bdd-scenarios/${scenarioId}`,
						patch,
					);
					return textResult(`BDD scenario updated:\n\n${formatScenario(scenario)}`);
				}

				case "bdd_delete_scenario": {
					const { projectId, taskId, scenarioId } = args as {
						projectId: string;
						taskId: string;
						scenarioId: string;
					};
					await api.pluginDelete(
						`projects/${projectId}/tasks/${taskId}/bdd-scenarios/${scenarioId}`,
					);
					return textResult(`BDD scenario ${scenarioId} deleted successfully.`);
				}

				default:
					return errorResult(`Unknown tool: ${name}`);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return errorResult(`Tool ${name} failed: ${message}`);
		}
	},

	async getToolContext(
		toolId: string,
		args: Record<string, unknown>,
		context: PluginMCPContext,
	) {
		if (toolId !== "get_task") return null;
		const { projectId, taskId } = args as { projectId: string; taskId: string };

		const api = new PluginAPIClient(context);
		try {
			const scenarios = await api.pluginGet<BDDScenario[]>(
				`projects/${projectId}/tasks/${taskId}/bdd-scenarios`,
			);
			if (scenarios.length === 0) return null;

			const lines = [
				"## BDD Scenarios",
				"",
				...scenarios.map((s) => `- ${s.title}`),
			];
			return lines.join("\n");
		} catch {
			// Best-effort enrichment — a transient failure here should not
			// break the get_task response for the AI client.
			return null;
		}
	},
};

export default entry;
