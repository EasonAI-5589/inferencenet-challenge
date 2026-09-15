# InferenceNet Challenge

[Live website](https://easonai-5589.github.io/inferencenet-challenge/)

Public presentation site for InferenceNet: AI for econometric research. The
2026-09-15 update brings together Home, Data, Agent, Leaderboard and Demo, with
Chinese / English and light / dark controls on every page.

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
| Home, resources and teams | `index.html`, `index.css` |
| Dataset distributions and examples | `data.html`, `data.css` |
| Agent case and evaluation harness | `agent.html`, `agent.css` |
| Public leaderboard and historical internal studies | `leaderboard.html`, `leaderboard.css` |
| Guided presentation | `demo.html`, `demo.css`, `demo.js` |
| Shared layout, navigation and theme | `styles.css`, `site.css`, `site.js`, `theme.js` |
| Chinese translations and language control | `assets/i18n/*.zh.json`, `language.js`, `language.css` |
| Charts and mountain leaderboard | `charts.js`, `mountain.js`, `mountain.css` |
| Public leaderboard synchronization | `leaderboard.js`, `leaderboard-data.js`, `assets/data/` |

English is authored in the HTML. When changing English text, update the matching
normalized English key and Chinese value in that page's dictionary. Preserve
code, numerical results and source provenance unless a reviewed correction is
available. Check both languages, both themes and a narrow viewport before
submitting; verify navigation, images, chart fallbacks and demo controls.

同事可以直接修改对应页面的 HTML / CSS，并同步更新 `assets/i18n/` 下的中文词典。
建议每次改动单独开分支、提交 PR，说明页面和修改点；有布局调整时附一张截图。
`main` 合并后由 GitHub Pages 自动发布。

## Research content

The current Challenge team has two Faculty Leads, Ye Luo and Lin William Cong,
and two Project Leaders, Yichen Guo and Tianyang Han. Keep the homepage summary,
Teams cards and Chinese dictionary synchronized when updating this roster.

Challenge dates, rules, registration, prizes and competition results remain
"To be announced" until confirmed. The public Hugging Face leaderboard is the
existing research benchmark, separate from future Challenge submissions.
The internal paired studies and recorded agent case are labelled exploratory
or historical; they do not report live experiment status or official Challenge
results. Statistical definitions are stated beside the internal results.

The site describes the pinned Selected_1000 distribution, curated task examples,
a recorded GPT-5.5 trajectory, the evaluation harness and a conceptual demo.
It does not execute models or analysis. Raw datasets, private run directories,
credentials and research repository history are not part of this repository.

The Leaderboard page anonymously refreshes the public Space's `results.csv`.
A reviewed 14-entry snapshot remains available if live fetching fails or
JavaScript is disabled. Source values retain their 0–100 scale and provenance
is recorded in `assets/data/leaderboard-provenance.json`. The source does not
specify that table's sample count or evaluation date. Static charts use their
explicitly dated saved snapshot.

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
