# Klaro — Elevation Plan

> Synthesis of three senior deep-dives (design system, AI/ML workflow, per-page UX) into one sequenced
> program that takes Klaro from "half-broken vibe-coded MVP" to a coherent, honest, production-grade
> AutoML product. P0 *foundation* (security/correctness/green build) is already done — this plan covers
> the **elevation** on top of it.

## Guiding principles
1. **Honesty over polish.** No fabricated metrics anywhere — not on the marketing page, not in prediction
   confidence, not in LLM summaries. A model labeled `svm` must be an SVM.
2. **One signal, quiet chrome.** "Calm technical / data-forward": near-black neutral canvas, a single
   cyan accent, monospace for all data/IDs/metrics, flat surfaces with hairline borders. Kill the
   purple→pink glassmorphism.
3. **Thread the pipeline.** Upload → Profile → Train → Predict/Summary → History should feel like one
   guided journey (persistent stepper + a single primary "next" CTA per page), not disconnected pages.
4. **Inherit, don't repeat.** Reskin via shared tokens + primitives + shared components first; per-page
   polish second. Keep the build green at every checkpoint.

---

## Phase 1 — Design token foundation  *(non-breaking, whole-app reskin)*
Repointing the shared layer reskins every token-based surface at once, with zero per-page edits.

- **`globals.css`**: replace `:root` palette with the data-forward tokens (background `222 24% 6%`,
  card `222 20% 9%`, border `222 16% 18%`, foreground `213 28% 95%`, muted-fg `217 12% 60%`,
  **primary cyan `190 95% 50%`**, fixed destructive `0 72% 56%`); add `--elevated`, `--success`,
  `--warning`, `--chart-1..6`, `--shadow-sm/md/lg`; set `--radius: 0.5rem`. Delete the two duplicate
  Google-Fonts `@import`s (next/font already loads Inter + JetBrains Mono). **Re-point** `.glass*`,
  `.gradient-text*`, `.hover-glow/-lift`, `.interactive-card`, `.neon-glow` to sane opaque/border-shift
  styles (don't delete yet — keeps existing pages coherent until Phase 2 migrates them). Add
  `prefers-reduced-motion` reset.
- **`tailwind.config.ts`**: add `elevated`, `success`, `warning`, `chart.1-6` colors; map `boxShadow`
  to `--shadow-*`; prune dead gradient/float/pulse/wave/typewriter keyframes.
- **`layout.tsx`**: remove fixed gradient backdrop + 3 pulsing blobs → flat `bg-background`;
  `themeColor` `#8b5cf6` → `#06C9F5`.
- **Primitives** (`components/ui/`): `button` (solid cyan default, no gradient/scale, `rounded-md`,
  drop `gradient`/`glass` variants, shrink `xl`), `card` (flat `border-border bg-card shadow-sm`,
  hover opt-in), `badge` (add `success`/`warning`/`error`, soften default to tinted cyan), `input`
  (`rounded-md`, `bg-card`, cyan focus only), `progress` (solid cyan fill).

**Checkpoint:** `tsc` clean + `next build` green; whole app already looks coherent.

## Phase 2 — Shared UX scaffolding  *(threads the journey)*
- `PipelineStepper` (Upload→Profile→Train→Predict), carries `session`/`model` id, rendered under nav on
  pipeline routes.
- `ErrorState` (title/message/recovery-CTA/retry) — replaces 5 bespoke error blocks.
- `PageSkeleton` + inline spinners — replaces 6 bespoke full-screen spinners.
- Sticky single-CTA footer pattern.
- `Navigation`: flat cyan logo, `bg-background/80 backdrop-blur border-b`, neutral active state,
  **add `/models`** to nav (currently orphaned).

## Phase 3 — Page migration + homepage redesign  *(parallelizable, one agent per file)*
- **Home**: detempify hero (no gradient/7xl), uniform neutral feature/quick-action chips, gate
  Quick Actions to authed users, convert Recent Activity to a bordered `divide-y` list with mono
  metrics + semantic badges, **remove the fake "Live Demo" mock (1,250/94.2%) and "thousands of
  professionals" line**, fix/remove dead "Watch Demo", fix orphaned `/models` links, add authed
  first-run empty state + skeletons.
- **History (P0 dead UI)**: wire dead **Predict** + **View Details** buttons; fix empty-state CTA
  (`/train` w/o session → `/upload`); re-skin light-theme remnant cards; inline refresh (not full-page);
  stop refresh-toast spam; `router.push` instead of `window.location.href`.
- **Profile**: collapse triple `xl` CTA → one primary (Enhanced) in a sticky footer; column
  search/filter + collapse-to-top-N for wide datasets; drop passive-load toast.
- **Train / Enhanced**: differentiate or merge; reduce result CTAs to 1 primary + 1 secondary; remove
  fake "Training Time: < 1s"; honest progress; disabled-button helper text.
- **Predict**: typed inputs + "fill with example row" + real required-field validation; robust CSV
  parsing + header check; guard confidence/probabilities for regression; forward nav after predict.
- **Summary**: replace `router.back()` with explicit links; add forward CTAs; inline LLM error/retry;
  consolidate the two AI-summary surfaces.
- **Login/Signup**: surface auth errors inline; honor post-login `redirect`; auto-login after signup.
- Cross-cutting: toast rules (only user-initiated actions), skeletons, consistent error states.

## Phase 4 — AI/ML workflow  *(backend, honesty-first)*
**P0 — correctness & honesty**
- **Kill the silent algorithm downgrade** (`train.py` `model_algorithm_map`): validate against a real
  registry, **400 on unsupported** — never substitute.
- **`ml_processor` `ALGORITHM_REGISTRY`**: real SVM (`SVC(probability=True)`/`SVR`), KNN, naive_bayes
  (classification-only, honest), decision_tree, ridge, lasso — alongside RF/logistic/xgboost.
- **Honest prediction confidence**: remove fabricated regression `1/(1+std)`; stop hardcoded `0.5`;
  `PredictionResult.confidence` → `Optional`; return `null` when no `predict_proba`.
- **Fix dropped LLM metrics** (`summary.py`): pass persisted `evaluation_metrics` + feature importance
  into insights/LLM prompts; anti-hallucination system prompt; fix misleading hardcoded `api_info`.

**P1 — capability & robustness**
- `train_model_v2`: `RandomizedSearchCV` (grids from `smart_model_selector`, `model__`-prefixed) +
  `Stratified/KFold` CV + class-imbalance (`class_weight`/`scale_pos_weight`), gated by
  `optimization_level` + dataset size; richer metrics (ROC-AUC, balanced-acc, per-class report,
  multiclass confusion; MAPE/explained-var). Persist CV mean/std + best_params.
- Calibration (`CalibratedClassifierCV`) + real regression intervals (RF ensemble std / residual band).
- Make `enhanced_preprocessor` sklearn-safe (`BaseEstimator/TransformerMixin`, `OrdinalEncoder` not
  `LabelEncoder`), wire into `train_model_v2`; point `enhanced_train_model` at it; delete the broken
  `train_model_enhanced`.
- **Async training**: `BackgroundTasks` + DB-backed `status` (queued→training→completed/failed);
  repurpose `/status/{model_id}` to read the DB row; seed non-null `evaluation_metrics={}` on insert.
- `predict` schema validation (unknown/missing/dtype) → structured 422.
- `llm_service` → `httpx.AsyncClient`, `asyncio.gather` the parallel calls (~90s→~30s), JSON-mode +
  Pydantic validation + fence-stripping, summary cache.

**P2 — scale & polish**
- `ModelMetadata` columns: `requested_algorithm`, `cv_mean/std`, `best_params`, `calibrated`, `job_id`
  (Alembic migration). Provider config via settings. Optional `imbalanced-learn` SMOTE (train folds
  only). Celery/RQ swap-in path for multi-worker.

## Phase 5 — Charts, tables & final polish
- Centralize a `chartColors` palette from `--chart-*`; tokenized recharts grid/axis/tooltip; mono
  `tabular-nums` values. Add shadcn `table`/`tooltip`/`skeleton`/`separator`/`select`; apply `table`
  to CSV preview/schema views. Move Next-15 `themeColor`/`viewport` to `viewport` exports.

---

## Sequencing & verification
1 → 2 → 3 (frontend) can proceed independently of 4 (backend). Keep `tsc`/`next build` green after each
phase; keep the backend importing cleanly (41 routes) after each backend change. Phase 4 P0 (honesty)
should land regardless of P1/P2 since it's user-trust-critical.

## Source specs
Full deep-dives retained in the conversation: design-system, AI/ML-workflow, per-page-UX. This file is
the executable synthesis.
