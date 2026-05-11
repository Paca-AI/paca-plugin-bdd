import { ChevronDown, ChevronUp, Pencil, Trash2, X, Check } from "lucide-react";
import { useState } from "react";
import type { BDDScenario } from "./types";

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

interface BDDScenarioCardProps {
  scenario: BDDScenario;
  canEdit: boolean;
  onUpdate: (
    id: string,
    patch: { title?: string; given?: string; when?: string; then?: string },
  ) => void;
  onDelete: (id: string) => void;
}

export function BDDScenarioCard({
  scenario,
  canEdit,
  onUpdate,
  onDelete,
}: BDDScenarioCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: scenario.title,
    given: scenario.given,
    when: scenario.when,
    then: scenario.then,
  });

  const startEdit = () => {
    setDraft({
      title: scenario.title,
      given: scenario.given,
      when: scenario.when,
      then: scenario.then,
    });
    setEditing(true);
    setExpanded(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft({
      title: scenario.title,
      given: scenario.given,
      when: scenario.when,
      then: scenario.then,
    });
  };

  const submitEdit = () => {
    if (!draft.title.trim()) return;
    onUpdate(scenario.id, {
      title: draft.title.trim(),
      given: draft.given,
      when: draft.when,
      then: draft.then,
    });
    setEditing(false);
  };

  const hasContent = scenario.given || scenario.when || scenario.then;

  return (
    <div className="rounded-xl border border-border/25 bg-card/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center gap-2 min-w-0 text-left group"
          aria-expanded={expanded}
        >
          {editing ? (
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
              // biome-ignore lint/a11y/noAutofocus: intentional for inline title editing
              autoFocus
              className="flex-1 text-[13px] font-semibold text-foreground bg-transparent outline-none rounded-md border border-border/40 px-2 py-0.5"
              aria-label="Scenario title"
            />
          ) : (
            <span className="flex-1 truncate text-[13px] font-semibold text-foreground group-hover:text-foreground/80 transition-colors">
              {scenario.title}
            </span>
          )}
          {hasContent && !editing && (
            <span className="text-muted-foreground/50 shrink-0">
              {expanded ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </span>
          )}
        </button>

        {canEdit && (
          <div className="flex items-center gap-1 shrink-0">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={submitEdit}
                  disabled={!draft.title.trim()}
                  className="flex items-center justify-center size-6 rounded-md text-emerald-600 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                  aria-label="Save changes"
                >
                  <Check className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex items-center justify-center size-6 rounded-md text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-muted/50 transition-colors"
                  aria-label="Cancel edit"
                >
                  <X className="size-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={startEdit}
                  className="flex items-center justify-center size-6 rounded-md text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-muted/50 transition-colors"
                  aria-label="Edit scenario"
                >
                  <Pencil className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(scenario.id)}
                  className="flex items-center justify-center size-6 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Delete scenario"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      {(expanded || editing) && (
        <div className="border-t border-border/15 px-4 py-3 space-y-3">
          {(["given", "when", "then"] as const).map((field) => (
            <div key={field} className="space-y-1">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  field === "given" && "text-blue-500/80",
                  field === "when" && "text-amber-500/80",
                  field === "then" && "text-emerald-500/80",
                )}
              >
                {field}
              </span>
              {editing ? (
                <textarea
                  value={draft[field]}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [field]: e.target.value }))
                  }
                  placeholder={`Describe the ${field} condition…`}
                  rows={2}
                  className="w-full bg-muted/20 border border-border/20 rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-border/50 resize-none placeholder:text-muted-foreground/40 transition-colors"
                />
              ) : (
                <p
                  className={cn(
                    "text-[13px] leading-relaxed",
                    scenario[field]
                      ? "text-foreground/80"
                      : "text-muted-foreground/40 italic",
                  )}
                >
                  {scenario[field] || `No ${field} condition defined`}
                </p>
              )}
            </div>
          ))}
          {editing && (
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitEdit}
                disabled={!draft.title.trim()}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
