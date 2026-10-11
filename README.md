# InferenceNet Challenge

[Live website](https://easonai-5589.github.io/inferencenet-challenge/)

Public presentation site for InferenceNet: AI for econometric research. The
site brings together Home, Data, Agent, Harness, Self-evolving, Leaderboard and Teams, with
Chinese / English and light / dark controls on every page.
The seven page links are visible by default, including the four-column menu (three columns below 352 px) on
narrow screens. Visitors can collapse it manually; each new page opens it again.
The Self-evolving page keeps its original URL, `evolution.html`, and its anchors.

## Edit the website

This repository contains the editable static files served by GitHub Pages.
No frontend framework or package installation is required.

```sh
git clone https://github.com/EasonAI-5589/inferencenet-challenge.git
cd inferencenet-challenge
python3 -m http.server 4193 --bind 127.0.0.1
```

Open `http://127.0.0.1:4193/` to preview. Create a branch for your changes and
submit a pull request against `main`; include the affected page links and a
screenshot for visual changes.

| Page or layer | Files |
|---|---|
| Home, research overview and resources | `index.html`, `index.css` |
| Dataset distributions and examples | `data.html`, `data.css` |
| Agent case and evaluation | `agent.html`, `agent.css` |
| Harness: definition, ecosystem (57 entries by type) and three breakdowns | `harness.html`, `harness.css`; reuses `data.css`, `agent.css`, `evolution.css` |
| Self-evolving: concept, methods, comparison and InferenceNet’s development study | `evolution.html`, `evolution.css`, `evolution.js`, `assets/data/modular-rsi-evolution.json` |
| Leaderboard and configuration filters | `leaderboard.html`, `leaderboard.css` |
| Team, institutions and Yichen Guo contact | `teams.html`, `teams.css` |
| Shared layout, navigation and theme | `styles.css`, `site.css`, `site.js`, `theme.js` |
| Chinese translations and language control | `assets/i18n/*.zh.json`, `language.js`, `language.css` |
| Charts and mountain leaderboard | `charts.js`, `mountain.js`, `mountain.css` |
| Shared homepage and leaderboard results | `leaderboard.js`, `leaderboard-data.js`, `assets/data/paired-results.*` |

When updating translations or shared scripts, refresh the `?v=` release tag
in the HTML. `language.js` forwards its release tag to the page dictionary URL.
All seven pages load `site.css`, `site.js` and `language.js` with release tag
`20261011-release`. Home and Leaderboard also load `leaderboard.css` and
`leaderboard.js` with it (the script imports `leaderboard-data.js` with the same
tag), and Home loads `index.css` with it. Self-evolving CSS uses
`20261011-evolution`, which Harness loads as well, and Self-evolving JS keeps
`20261010-evolution-r2`. Agent CSS keeps `20260917-case-data`, Teams CSS
`20260921-yujie-leader` and Harness CSS `20261010-harness-r3`; the results JSON
stays on `20260917-harness`. Strings shared by several pages, such as the
reading-route labels and the scroll hints, live in the common dictionary in
`language.js`.

English is authored in the HTML. When changing English text, update the matching
normalized English key and Chinese value in that page's dictionary. Preserve
code, numerical results and source provenance unless a reviewed correction is
available. Check both languages, both themes and a narrow viewport before
submitting; verify navigation, images, chart fallbacks and language controls.

同事可以直接修改对应页面的 HTML / CSS，并同步更新 `assets/i18n/` 下的中文词典。
建议每次改动单独开分支、提交 PR，说明页面和修改点；有布局调整时附一张截图。
`main` 合并后由 GitHub Pages 自动发布。

## Research content

Faculty roles, student leaders and institutional profiles live on `teams.html`.
Home links to that page instead of duplicating the roster.
Every footer links to `teams.html#contact`, with only Yichen Guo’s email, WeChat
ID and homepage. The personal WeChat QR image will be added when supplied.
Previously shared Home team anchors redirect to the corresponding Teams section.

Challenge dates, rules, registration, prizes and competition results remain
"To be announced" until confirmed. The public Hugging Face leaderboard is the
existing research benchmark, separate from future Challenge submissions.
The internal paired studies and recorded agent case are labelled exploratory
or historical; they do not report live experiment status or official Challenge
results. Statistical definitions are stated beside the internal results.

The site describes the pinned Selected_1000 distribution, curated task examples,
a recorded GPT-5.5 trajectory and the evaluation.
It does not execute models or analysis. Raw datasets, private run directories,
credentials and research repository history are not part of this repository.

Home and Leaderboard share the six-model release merged in
[HF PR #4](https://huggingface.co/spaces/CamoAiLab/InferenceNet-Leaderboard/discussions/4).
The source JSON and CSV are preserved in `assets/data/paired-results.*`; the
release commit and checksum are in `paired-results-provenance.json`. Gemini is
displayed as **Gemini 3.1 Pro**; its archived model ID and source name remain
unchanged for traceability. These are
12 groups with 1,000 tasks each. Failed, unknown and invalid records remain in
the denominator. Historical protocols differ across models, and official
scorer parity remains unverified.

The Results section uses the title InferenceNet Challenge Leaderboard, without
duplicate count or combined-ranking headings. One table ranks all 12 model
configurations together by default, ordered by
Full replication, with Partial replication and three additional metrics also
available. Public metric labels omit scoring profile names; protocol notes retain
`local-paper-v1` for full replication and `hf-leaderboard-v1` for the other four
metrics. Renaming labels does not rescore or modify the published snapshot.
The configuration dropdown filters All, Model or Model + Harness. The Harness
column names the actual architecture; a dash denotes the Model configuration.
Current harness results use DeepAgents; archived version details remain in the
cell title and source data. The two filtered views currently contain six entries
each. The mountain and table share the selected filter, metric and global ranking
within that selection. The old 14-entry source is no longer fetched.

Each model name in the table is a button that opens one run evidence card below
the table (Escape or Close returns to the row). The card uses only fields already
in `paired-results.json`: the configuration, the harness label as recorded (a
version is shown only when the label contains one), the model call cap, the date
the summary was generated, the interruption, task-level unknown and
invalid-evidence counts, the evidence class, archive path and source revision,
and for each metric the passed, failed and unknown counts with the scoring
profile and source recorded for it. A missing or null field reads "Not recorded"
and is never shown as 0. Unknown outcomes are described only as counted in the
1,000-task denominator without earning a success. Time limits, API mode and
sandbox are not in this summary and are not shown. The card follows the selected
filter and metric; a run removed by the filter closes its card. The saved
fallback table stays plain, so pages without JavaScript are unchanged.

Configuration categories are derived from each run’s `harness` metadata, not its
archive arm ID. Rendering and validation enumerate the recorded arms, so further
harness architectures can join the same table and Model + Harness filter without
redefining the categories. Published snapshots still require reviewed provenance
and compatible scoring profiles. Tests use synthetic records to exercise this
path; no additional harness results are claimed or published. Legacy
`?view=deepagents` links open the Model + Harness view.

To update results, first verify a published JSON/CSV pair and its provenance,
then run `node scripts/build-leaderboard.mjs` to regenerate the saved table on
each page. If JavaScript or data loading fails, one combined 12-row table remains
readable on each page. Check changes with
`node --test scripts/test-leaderboard.mjs scripts/test-run-card.mjs` and
`node scripts/check.mjs`, then verify both pages in the browser.

## Agent case walkthrough

The Agent page follows recorded GPT-5.5 task 0011: the input table, the
single-generation program and its month-column error, the three DeepAgents
tool executions, and the independently replayed result. Code excerpts and
returned evidence sit beside each step; the original prompt, programs and
trace remain in a collapsed record. Both languages distinguish the full
4,550-row, 38-column file, the 984-row time window and the 977 observations
used for regression. The same-task link opens `data.html#case-0011`, whose
case card repeats this data context. Interaction budgets remain explicit.
Agent CSS uses release tag `20260917-case-data`; its dictionary follows the
language.js release tag.

## Self-evolving: improving a harness

The Self-evolving page (`evolution.html`) first explains harness self-evolution:
proposing, testing and keeping harness versions on the basis of feedback from
the harness’s own runs. The three methods covered here run this search in
offline rounds; self-evolution more generally need not be offline. It shows
which of the six terms (model, harness, agent, SDK, environment, evaluator) an
outer loop edits and which it holds fixed, a shared five-step loop (run, record,
propose, check, select) in which each method keeps candidates by its own rule,
and three separate methods with a comparison table: ModularRSI (Wu et al.,
arXiv 2609.14857), Self-Harness (Zhang et al., arXiv 2606.09498) and Meta-Harness
(Lee et al., arXiv 2603.28052). Mechanism summaries follow each paper’s
description; the official repositories are listed separately, and their released
code may differ from the papers.

It then documents InferenceNet’s own development study, kept apart from the
papers: the first complete ModularRSI-style run on DeepAgents 0.7.13 (branch
`dev-modular-rsi` of the private evaluator repository, commit `06f2890`; run
`modrsi-real100-20261009-08`, frozen source `17f138b9`). It shows where the five
hook functions attach, the evolution loop, one trajectory panel per module
lineage (accepted versions, rejected candidates, problem › change annotations),
failure signals before and after evolution, and the frozen code of the three
changed functions. A completion lineage case reads one module's three accepted
epochs (finding, change, supporting tasks, full-replication and scored counts)
as a module-level record, not a causal account of any task, and a negative-results
card lists accepted versions that scored lower, the observation and context
modules that never changed, the fall of full replication among scored rollouts
from 47.4% to 41.9% and the thin evidence behind each edit. A reading box after
the subnav offers a Quick read and a Full route.

All numbers come from `assets/data/modular-rsi-evolution.json`: aggregated
development-set counts over 100 tasks × 3 rollouts with DeepSeek V4 Pro,
scored with local-paper-v1. The page states that promotion did not use these
scores, that the gain comes mainly from more scored final results, and that
the 900 held-out tasks had not been run as of the 9 Oct 2026 freeze. Task IDs,
trajectories and generated programs from the run are not published; reference
values are never shown to the model, analyst or editor during a run. These results are not part of the
leaderboard and use twice its per-task budget (12 model calls and 8 run_python
calls instead of 6 and 4). The values table on the page remains readable without JavaScript.

## Challenge student leaders

- [Yichen Guo](https://easonai-5589.github.io/) — Student Leader.
- [Tianyang Han](https://www.hkubs.hku.hk/people/tianyang-han/) — Student Leader.
- [Yujie Cai (@caiyujie)](https://github.com/caiyujie) — Student Leader.

See the [team page](https://easonai-5589.github.io/inferencenet-challenge/teams.html)
for the full project roster.

## Attribution

The initial layout and manual theme followed the project owner's WorldEcho /
WorldSync page (`SiriYep/worldecho-worldsync-project-page`, `bfaaf07`). Its
scientific figures, authors and results were not reused. Local Inter and Space
Mono assets retain their SIL Open Font License notices in `assets/fonts/`.

The MetricsAI workflow is attributed to Figure 1 of Chen et al.,
[Can AI Master Econometrics?](https://arxiv.org/abs/2506.00856v3). The original
image and the 2026-09-15 vector redraws retain their source and permission notes
in `assets/figures/ATTRIBUTION.txt`. They illustrate related research.

Official NTU CCDS, Nanyang Business School and HKU Business School marks retain
their source and ownership notes in `assets/institutions/ATTRIBUTION.txt`.
Initiative faculty roles and institutional research profiles link their official
sources. Institutional trademarks are not covered by code or font licenses.

## Publication

GitHub Pages serves the `main` branch root. This release copies only the reviewed
public website build and this collaboration guide. Future synchronization from
the research workspace must first incorporate changes merged here so colleagues'
edits are preserved. Never copy private research history or runtime evidence
into this public repository.

## Research framing

The homepage introduces model–harness interaction. Research directions below the
leaderboard cover model–harness coupling, harness self-evolution through automated
design and evaluation, and trajectory-based model post-training (including
distillation and reinforcement learning). The self-evolving direction links to the Self-evolving page’s concept and methods
(`evolution.html#concept`) and to InferenceNet’s development study
(`evolution.html#practice`), which reports one development-set run; the other
directions remain research aims, and no training dataset is claimed.
Current evaluation settings and source records remain in expandable protocol
notes. An agent denotes the model operating within a harness.

Terminology references: [agent evaluation](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents),
[automatic harness optimization](https://arxiv.org/abs/2608.23041),
and [trajectory-based reinforcement learning](https://arxiv.org/abs/2508.03680).

## Homepage presentation

Home follows five sections: the benchmark workflow, recorded GPT-5.5 task 0011,
the shared leaderboard, three research directions and participation. Full task
coverage and provenance remain on Data; the detailed execution trace remains
on Agent. Below the hero, a dated status list keeps the published leaderboard
(17 Sep 2026), the historical development study frozen on 9 Oct 2026 (held-out
tasks not run as of that snapshot) and the 10 Oct 2026 Harness and Self-evolving
explainers apart, and notes that Challenge rules, dates and the submission channel
have not been announced; trajectory-based post-training is stated as a research
goal. The model–harness research card links to the Harness page. Get involved
lists what is open now: a task package as the model sees it, the public data
(with the verified CamoAiLab and MetricsAI sentences) and how to ask for access to
the private evaluation framework. No Quickstart or submission path is implied.
Resources and citations remain available below. "Hidden" reference results mean
results the model does not see during a run.

## Harness: definition, ecosystem and breakdowns

A reading box right after the subnav offers a Quick read (definition, comparison,
InferenceNet) and a Full route (every section in order, including the full
DeepAgents three-layer structure and InferenceNet wiring); nothing is folded.
`site.js` adds a short "Scroll sideways…" hint under any wide figure or table while
it overflows on a narrow screen, and removes it when the content fits; the
leaderboard keeps its own note.

The Harness page defines a harness, the software that runs a model as an agent,
and separates it from the model, agent, SDK, environment and evaluator; it lists
the eight things every harness decides. Its ecosystem section has 57 entries as
of 10 October 2026 in five groups, each with a type (product harness, library
harness, harness SDK, hosted harness, adapter, research agent or extension):
only some are complete harnesses, and extensions have no loop of their own.
Three breakdowns share one template, each with an eight-slot figure, a
module-by-module flow figure, a detail table, notes and a step timeline:
DeepAgents 0.7.13 (a library harness, with its LangGraph and LangChain layers),
Superpowers 7.0.0 (an extension inside a host harness) and DeepSeek Harness
0.1.5-rc.1 (a product harness that runs as its own process, broken down as
driven through its SDK). The DeepAgents tab also keeps its two full figures from
the previous version: the three-layer assembly (DeepAgents, LangChain’s
create_agent graph and LangGraph, down to InferenceNet’s compiled graph) at
`harness.html#deepagents-architecture`, and InferenceNet’s wiring on branch
dev-gyc-eval at 92e56c8 at `harness.html#deepagents-inferencenet`; that wiring’s
budget is not the ModularRSI study’s. A comparison by slot follows, then a short section that
separates running a harness from optimizing it and links to the Self-evolving
page, how InferenceNet runs its DeepAgents and DeepSeek Harness arms, and the
sources, including market changes checked on 10 October 2026. The page reports
no scores. A new harness is added as one more breakdown tab, one more comparison
column and, if new, one more ecosystem row.
