import { PluginApiClient } from "@paca-ai/plugin-sdk-react";
import { useMemo } from "react";

const PLUGIN_ID = "com.paca.bdd";

export function useBddApi(projectId: string) {
  return useMemo(
    () =>
      new PluginApiClient({
        baseUrl: `${window.location.origin}/api/v1`,
        projectId,
        fetch: (url, init) =>
          window.fetch(url, { ...init, credentials: "include" }),
      }),
    [projectId],
  );
}

export function bddScenariosQueryOptions(projectId: string, taskId: string) {
  return {
    queryKey: ["plugin", PLUGIN_ID, "bdd-scenarios", projectId, taskId] as const,
    queryFn: async () => {
      const api = new PluginApiClient({
        baseUrl: `${window.location.origin}/api/v1`,
        projectId,
        fetch: (url, init) =>
          window.fetch(url, { ...init, credentials: "include" }),
      });
      return api.pluginGet(PLUGIN_ID, `/tasks/${taskId}/bdd-scenarios`);
    },
  };
}

export async function createBDDScenario(
  projectId: string,
  taskId: string,
  data: {
    title: string;
    given: string;
    when: string;
    then: string;
  },
) {
  const api = new PluginApiClient({
    baseUrl: `${window.location.origin}/api/v1`,
    projectId,
    fetch: (url, init) =>
      window.fetch(url, { ...init, credentials: "include" }),
  });
  return api.pluginPost(PLUGIN_ID, `/tasks/${taskId}/bdd-scenarios`, data);
}

export async function updateBDDScenario(
  projectId: string,
  taskId: string,
  scenarioId: string,
  data: {
    title?: string;
    given?: string;
    when?: string;
    then?: string;
  },
) {
  const api = new PluginApiClient({
    baseUrl: `${window.location.origin}/api/v1`,
    projectId,
    fetch: (url, init) =>
      window.fetch(url, { ...init, credentials: "include" }),
  });
  return api.pluginPatch(PLUGIN_ID, `/tasks/${taskId}/bdd-scenarios/${scenarioId}`, data);
}

export async function deleteBDDScenario(
  projectId: string,
  taskId: string,
  scenarioId: string,
) {
  const api = new PluginApiClient({
    baseUrl: `${window.location.origin}/api/v1`,
    projectId,
    fetch: (url, init) =>
      window.fetch(url, { ...init, credentials: "include" }),
  });
  return api.pluginDelete(PLUGIN_ID, `/tasks/${taskId}/bdd-scenarios/${scenarioId}`);
}
