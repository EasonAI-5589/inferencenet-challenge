# InferenceNet Challenge

[Live website](https://easonai-5589.github.io/inferencenet-challenge/)

Public presentation site for the Global InferenceNet Initiative: AI Agents for Business, Finance and Social Science. The site brings together Home, Challenge, Data, Agent,
Harness, Self-evolving, Leaderboard and Teams, with Chinese / English and light / dark
controls on every page.
The eight page links are visible by default, including the four-column menu (three columns below 352 px) on
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

Development and acceptance target the desktop website. As requested on
13 October 2026, mobile adaptation and mobile testing are outside the scope
of future updates unless explicitly requested again.

| Page or layer | Files |
|---|---|
| Home, research overview and resources | `index.html`, `index.css` |
| Challenge: initiative, subtracks, timeline and awards | `challenge.html`, `challenge.css`, `assets/i18n/challenge.zh.json` |
| Dataset distributions and examples | `data.html`, `data.css` |
| Agent case and evaluation | `agent.html`, `agent.css` |
| Harness: definition, system structure, selected 2025–2026 milestones, common mechanism comparison, catalogue by role, three breakdowns and InferenceNet’s four configurations | `harness.html`, `harness.css`; reuses `data.css`, `agent.css`, `evolution.css` |
| Self-evolving: concept, research map by adaptation regime, method comparison, three detailed offline cases and InferenceNet’s development study | `evolution.html`, `evolution.css`, `evolution.js`, `assets/data/modular-rsi-evolution.json` |
| Leaderboard and configuration filters | `leaderboard.html`, `leaderboard.css` |
| Leadership, student leaders, team, NTU GIFTS, partner teams and Yichen Guo contact | `teams.html`, `teams.css` |
| Shared layout, navigation and theme | `styles.css`, `site.css`, `site.js`, `theme.js` |
| Chinese translations and language control | `assets/i18n/*.zh.json`, `language.js`, `language.css` |
| Charts and mountain leaderboard | `charts.js`, `mountain.js`, `mountain.css` |
| Shared homepage and leaderboard results | `leaderboard.js`, `leaderboard-data.js`, `assets/data/paired-results.*` |

When updating translations or shared scripts, refresh the `?v=` release tag
in the HTML. `language.js` forwards its release tag to the page dictionary URL.
All eight pages load `language.js` with `20261018-branding-review`;
Home uses `20261018-subtracks` for `index.css`. Home and Leaderboard retain
`20261018-dev100-challenge` for `leaderboard.css` and `leaderboard.js`.
Leaderboard also retains that tag for `site.js` and `leaderboard-dev100.js`,
and both board entries retain it for the shared `leaderboard-board.js` import.
Data imports keep their existing tags: `20261011-release` for `leaderboard-data.js`,
`20261012-dual-board` for `leaderboard-dev100-data.js` and its JSON, and
`20260917-harness` for the Selected_1000 results JSON. `challenge.css` and `teams.css` retain `20261018-initiative`. Other asset tags remain
versioned independently in their page HTML. Strings shared by several pages,
such as the reading-route labels and scroll hints, live in `language.js`.

English is authored in the HTML. When changing English text, update the matching
normalized English key and Chinese value in that page's dictionary. Preserve
code, numerical results and source provenance unless a reviewed correction is
available. Check both languages and both themes before submitting; verify
navigation, images, chart fallbacks and language controls. Mobile layout tuning
and verification is deferred for now unless the user requests it.

同事可以直接修改对应页面的 HTML / CSS，并同步更新 `assets/i18n/` 下的中文词典。
建议每次改动单独开分支、提交 PR，说明页面和修改点；有布局调整时附一张截图。
`main` 合并后由 GitHub Pages 自动发布。

## Research content

Faculty profiles, student leaders and institutional profiles live on `teams.html`, in
this order: Leadership (Lin William Cong, Ye Luo, Liwen Zhang, alphabetically by surname), Student leaders
(Yichen Guo and Yujie Cai, with Tianyang Han listed alongside), Team (Yang Liu and
Dacheng Tao), Research institution (NTU GIFTS, which hosts the Initiative),
Collaborating partners (HKU AI-Agents Lab and Liwen Zhang’s team) and Contact.
The faculty cards carry institution labels without assigning Initiative Lead or
Co-Lead roles. The heading states the alphabetical ordering and links to the
Initiative description at NTU GIFTS. Home links to Teams rather than duplicating
the roster.
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

The Selected_1000 Results section and its chart use Historical research results, without
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
`node --test scripts/test-leaderboard.mjs scripts/test-run-card.mjs scripts/test-initiative.mjs` and
`node scripts/check.mjs`, then verify both pages in the browser.

## Initiative and Challenge

The tagline is "AI Agents for Business, Finance and Social Science" and the wordmark label
is INITIATIVE on every page; Challenge is the second item in the navigation. Home keeps
the hero, the two subtrack cards and the status list described under Homepage
presentation, and links to the Challenge page from the subtrack section and from
Get involved. `challenge.html` holds the details: the Initiative (01), the subtracks
(02), the timeline (03), the awards (04) and how to take part (05).

- **Subtrack 01** is econometric replication: the existing Dev100 set of 100 tasks,
  to be open-sourced, with the task package and rules announced with the release.
  **Subtrack 02** is professional tasks: a Finance demo (month-end close review) and
  an HR demo (training and procurement acceptance) from Prof. Liwen Zhang's team at
  SUFE. The Challenge page uses the same wording and facts as Home, and says that the
  subtrack 02 inputs, outputs, evaluation and submission rules are still to be
  confirmed.
- The Hugging Face dataset is described as the research data source; the replication
  subtrack itself will use Dev100.
- The timeline lists stages, never dates. The two planned awards are a private,
  domain-specialized dataset and prize money for AI-agent tuning solutions that rise on
  the Challenge leaderboard; amounts, eligibility and timing are marked "To be
  confirmed". Issue #23 also lists participation, completion and Top 3 awards and an
  open-source condition; those are not on the page because no rule has been given.
- Unconfirmed content is labelled "To be confirmed" or "To be announced" (a dashed
  status tag), never presented as final. `scripts/test-initiative.mjs` fails if the
  Challenge page gains a year, a calendar date or a currency amount, or if Home,
  Challenge and Teams stop agreeing on the two subtracks. Per issue #23, have Lin
  William Cong and the partner teams confirm the wording before it is published as the
  official Challenge description.

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

## Homepage agent replay video

`assets/video/agent-replay-task0001.mp4` is a silent 71-second replay
(1920×1080, 30 fps, H.264) of recorded task 0001, GPT-5.6 Sol with DeepAgents.
Five chapters follow the run: the task and its six sub-problems, four
run_python calls, the harness refusing a fifth tool call and asking for the
final program, the evaluator running that program and the scorer comparing it
with the sealed reference, and the full-replication result. Code excerpts,
outputs, token counts, timings, budgets and scores come from the run record;
only the time axis is compressed, and the captions add no new numbers.
`agent-replay-task0001-poster.jpg` is its poster frame.

The video is embedded on the homepage below the hero action buttons and before
the status updates, with a poster and native playback controls. It does not
autoplay. English and Chinese captions identify the historical single-task
demonstration, its English-only silent video and compressed timeline, and link
to `data.html#case-0001`. The existing task 0011 walkthrough remains separate.
Homepage CSS uses `20261018-subtracks`; all page
translations use `20261018-branding-review`.
The animation source and export scripts stay in the research workspace.
`scripts/check.mjs` accepts `.mp4` files under `assets/` for this video.

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
- [Yujie Cai (@caiyujie)](https://github.com/caiyujie) — Student Leader.
- [Tianyang Han](https://www.hkubs.hku.hk/people/tianyang-han/) — Student Leader (listed alongside).

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

The homepage shows only the university crests for NTU Singapore, the University
of Hong Kong and Shanghai University of Finance and Economics, all at 72px tall.
HKU and SUFE use standalone crest assets; a CSS window shows the shield from
the unchanged NTU university logo asset without its wordmark. Its GIFTS text link
remains in the introduction. Teams retains the existing college and business-school
marks. Original assets and ownership notes are recorded in
`assets/institutions/ATTRIBUTION.txt`.
Faculty profiles and institutional research profiles link their official
sources. The leadership cards are listed alphabetically by surname, without
Initiative Lead or Co-Lead designations. Institutional trademarks are not covered by code or font licenses.

## Publication

GitHub Pages serves the `main` branch root. This release copies only the reviewed
public website build and this collaboration guide. Future synchronization from
the research workspace must first incorporate changes merged here so colleagues'
edits are preserved. Never copy private research history or runtime evidence
into this public repository.

## Research framing

InferenceNet Challenge is a public series of challenges for AI agents. The
homepage introduces the Global InferenceNet Initiative through a bold inline
link, then explains the Challenge series in the same paragraph. Its Inference
Challenge section presents each specific challenge as a subtrack with its own
tasks and evaluation criteria.
Econometric replication is one subtrack. The Global InferenceNet Initiative
mission follows the [official NTU GIFTS description](https://www.ntu.edu.sg/gifts/research-and-innovation),
covering agent training, evaluation and deployment across economics, finance,
business and the social sciences. Research directions below the leaderboard cover
model–harness coupling, harness self-evolution through automated
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

Home follows five sections: Challenge subtracks and the econometric workflow,
recorded GPT-5.5 task 0011, historical research results, three research directions
and participation. The econometric replication subtrack will open-source the existing Dev100 set of 100 tasks.
Subtrack 01 is econometric replication. Subtrack 02 is professional tasks,
with finance and HR demos contributed by Prof. Liwen Zhang’s team at Shanghai
University of Finance and Economics. The finance demo concerns July month-end
close remediation and review workpapers; the HR demo concerns cold-chain
warehouse supervisor training and procurement acceptance, in a fictional
scenario. Agents produce documents and spreadsheets checked against the task's
rubric. These examples describe the supplied demos, not an open submission
channel or finalized competition protocol. The workflow below is explicitly
scoped to Subtrack 01.
The 2,644-task source corpus and historical Selected_1000 results are research
context, not the replication subtrack release size. The subtrack task package,
rules, dates and submission channel remain to be announced. Full task
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

The reading order is Definition → Industry systems → Breakdowns → Compare →
Self-evolution → InferenceNet → Update → Sources. The definition appears first,
with a direct industry-map link and optional expanded terminology/boundaries.

Section 02 (`harness.html#development`) starts with an architecture map of runnable
harnesses, systems that host or delegate to them, extensions and surrounding
infrastructure. A curated 2025–2026 timeline follows, with 2026 emphasized.
Dates refer to specific releases, papers or announcements, not uniformly to
project creation; a collapsible primary-source table records the event type.
A comparison at `#mechanisms` describes seven representative systems using the
same six mechanism dimensions. The expanded catalogue remains in this section,
with existing tab IDs and `#landscape` preserved. InferenceNet configurations
stay in section 06. Small screens can scroll wide figures horizontally.

The Harness page defines a harness, the software that runs a model as an agent,
and separates it from the model, agent, SDK, environment and evaluator; it lists
the eight things every harness decides. Its catalogue was extended on 13 October
2026 with general-purpose systems, platforms, runtime libraries and extensions.
Entries retain their role labels: platforms can host other harnesses, while
extensions depend on a host loop. Primary sources accompany the new entries.
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
page, the four Dev100 v10 configurations (DeepAgents 0.7.13, DeepSeek Harness
0.1.5rc1, Claude Agent SDK 0.2.165 and OpenAI Agents SDK 0.23.1, at
`harness.html#configurations`, with each one’s evidence scope) followed by the
historical wiring of the first DeepAgents and DeepSeek Harness arms, a dated
update and the sources, including market changes checked on 10 October 2026. The
page reports no scores; it links to the Leaderboard for Dev100 v10 results.

Section 07, "Update · 12 Oct 2026" (`harness.html#update`), retains the dated
research snapshot; the catalogue now incorporates some of those candidates.
The pinned breakdowns remain unchanged. Three tabs read
current maintainers' READMEs and named files: nine engineering projects placed by
layer (execution harness, SDK and runtime, skills and method, orchestration and
application), three tools that pair Codex with Claude Code (claudex-loop either
way, codex-plugin-cc from Claude Code, cc-plugin-codex from Codex) and four more
optimization methods (RRSI, RHO, Harness-R1 and WHALE, which also updates model
weights; Meta-Harness and Self-Harness link to the Self-evolving page). Stars and
forks are one snapshot from 12 Oct 2026, not measured performance; 23 search
candidates are coverage, not new harnesses; nothing was installed, run or
reproduced in that snapshot, and paper full texts were not read for it. Sources
remain section 08. New catalogue entries need a role and a primary source;
mechanism comparisons and deeper breakdowns are curated separately.


| Page or layer | Files |
|---|---|
| Home, research overview and resources | `index.html`, `index.css` |
| Challenge: initiative, subtracks, timeline and awards | `challenge.html`, `challenge.css`, `assets/i18n/challenge.zh.json` |
| Dataset distributions and examples | `data.html`, `data.css` |
| Agent case and evaluation | `agent.html`, `agent.css` |
| Harness: definition, system structure, selected 2025–2026 milestones, common mechanism comparison, catalogue by role, three breakdowns and InferenceNet’s four configurations | `harness.html`, `harness.css`; reuses `data.css`, `agent.css`, `evolution.css` |
| Self-evolving: concept, research map by adaptation regime, method comparison, three detailed offline cases and InferenceNet’s development study | `evolution.html`, `evolution.css`, `evolution.js`, `assets/data/modular-rsi-evolution.json` |
| Leaderboard: the Dev100 / v10 development release, then the Selected_1000 historical research results | `leaderboard.html`, `leaderboard.css` |
| Leadership, student leaders, team, NTU GIFTS, partner teams and Yichen Guo contact | `teams.html`, `teams.css` |
| Shared layout, navigation and theme | `styles.css`, `site.css`, `site.js`, `theme.js` |
| Chinese translations and language control | `assets/i18n/*.zh.json`, `language.js`, `language.css` |
| Charts and mountain leaderboard | `charts.js`, `mountain.js`, `mountain.css` |
| Shared homepage and leaderboard results | `leaderboard.js`, `leaderboard-data.js`, `assets/data/paired-results.*` |
| Shared board renderer used by both boards | `leaderboard-board.js` |
| Dev100 / v10 development release data, validation and saved table | `leaderboard-dev100.js`, `leaderboard-dev100-data.js`, `assets/data/dev100-v10-results.*`, `scripts/build-dev100-board.mjs` |

When updating translations or shared scripts, refresh the `?v=` release tag
in the HTML. `language.js` forwards its release tag to the page dictionary URL.
All eight pages load `language.js` with `20261018-branding-review`;
Home uses `20261018-subtracks` for `index.css`. Home and Leaderboard retain
`20261018-dev100-challenge` for `leaderboard.css` and `leaderboard.js`.
Leaderboard also retains that tag for `site.js` and `leaderboard-dev100.js`,
and both board entries retain it for the shared `leaderboard-board.js` import.
Data imports keep their existing tags: `20261011-release` for `leaderboard-data.js`,
`20261012-dual-board` for `leaderboard-dev100-data.js` and its JSON, and
`20260917-harness` for the Selected_1000 results JSON. `challenge.css` and `teams.css` retain `20261018-initiative`. Other asset tags remain
versioned independently in their page HTML. Strings shared by several pages,
such as the reading-route labels and scroll hints, live in `language.js`.

The Leaderboard page holds two separate boards, in this order, and the hero
navigation lists them in the same order. `#leaderboard-dev100` comes first, with
the Dev100 / v10 development release described below. `#leaderboard-selected-1000`
follows with the complete results on the historical 1,000-task study described in
this section; the old anchors (`#rankings`, `#public`, `#climb`, `#table`,
`#research`, `#protocol`) still resolve. Home shows only the Selected_1000
board, plus a news item and one link to the development release.

The econometric replication subtrack will open-source the existing Dev100 set of 100 tasks.
This scope was confirmed on 18 October 2026. The subtrack data package, official
rules, submission channel and dates have not been published. The v10 table preserves historical
development results, not official Challenge rankings. It is not directly
comparable with the Selected_1000 historical research results. It reads `assets/data/dev100-v10-results.json`, a
sanitized derivation of the v10 four-harness report: 14 models × 4 harnesses,
100 development tasks per combination, 5,600 task results. The report checksums and the derivation are in
`dev100-v10-results-provenance.json`. Task IDs, server paths and per-task
records are not published. Every score divides by all 100 tasks; scored,
failed, unknown and pending counts stay visible, and each metric reports its
own unknown-or-missing count, because 236 historical scored results recorded
Full replication only (marked †). The five metrics use the local-paper-v1
labels of the Self-evolving page. Cells mix new, inherited SDK, historical and
offline-derived results. Harness versions, thinking settings, recorded budget
caps, routes and run dates appear as distributions with not-recorded counts,
and each field states its basis: recomputed from the report's embedded records,
checked against result receipts for 5,182 runs, or taken from the study's run
notes. Metric values are not re-scored.

To update results, first verify a published JSON/CSV pair and its provenance,
then run `node scripts/build-leaderboard.mjs` to regenerate the saved table on
each page. If JavaScript or data loading fails, one combined 12-row table remains
readable on each page. For the development release, verify a new sanitized
JSON, CSV and provenance, then run `node scripts/build-dev100-board.mjs`. Check changes with
`node --test scripts/test-leaderboard.mjs scripts/test-run-card.mjs scripts/test-dev100.mjs scripts/test-dual-board.mjs scripts/test-initiative.mjs`
and `node scripts/check.mjs`, then verify both pages in the browser.
