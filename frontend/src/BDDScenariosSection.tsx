import { PluginApiClient, PluginQueryClientProvider } from "@paca-ai/plugin-sdk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Plus } from "lucide-react";
import { useMemo } from "react";
import { BDDScenarioCard } from "./BDDScenarioCard";
import type { BDDScenario } from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

const PLUGIN_ID = "com.paca.bdd";

// ── Props ─────────────────────────────────────────────────────────────────────

interface BDDScenariosSectionProps {
  projectId: string;
  taskId: string;
  canEdit?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * BDDScenariosSection — the entry component exposed by the BDD plugin.
 *
 * Receives props directly from the host's <ExtensionPoint> spread and builds
 * its own PluginApiClient using window.location.origin so it can run as an
 * independent micro-frontend.
 */
export default function BDDScenariosSection(props: BDDScenariosSectionProps) {
  return (
    <PluginQueryClientProvider>
      <BDDScenariosSectionInner {...props} />
    </PluginQueryClientProvider>
  );
}

function BDDScenariosSectionInner({
  projectId,
  taskId,
  canEdit = false,
}: BDDScenariosSectionProps) {
  const api = useMemo(
    () =>
      new PluginApiClient({
        baseUrl: `${window.location.origin}/api/v1`,
        projectId,
        fetch: (url, init) =>
          window.fetch(url, { ...init, credentials: "include" }),
      }),
    [projectId],
  );

  const qc = useQueryClient();
  const queryKey = ["plugin", PLUGIN_ID, "bdd-scenarios", projectId, taskId];

  // ── Query ──────────────────────────────────────────────────────────────────

  const { data: scenarios = [], isLoading } = useQuery<BDDScenario[]>({
    queryKey,
    queryFn: () =>
      api.pluginGet<BDDScenario[]>(
        PLUGIN_ID,
        `/tasks/${taskId}/bdd-scenarios`,
      ),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey });

  const createScenario = useMutation({
    mutationFn: () =>
      api.pluginPost<BDDScenario>(PLUGIN_ID, `/tasks/${taskId}/bdd-scenarios`, {
        title: `Scenario ${scenarios.length + 1}`,
      }),
    onSuccess: invalidate,
  });

  const updateScenario = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: { title?: string; given?: string; when?: string; then?: string };
    }) =>
      api.pluginPatch<BDDScenario>(
        PLUGIN_ID,
        `/tasks/${taskId}/bdd-scenarios/${id}`,
        patch,
      ),
    onSuccess: invalidate,
  });

  const deleteScenario = useMutation({
    mutationFn: (id: string) =>
      api.pluginDelete(PLUGIN_ID, `/tasks/${taskId}/bdd-scenarios/${id}`),
    onSuccess: invalidate,
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 flex items-center gap-2">
          <span>BDD Scenarios</span>
          <div className="flex-1 h-px bg-linear-to-r from-border/40 to-transparent" />
        </h3>
        {canEdit && (
          <button
            type="button"
            onClick={() => createScenario.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-muted/40 text-muted-foreground/80 hover:bg-muted/60 hover:text-foreground px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-150"
          >
            <Plus className="size-3" />
            Add scenario
          </button>
        )}
      </div>

      {isLoading ? null : scenarios.length > 0 ? (
        <div className="space-y-2">
          {scenarios.map((scenario) => (
            <BDDScenarioCard
              key={scenario.id}
              scenario={scenario}
              canEdit={canEdit}
              onUpdate={(id, patch) => updateScenario.mutate({ id, patch })}
              onDelete={(id) => deleteScenario.mutate(id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 px-1 py-3 text-muted-foreground/45">
          <FlaskConical className="size-4 opacity-70" />
          <p className="text-[13px] italic">No BDD scenarios yet</p>
        </div>
      )}
    </div>
  );
}
