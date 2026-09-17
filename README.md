# InferenceNet Challenge

[Live website](https://easonai-5589.github.io/inferencenet-challenge/)

Public presentation site for InferenceNet: AI for econometric research. The
site brings together Home, Data, Agent, Leaderboard and Teams, with
Chinese / English and light / dark controls on every page.
The five page links are visible by default, including the three-column menu on
narrow screens. Visitors can collapse it manually; each new page opens it again.

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
| Agent case and evaluation harness | `agent.html`, `agent.css` |
| Leaderboard and configuration filters | `leaderboard.html`, `leaderboard.css` |
| Team, institutions and Yichen Guo contact | `teams.html`, `teams.css` |
| Shared layout, navigation and theme | `styles.css`, `site.css`, `site.js`, `theme.js` |
| Chinese translations and language control | `assets/i18n/*.zh.json`, `language.js`, `language.css` |
| Charts and mountain leaderboard | `charts.js`, `mountain.js`, `mountain.css` |
| Shared homepage and leaderboard results | `leaderboard.js`, `leaderboard-data.js`, `assets/data/paired-results.*` |

When updating translations or shared scripts, refresh the `?v=` release tag
in the HTML. `language.js` forwards its release tag to the page dictionary URL;
Home uses CSS and language release tag `20260917-home`; the other four pages
use language release tag `20260917-no-demo`. Home and Leaderboard retain ranking
release tag `20260917-harness`. Shared navigation
CSS/JS use `20260915-menu`.

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
a recorded GPT-5.5 trajectory and the evaluation harness.
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
readable on each page. Check changes with `node --test scripts/test-leaderboard.mjs`
and `node scripts/check.mjs`, then verify both pages in the browser.

## Agent case walkthrough

The Agent page follows recorded GPT-5.5 task 0011: the input table, the
single-generation program and its month-column error, the three DeepAgents
tool executions, and the independently replayed result. Code excerpts and
returned evidence sit beside each step; the original prompt, programs and
trace remain in a collapsed record. Both languages distinguish the full
4,550-row, 38-column file, the 984-row time window and the 977 observations
used for regression. The same-task link opens `data.html#case-0011`, whose
case card repeats this data context. Interaction budgets remain explicit.
Agent CSS uses release tag `20260917-case-data`; its dictionary uses
`20260917-no-demo`.

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
distillation and reinforcement learning). These are research aims, not claims
that an automatic optimization system or training dataset is already available.
Current evaluation settings and source records remain in expandable protocol
notes. An agent denotes the model operating within a harness.

Terminology references: [agent evaluation](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents),
[automatic harness optimization](https://arxiv.org/abs/2608.23041),
and [trajectory-based reinforcement learning](https://arxiv.org/abs/2508.03680).

## Homepage presentation

Home follows five sections: the benchmark workflow, recorded GPT-5.5 task 0011,
the shared leaderboard, three research directions and participation. Full task
coverage and provenance remain on Data; the detailed execution trace remains
on Agent. The homepage keeps one current update and one announcement about
future challenge rules, dates and submissions. Resources and citations remain
available below the contact entry point.
