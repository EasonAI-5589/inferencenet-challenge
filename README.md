# InferenceNet Challenge

[Live website](https://easonai-5589.github.io/inferencenet-challenge/)

Public website for InferenceNet Challenge, part of the Global InferenceNet Initiative: AI Agents for
Business, Finance and Social Science. All eight content pages share Chinese / English and
light / dark controls. The former Data and Agent URLs remain as compatibility redirects.

The primary navigation has six entries: Home, Challenge, Harness,
Self-evolving, Leaderboard and Teams. Harness is a shared resource for both subtracks. The brand logo also returns to Home.
Home’s challenge cards and demo captions link directly to the corresponding
Challenge sections (`challenge.html#subtrack-econometric` and
`challenge.html#subtrack-professional`). Initial deep links align after language
and font layout; user interaction cancels this one-time correction.
Challenge links to both subtrack pages from their descriptions in the page content:
Econometric replication (`replication.html`) and Business Analysis & Deliverables
(`professional-tasks.html`). These pages use the shared primary navigation without
a second navigation row. The primary Challenge entry marks the section on either
subtrack page. Harness and Self-evolving retain their own primary
current-page indicators.
The Self-evolving page keeps its original URL, `evolution.html`, and its anchors.
Research data is introduced within the econometric replication subtrack at
`challenge.html#replication-data`, followed by the 100-task Dev100 section and its
recorded demonstration. `data.html` redirects to that data introduction, with a
matching canonical URL and clickable fallback; it no longer has separate content
or language controls. Challenge continues to Harness in the page sequence.

## Edit the website

This repository contains the editable static files served by GitHub Pages.
No frontend framework or package installation is required.

```sh
git clone https://github.com/EasonAI-5589/inferencenet-challenge.git
cd inferencenet-challenge
```

For this shared local workspace, use the fixed preview service:

```sh
python3 /Users/user/Documents/ChatGPT/InferenceNet/research/website-preview/serve.py
```

Use only [http://127.0.0.1:4198/](http://127.0.0.1:4198/) for user-facing previews;
do not assign a new port to each branch. The service root comes from the
`/Users/user/Documents/ChatGPT/InferenceNet/research/website-preview/current`
symlink, which the main coordinating session switches to the workspace being
reviewed. It currently points to
`/Users/user/Documents/ChatGPT/InferenceNet/worktrees/website/website/home-challenges-20261018`.
If port 4198 is occupied, inspect and verify the existing service before taking
action; do not automatically choose another port or terminate another session.

Review the local preview before opening a pull request against `main`; include
the affected page links and a screenshot for visual changes.

Development and acceptance target the desktop website. As requested on
13 October 2026, mobile adaptation and mobile testing are outside the scope
of future updates unless explicitly requested again.

| Page or layer | Files |
|---|---|
| Home: two challenges, two agent demos, Initiative priorities and participation | `index.html`, `index.css` |
| Challenge: research data, Dev100 and its demo within the replication subtrack; business tasks, timeline, awards and participation | `challenge.html`, `challenge.css`, `assets/i18n/challenge.zh.json` |
| Subtrack 1 overview: econometric replication, Dev100 scope, workflow and research pages | `replication.html`, `assets/i18n/replication.zh.json`; reuses `styles.css`, `site.css` |
| Business Analysis & Deliverables: Finance and HR cases, rubric scoring and pilot evidence | `professional-tasks.html`, `professional-tasks.css`, `assets/i18n/professional-tasks.zh.json`, `assets/data/professional-tasks-pilot.json` |
| Former Data URL: compatibility redirect to Challenge's research data introduction | `data.html`; `data.css` remains available for Harness |
| Former Agent URL: redirects to improvement directions | `agent.html`; `agent.css` remains shared by Harness and Self-evolving |
| Harness: definition, system structure, selected 2025–2026 milestones, common mechanism comparison, catalogue by role, three breakdowns and InferenceNet’s four configurations | `harness.html`, `harness.css`; reuses `data.css`, `agent.css`, `evolution.css` |
| Self-evolving: capability questions, model training and co-evolution directions, concept, research map by adaptation regime, method comparison, three detailed offline cases and InferenceNet’s development study | `evolution.html`, `evolution.css`, `evolution.js`, `assets/data/modular-rsi-evolution.json` |
| Leaderboard: the Dev100 / v10 development release | `leaderboard.html`, `leaderboard.css` |
| About NTU GIFTS, leadership, student leaders and contributors, partner teams and Yichen Guo contact | `teams.html`, `teams.css` |
| Shared layout, navigation and theme | `styles.css`, `site.css`, `site.js`, `theme.js` |
| Chinese translations and language control | `assets/i18n/*.zh.json`, `language.js`, `language.css` |
| Charts and mountain leaderboard | `charts.js`, `mountain.js`, `mountain.css` |
| Historical results retained for validation, not mounted on public pages | `leaderboard.js`, `leaderboard-data.js`, `assets/data/paired-results.*` |
| Shared renderer for Dev100 and historical-data tests | `leaderboard-board.js` |
| Dev100 / v10 development release data, validation and saved table | `leaderboard-dev100.js`, `leaderboard-dev100-data.js`, `assets/data/dev100-v10-results.*`, `scripts/build-dev100-board.mjs` |

When updating translations or shared scripts, refresh the `?v=` release tag
in the HTML. `language.js` forwards its release tag to the page dictionary URL.
All eight content pages load `styles.css` and `site.css` with `20261018-shared-nav`, and
`language.js` with `20261019-agent-directions`. Evolution CSS uses the same tag.
Home presents both challenges with the same workflow, difficulty, deliverable and
independent-evaluation structure, followed by two concrete descriptions of the work. The base stylesheet carries the same
versioned reference on every page, so preview navigation does not reuse the earlier
unversioned base-style URL. `challenge.css` uses `20261019-data-in-challenge`.
Home uses `20261019-aims-grid`
for `index.css` and loads no leaderboard assets. Leaderboard retains
`20261018-dev100-challenge` for `leaderboard.css` and `site.js`; its Dev100 entry
and `leaderboard-dev100-data.js` import use `20261018-home-challenges`.
Both board entries retain `20261018-dev100-challenge` for the shared
`leaderboard-board.js` import.
Data imports keep their existing tags: `20261011-release` for `leaderboard-data.js`,
`20261012-dual-board` for the Dev100 results JSON, and
`20260917-harness` for the Selected_1000 results JSON. `teams.css` retains `20261018-initiative`. Other asset tags remain
versioned independently in their page HTML. Strings shared by several pages,
such as the reading-route labels and scroll hints, live in `language.js`.

English is authored in the HTML. When changing English text, update the matching
normalized English key and Chinese value in that page's dictionary. Preserve
code, numerical results and source provenance unless a reviewed correction is
available. Check both languages and both themes before submitting; verify
navigation, images, chart fallbacks and language controls. Mobile layout tuning
and verification is deferred for now unless the user requests it.

同事可以直接修改对应页面的 HTML / CSS，并同步更新 `assets/i18n/` 下的中文词典。
建议每次改动单独开分支，先一起看本地预览，再提交 PR；说明页面和修改点，有布局调整时附一张截图。
`main` 合并后由 GitHub Pages 自动发布。

## Research content

### Business Analysis & Deliverables

Both challenges use agent workflows: econometric replication checks reproduced
statistics, while business analysis checks editable professional deliverables.
Home and Challenge name the second challenge Business Analysis & Deliverables
and link to `professional-tasks.html`.
Home's `#subtracks` alias remains within the existing `#overview` section.
The business page uses the shared six-entry navigation and is registered for
publication, static checks and translation. Its CSS is explicitly published;
its Chinese dictionary and curated pilot JSON pass through the reviewed asset
tree and the same public-file boundary checks.

The supplied tasks are FIN-T1-003 (55 input files, 25 graded criteria including
five penalties, plus two gates) and HR-T3-114 (17 input files, 34 binary criteria
including six penalties, no gates). Finance combines public references and
synthetic business records; HR uses synthetic materials. Both ask for editable
Word and Excel deliverables. The workflow separates planning, tool execution,
checking and revision from independent evaluation after submission; the diagram
does not claim that pilot agents completed every intended check.

`assets/data/professional-tasks-pilot.json` is the curated evidence source: two
reference evaluations and one Claude Code / qwen3.7-max run per task on
18 October 2026. It records task checksums and result/reward hashes without
publishing private paths, source task materials, deliverables or conversation
exports. Task-specific reward uses a 0–1 scale, separately from replication
accuracy. The page discloses the two judges, the Finance judge override, HR
reference calibration issues, and unavailable scoring versus a genuine zero.
These four observations are a pilot, not official Challenge rankings or a
general performance estimate. Task release, final rules and submissions remain
to be announced; only reviewed summaries belong in the public website.

Institutional profiles, faculty profiles, student leaders and contributors live on `teams.html`, in
this order: About NTU GIFTS (the institute that hosts the Initiative), Leadership (Lin William Cong, Ye Luo,
Liwen Zhang, alphabetically by surname), Student leaders (Yichen Guo and Yujie Cai, followed by one
Contributors row: Tianyang Han, Binling Jiang, Hao Jiang, Renyuan Li, Jiajie Xu and Wei Zhang,
alphabetically by surname), Collaborating partners (HKU AI-Agents Lab and Liwen Zhang’s team) and Contact.
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

The repository preserves the historical six-model release merged in
[HF PR #4](https://huggingface.co/spaces/CamoAiLab/InferenceNet-Leaderboard/discussions/4).
The source JSON and CSV are preserved in `assets/data/paired-results.*`; the
release commit and checksum are in `paired-results-provenance.json`. Its renderer
uses **Gemini 3.1 Pro**; the archived model ID and source name remain
unchanged for traceability. These are
12 groups with 1,000 tasks each. Failed, unknown and invalid records remain in
the denominator. Historical protocols differ across models, and official
scorer parity remains unverified.

Home and Leaderboard no longer display or load this historical board. The data,
provenance, ranking functions and shared renderer tests remain available for
regression checks. The historical snapshot keeps `local-paper-v1` for full
replication and `hf-leaderboard-v1` for its other four metrics; removing its page
presentation does not rescore it or change its 1,000-task denominators.
Tests still cover all 12 configurations, configuration filters, score ordering,
evidence cards, invalid records and independent renderer state.

`scripts/build-leaderboard.mjs` is now a read-only historical validator. It does
not generate public HTML. Use `scripts/build-dev100-board.mjs` for the active
Dev100 leaderboard, after verifying its JSON, CSV and provenance. The retained
historical checks run with `node --test scripts/test-leaderboard.mjs scripts/test-run-card.mjs`.

## Initiative and Challenge

The tagline is "AI Agents for Business, Finance and Social Science" and the wordmark label
is CHALLENGE on every page; Home is the first navigation item and Challenge is
the second. Home keeps
the hero, the two challenge cards and the status list described under Homepage
presentation, and links to the Challenge page from the subtrack section and from
Get involved. After its hero, `challenge.html` goes directly to the subtracks (01),
followed by the timeline (02), awards (03) and how to take part (04).

- **Subtrack 01** is econometric replication: the existing Dev100 set of 100 tasks,
  to be open-sourced, with the task package and rules announced with the release.
  **Subtrack 02** is Business Analysis & Deliverables: a Finance demo (month-end close review) and
  an HR demo (training and procurement acceptance) from Prof. Liwen Zhang's team at
  SUFE. Home labels these Challenge 1 and Challenge 2. The Challenge page keeps the
  same scope and facts, and says once that the official task set for subtrack 02 is
  to be announced.
- **Each challenge has its own recorded run on the Challenge page**: one video for
  Subtrack 01 (`agent-replay-task0001.mp4`, research task 0001) and two for
  Subtrack 02 (`finance-story-demo.mp4`, FIN-T1-003, and `hr-agent-replay.mp4`,
  HR-T3-114). All use posters, native controls, `preload="metadata"`, no autoplay and
  a download link as fallback. The first two are the same bytes as on Home and the
  business page. Finance and HR now use narrated five-chapter replays with the
  same model/harness/sandbox/judge roles as the PR #27 reference. Their source
  records and scores are unchanged. Task 0001 is shown as a research-dataset task and is
  not claimed to belong to Dev100.
- The Hugging Face dataset is described as the research data source; the replication
  subtrack itself will use Dev100. The subtrack introduces the research data and
  links to the Hugging Face dataset before presenting Dev100's 100 tasks, input,
  output and evaluation, then the recorded task 0001 demonstration. The source
  dataset, historical Selected_1000 research subset and Dev100 are distinct scopes;
  the demonstration is not presented as a confirmed Dev100 task.
  Detailed dataset materials and task records link to Hugging Face. The retired
  Data page's source HTML is retained in the migration audit's before snapshot;
  this website change does not modify the Hugging Face repository or frozen
  benchmark data. `data.css` remains because Harness still uses it.
- The draft timeline has five stages: release, registration and access, the
  challenge window, independent evaluation, and results and awards. Release is
  planned for November 2026, with an approximately three-month challenge window.
  The exact start and end dates, registration, evaluation interface, submission
  process, evaluation schedule and protocol, and result announcement remain TBD.
- Award categories, prizes and selection criteria are TBD; the page makes no
  commitment to private dataset access or cash prizes. Tests preserve these
  boundaries while allowing the proposed month and
  approximate duration, and continue to check videos and cross-page consistency.
- Challenge participation follows the same six routes as Home: explore a
  challenge, propose a new challenge, build an agent, contribute tasks and data,
  improve evaluation, and study training and improvement. Both languages reuse
  the Home descriptions and destinations; the first link goes to this page's
  `#tracks`. Research dataset links remain in Home's resources and the replication
  subtrack's data introduction.
  The six routes use three columns on wide screens and two on narrower desktop
  windows, with the existing single-column arrangement retained for small screens.
- The proposed schedule was drafted on 19 October 2026. November 2026 remains a
  tentative launch month; exact dates, evaluation access and award details remain
  TBD as stated on the Challenge page.

## Agent improvement directions

The standalone Agent walkthrough has been retired. `agent.html`, including old
fragment links, redirects to `evolution.html#improvement-directions` with a canonical
link and a clickable fallback. The Self-evolving page retains the three capability
questions: statistical reasoning, data interpretation and feature construction.
It connects them to model training and model–harness co-evolution as research
directions. Existing v1/v2 results still describe fixed-model harness changes.
The previous Agent page's task 0011 and failure trace remain in Git history; the
Challenge's task 0001 video is a different recorded run. Links to demonstrations
now go directly to `challenge.html#replication-demo`. Shared `agent.css` and source
assets are retained for other pages and provenance.

## Homepage agent demos

`assets/video/agent-replay-task0001.mp4` is the 285.267-second narrated walkthrough
(1920×1080, 30 fps, H.264/AAC) of recorded task 0001, GPT-5.6 Sol with DeepAgents,
from PR #27 at `c0b9abdd`. It includes English synthetic narration, burned-in
English/Chinese captions and graphical execution-flow guidance. Four interactive
run_python calls execute; a fifth requested call is refused by the budget gate.
The final program is executed and checked separately by the independent evaluator.
No new model evaluation was run. The recorded run took 121.038 seconds; the
edited explanatory video lasts 285.267 seconds.
`agent-replay-task0001-poster.jpg` is its poster frame. Public provenance,
checksums, chapter times and SRT captions are in `docs/video/task0001/`.
Home and Challenge load this video and poster with `20261018-deepagents-flow-v3-2`.
The Challenge dictionary uses `20261018-challenge-pr27` for its updated caption;
other pages keep their existing translation release tags.

The homepage's Agent demonstrations section (`#tasks`) presents two demos side by side
on desktop: the econometric replay above and `assets/video/finance-story-demo.mp4`
for Business Analysis & Deliverables. Both reuse existing video files, with
posters, native playback controls, no autoplay and links to their respective
sections on the Challenge page (`#subtrack-econometric` and
`#subtrack-professional`). The finance
video is shared with the business task page; this presentation adds no new video assets,
task data or evaluation results. The homepage omits replay production details;
the retired task 0011 walkthrough remains available in Git history. Homepage CSS uses
`20261019-aims-grid`; translations use
`20261018-challenge-videos`.
The animation source and export scripts stay in the research workspace.
`scripts/check.mjs` accepts `.mp4` files under `assets/` for these videos.

## Business analysis narrated demos

Finance (`finance-story-demo.mp4`) is 294.866 seconds (4 min 55 s); HR
(`hr-agent-replay.mp4`) is 245.433 seconds (4 min 05 s). Both are 1920×1080, 30 fps
H.264 High / AAC 48 kHz mono (BT.709) with English narration in `en-US-AriaNeural`, the
voice of the approved PR #27 replay requested at +12 % to match its 1.12 pace, and burned
English / Chinese captions. They use the PR #27 layout and chapters (TASK → AGENT →
HARNESS → CHECK → RESULT): the task card, the agent's own TodoWrite plan, the run ledger
(requests, tool calls by type, output tokens, latest prompt size), findings and
`/app/output` stay on screen while a pixel guide points at what the narration describes.

The AGENT chapter follows the recorded requests. Request numbers are the 28 assistant
message ids of each Claude Code session log, so the replay shows what one request carried:
Finance request 4 and HR request 2 send 4 and 8 parallel Bash calls; TodoWrite is handled
by Claude Code without a shell; HR's analysis script is saved with the Write tool and
changed with Read / Edit. Claude Code and Bash run inside the task's Docker container; the
model is reached through an API.

Finance (34 shots): six unposted entries in the register; a `.docx` read with `cat`
returns ZIP bytes, so request 3 switches to python-docx; the swap valuations for 30 June
and 31 July; the workbook; the recorded `NameError` that crashed before the save; the
read-back, the model's own statement of the cause, the re-run and the 39-row check; then
the whole-run trace, prompt growth from 26,560 to 99,752 tokens and the handoff. CHECK
shows DV01 (copied from sheet 16, recomputed by the judge), D02 (red line G2 clear,
R51 = 0.5) and zero formulas (R19). Reward 0.332849 = 57.25 / 172.

HR (28 shots, fictional task): eight parallel previews; the data-use rule; one
19,223-token response that writes a 1,336-line script; a clean first run that labels WP-A
“验收通过” while retaining 10 %; the model's review of its own output, two checks, two
Reads, four Edits and a re-run that makes WP-A “附条件验收”. No tool call failed. CHECK
shows R20 met, pooled rather than per-site comparisons (R14–R16), no source index
(R1, R19) and penalty R32: all ten people with too few opportunities were marked as not
meeting the standard (−7 raw weighted points). Reward 0.207547 = (29 − 7) / 106.

Commands, outputs, file names, counts and scores come from the recorded runs
(`research/benchmark-expansion-finance-hr-20261018/video/data/*.json` and the Claude
Code session logs); nothing was re-run or re-scored. Shot lengths follow the narration,
so the replay is time-compressed; the header clock shows the recorded agent time. The
rewards are pilot rubric scores, not accuracy rates, rankings or general model performance.

Home and the professional task page share Finance's media; Challenge embeds both. All
media URLs use `?v=20261019-claude-relay-v2`, native controls, metadata preload, posters
and download fallbacks. `docs/video/finance/` and `docs/video/hr/` hold the three SRT
variants, generated from the same storyboard text that was synthesised, and
`provenance.json` (streams, chapters, every shot with its narration, file and source
hashes). The editable source (offline Skia renderer, scenes, storyboards, voice, render
and package scripts) is in `research/sufe-video-claude-relay-20261018/` and stays outside
the website; the edition it replaced is backed up in that directory's `site-before-relay/`.

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

## Contributors

Listed alphabetically by surname.

- [Tianyang Han](https://www.hkubs.hku.hk/people/tianyang-han/)
- Binling Jiang
- Hao Jiang
- Renyuan Li
- Jiajie Xu
- Wei Zhang

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

The homepage shows the university crests for NTU Singapore, the University of
Hong Kong and Shanghai University of Finance and Economics in a transparent,
borderless row below the hero buttons. Each crest is 72px tall, with no university
wordmark. HKU uses its standalone crest; a CSS window shows the shield from the
unchanged NTU university logo asset. SUFE uses the alpha channel of the official
transparent asset, `assets/institutions/sufe-university-transparent-official.png`,
as a CSS mask filled with `#811c21`; this color stays the same in light and dark
themes. The GIFTS text link remains in the introduction. Teams retains the
existing college and business-school marks. Original assets and ownership notes
are recorded in `assets/institutions/ATTRIBUTION.txt`.
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
homepage keeps InferenceNet Challenge as its main title. The hero first introduces
the Global InferenceNet Initiative’s vision of shared infrastructure, then describes
how the Challenge advances it through an open-source community, challenging
problems, and a standard framework for model training and evaluation. The Initiative
name links to the official NTU GIFTS description. Its Inference
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

Home follows four sections: Inference Challenge (`#overview`), Agent demonstrations
(`#tasks`), Our aims (`#initiative`) and Get involved (`#participate`). Its two cards
explain each challenge's task, deliverable and evaluation. Both challenges use
agent workflows; their goals, outputs and evaluation criteria distinguish them.
Challenge 1 is econometric replication and will open-source the existing Dev100
set of 100 tasks. Challenge 2 is Business Analysis & Deliverables,
with finance and HR demos contributed by Prof. Liwen Zhang’s team at Shanghai
University of Finance and Economics. The finance demo concerns July month-end
close remediation and review workpapers; the HR demo concerns cold-chain
warehouse supervisor training and procurement acceptance, in a fictional
scenario. Agents produce documents and spreadsheets checked against the task's
rubric. These examples describe the supplied demos, not an open submission
channel or finalized competition protocol. Two desktop demos in Agent demonstrations
illustrate the econometric and business workflows, each with its subtrack entry.
Home has no results table and does not load
leaderboard scripts, leaderboard CSS or mountain CSS; it links to the Dev100
results page instead.
Task packages, rules, exact dates and submission channels remain to be announced.
Challenge introduces the replication data and links to its Hugging Face source;
Home's dataset versions and provenance link also opens that source. Capability
questions from the retired Agent page now introduce the Self-evolving research directions. The status list links the business task preview, the Dev100
open-source scope confirmed on 18 Oct 2026 and the development report generated
at `2026-10-11T16:35:49Z`. These updates do not imply that competition submissions
are open or that pilot and development scores are official Challenge rankings.
The Our aims section presents four numbered cards describing the Challenge’s
contribution to the Initiative: an
open-source community, challenging problems, a standard evaluation framework,
and model training and improvement. The fourth links to training and improvement
research on the Leaderboard page; it describes research aims, not a released
training product. Its navigation uses `#initiative`; the previous `#harness` anchor remains
available. Technical research stays on the Harness and Self-evolving pages. Get involved
offers six routes: explore a challenge, propose a new challenge, build an agent,
contribute tasks and data, improve evaluation, and study training and improvement.
The status list separates dates, headings, descriptions and links; its date column
fits translated labels without overlapping the copy. Research resources and
citations follow below.

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

## Dev100 leaderboard

The Leaderboard page holds only the Dev100 / v10 development release at
`#leaderboard-dev100`, followed by its report, methodology and research
directions. Home has no board and links to these Dev100 results. The removed
historical board's old anchors are not public navigation targets; in-site links
point to Dev100 or to `#research` where appropriate.

The econometric replication subtrack will open-source the existing Dev100 set of 100 tasks.
This scope was confirmed on 18 October 2026. The subtrack data package, official
rules, submission channel and dates have not been published. The v10 table preserves historical
development results, not official Challenge rankings. It reads `assets/data/dev100-v10-results.json`, a
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

To update the development release, verify a new sanitized JSON, CSV and
provenance, then run `node scripts/build-dev100-board.mjs`. If JavaScript or data
loading fails, the saved Dev100 table and report remain readable on Leaderboard.
The historical validator does not publish a table. Check changes with
`node --test scripts/test-leaderboard.mjs scripts/test-run-card.mjs scripts/test-dev100.mjs scripts/test-dual-board.mjs scripts/test-initiative.mjs`
and `node scripts/check.mjs`, then review Home and Leaderboard in the local browser
before opening a pull request.
