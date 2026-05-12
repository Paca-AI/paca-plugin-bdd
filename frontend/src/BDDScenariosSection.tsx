import { PluginQueryClientProvider } from "@paca-ai/plugin-sdk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ChevronDown,
	ChevronRight,
	FlaskConical,
	Plus,
	Trash2,
} from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import {
	bddScenariosQueryOptions,
	createBDDScenario,
	deleteBDDScenario,
	updateBDDScenario,
} from "./lib/interaction-api";
import type { BDDScenario } from "./types";
import { cn } from "./lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface BDDSectionProps {
	projectId: string;
	taskId: string;
	canEdit?: boolean;
}

// ── Main export with provider ──────────────────────────────────────────────────

export default function BDDScenariosSection(props: BDDSectionProps) {
	return (
		<PluginQueryClientProvider>
			<BDDScenariosSectionInner {...props} />
		</PluginQueryClientProvider>
	);
}

// ── Editor row for a single clause (Given / When / Then) ──────────────────────

function ClauseRow({
	label,
	color,
	value,
	placeholder,
	onChange,
	onBlur,
	disabled,
}: {
	label: string;
	color: string;
	value: string;
	placeholder: string;
	onChange: (v: string) => void;
	onBlur?: () => void;
	disabled?: boolean;
}) {
	return (
		<div className="flex gap-2.5 items-start">
			<span
				className={cn(
					"mt-0.75 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase",
					color,
				)}
			>
				{label}
			</span>
			<textarea
				aria-label={label}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onBlur={onBlur}
				disabled={disabled}
				rows={1}
				placeholder={placeholder}
				className="flex-1 min-h-7 resize-none bg-transparent text-[12.5px] leading-relaxed text-foreground/90 outline-none placeholder:text-muted-foreground/40 disabled:opacity-60 focus:placeholder:text-muted-foreground/60 transition-colors py-0.5"
				style={{ fieldSizing: "content" } as CSSProperties}
			/>
		</div>
	);
}

// ── Single scenario card ───────────────────────────────────────────────────────

function ScenarioCard({
	scenario,
	projectId,
	taskId,
	canEdit,
}: {
	scenario: BDDScenario;
	projectId: string;
	taskId: string;
	canEdit: boolean;
}) {
	const qc = useQueryClient();
	const [expanded, setExpanded] = useState(false);
	const [editTitle, setEditTitle] = useState(false);
	const [titleDraft, setTitleDraft] = useState(scenario.title);

	// Debounced clause drafts (updated locally then flushed on blur)
	const [given, setGiven] = useState(scenario.given);
	const [when, setWhen] = useState(scenario.when);
	const [then, setThen] = useState(scenario.then);

	useEffect(() => {
		setTitleDraft(scenario.title);
		setGiven(scenario.given);
		setWhen(scenario.when);
		setThen(scenario.then);
	}, [scenario.id, scenario.title, scenario.given, scenario.when, scenario.then]);

	const qKey = bddScenariosQueryOptions(projectId, taskId).queryKey;

	const updateMut = useMutation({
		mutationFn: (payload: Parameters<typeof updateBDDScenario>[3]) =>
			updateBDDScenario(projectId, taskId, scenario.id, payload),
		onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
	});

	const deleteMut = useMutation({
		mutationFn: () => deleteBDDScenario(projectId, taskId, scenario.id),
		onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
	});

	const flushClause = (field: "given" | "when" | "then", val: string) => {
		const original = scenario[field];
		const normalized = val.trim();
		if (normalized !== original.trim()) {
			updateMut.mutate({ [field]: normalized });
		}
	};

	return (
		<div
			data-testid="bdd-scenario-card"
			className="rounded-xl border border-border/25 bg-card/50 overflow-hidden"
		>
			{/* Header row */}
			<div
				className="flex items-center gap-2 px-4 py-3 group/scenario cursor-pointer"
				onClick={() => setExpanded((x) => !x)}
			>
				{/* Expand/collapse button */}
				<button
					type="button"
					className="shrink-0 p-0 text-muted-foreground/70 cursor-pointer"
					onClick={(e) => {
						e.stopPropagation();
						setExpanded((x) => !x);
					}}
					aria-expanded={expanded}
					aria-label={expanded ? "Collapse scenario" : "Expand scenario"}
				>
					{expanded ? (
						<ChevronDown className="size-3.5" />
					) : (
						<ChevronRight className="size-3.5" />
					)}
				</button>

				{/* Title area */}
				{editTitle && canEdit ? (
					<input
						ref={(el) => {
							el?.focus();
						}}
						aria-label="Scenario title"
						value={titleDraft}
						onChange={(e) => setTitleDraft(e.target.value)}
						onBlur={() => {
							setEditTitle(false);
							const trimmed = titleDraft.trim();
							if (trimmed && trimmed !== scenario.title) {
								updateMut.mutate({ title: trimmed });
							} else {
								setTitleDraft(scenario.title);
							}
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === "Escape") {
								e.currentTarget.blur();
							}
						}}
						onClick={(e) => e.stopPropagation()}
						className="flex-1 bg-transparent text-[13px] font-semibold text-foreground outline-none"
					/>
				) : (
					<button
						type="button"
						disabled={!canEdit}
						className={cn(
							"flex-1 text-left text-[13px] font-semibold text-foreground truncate",
							canEdit && "hover:cursor-text",
						)}
						onClick={(e) => {
							e.stopPropagation();
							if (!canEdit) return;
							setExpanded(true);
							setEditTitle(true);
						}}
					>
						{scenario.title || (
							<span className="italic text-muted-foreground/60">
								Untitled scenario
							</span>
						)}
					</button>
				)}

				{canEdit && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							deleteMut.mutate();
						}}
						disabled={deleteMut.isPending}
						className="ml-1 shrink-0 rounded-md p-1 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/5 transition-all duration-150"
						aria-label="Delete scenario"
					>
						<Trash2 className="size-3.5" />
					</button>
				)}
			</div>

			{/* Expanded body: Given / When / Then */}
			{expanded && (
				<div className="px-4 pb-4 pt-0 space-y-2 border-t border-border/15">
					<div className="pt-3 space-y-2">
						<ClauseRow
							label="Given"
							color="bg-sky-500/15 text-sky-600 dark:text-sky-400"
							value={given}
							placeholder="the initial context or precondition…"
							onChange={setGiven}
							onBlur={() => flushClause("given", given)}
							disabled={!canEdit}
						/>
						<ClauseRow
							label="When"
							color="bg-violet-500/15 text-violet-600 dark:text-violet-400"
							value={when}
							placeholder="the action or event that occurs…"
							onChange={setWhen}
							onBlur={() => flushClause("when", when)}
							disabled={!canEdit}
						/>
						<ClauseRow
							label="Then"
							color="bg-emerald-500/15 text-emerald-600 dark:text-emerald-500"
							value={then}
							placeholder="the expected outcome or result…"
							onChange={setThen}
							onBlur={() => flushClause("then", then)}
							disabled={!canEdit}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

// ── New scenario quick-add form ────────────────────────────────────────────────

function NewScenarioForm({
	projectId,
	taskId,
	onDone,
}: {
	projectId: string;
	taskId: string;
	onDone: () => void;
}) {
	const qc = useQueryClient();
	const titleRef = useRef<HTMLInputElement>(null);
	useEffect(() => {
		titleRef.current?.focus();
	}, []);
	const [title, setTitle] = useState("");
	const [given, setGiven] = useState("");
	const [when, setWhen] = useState("");
	const [then, setThen] = useState("");

	const qKey = bddScenariosQueryOptions(projectId, taskId).queryKey;

	const createMut = useMutation({
		mutationFn: () =>
			createBDDScenario(projectId, taskId, {
				title: title.trim(),
				given: given.trim(),
				when: when.trim(),
				// biome-ignore lint/suspicious/noThenProperty: "then" is a BDD domain field
				then: then.trim(),
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: qKey });
			onDone();
		},
	});

	const canSave = title.trim().length > 0 && !createMut.isPending;

	return (
		<div className="rounded-xl border border-primary/25 bg-card/60 ring-1 ring-primary/20 p-4 space-y-3">
			<input
				ref={titleRef}
				aria-label="Scenario title"
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				placeholder="Scenario title…"
				className="w-full bg-transparent text-[13px] font-semibold text-foreground outline-none placeholder:text-muted-foreground/50 focus:placeholder:text-muted-foreground/70 transition-colors"
				onKeyDown={(e) => {
					if (e.key === "Enter" && canSave) createMut.mutate();
					if (e.key === "Escape") onDone();
				}}
			/>

			<div className="space-y-2 pt-1">
				<ClauseRow
					label="Given"
					color="bg-sky-500/15 text-sky-600 dark:text-sky-400"
					value={given}
					placeholder="the initial context or precondition…"
					onChange={setGiven}
				/>
				<ClauseRow
					label="When"
					color="bg-violet-500/15 text-violet-600 dark:text-violet-400"
					value={when}
					placeholder="the action or event that occurs…"
					onChange={setWhen}
				/>
				<ClauseRow
					label="Then"
					color="bg-emerald-500/15 text-emerald-600 dark:text-emerald-500"
					value={then}
					placeholder="the expected outcome or result…"
					onChange={setThen}
				/>
			</div>

			<div className="flex items-center justify-end gap-2 pt-1">
				<button
					type="button"
					onClick={onDone}
					className="text-[11px] font-semibold text-muted-foreground/70 hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted/40 transition-all duration-150"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={() => createMut.mutate()}
					disabled={!canSave}
					className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all duration-150"
				>
					{createMut.isPending ? "Creating…" : "Create scenario"}
				</button>
			</div>
		</div>
	);
}

// ── Section header ─────────────────────────────────────────────────────────────

function BDDScenariosSectionInner({
	projectId,
	taskId,
	canEdit = false,
}: BDDSectionProps) {
	const [adding, setAdding] = useState(false);

	const { data: scenarios = [], isLoading } = useQuery(
		bddScenariosQueryOptions(projectId, taskId),
	);

	return (
		<div className="space-y-3">
			{/* Section heading */}
			<div className="flex items-center justify-between">
				<h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 flex items-center gap-2">
					<span>BDD Scenarios</span>
					{scenarios.length > 0 && (
						<span className="font-bold tabular-nums rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px]">
							{scenarios.length}
						</span>
					)}
					<div className="flex-1 h-px bg-linear-to-r from-border/40 to-transparent" />
				</h3>

				{canEdit && !adding && (
					<button
						type="button"
						onClick={() => setAdding(true)}
						className="flex items-center gap-1.5 rounded-lg bg-muted/40 text-muted-foreground/80 hover:bg-muted/60 hover:text-foreground px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-150"
					>
						<Plus className="size-3" />
						Add scenario
					</button>
				)}
			</div>

			{/* List */}
			{isLoading ? (
				<div className="flex items-center gap-3 px-1 py-3 text-muted-foreground/45">
					<FlaskConical className="size-4 opacity-50" />
					<p className="text-[13px] italic">Loading…</p>
				</div>
			) : scenarios.length > 0 ? (
				<div className="space-y-2">
					{scenarios.map((s) => (
						<ScenarioCard
							key={s.id}
							scenario={s}
							projectId={projectId}
							taskId={taskId}
							canEdit={canEdit}
						/>
					))}
				</div>
			) : (
				!adding && (
					<div className="flex items-center gap-3 px-1 py-3 text-muted-foreground/45">
						<FlaskConical className="size-4 opacity-70" />
						<p className="text-[13px] italic">No BDD scenarios yet</p>
					</div>
				)
			)}

			{/* Inline creation form */}
			{adding && (
				<NewScenarioForm
					projectId={projectId}
					taskId={taskId}
					onDone={() => setAdding(false)}
				/>
			)}
		</div>
	);
}
