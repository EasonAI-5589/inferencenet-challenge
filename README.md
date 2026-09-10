# InferenceNet Challenge

Public website for the InferenceNet Challenge: AI for empirical research.

This repository contains only public static website files. The research workspace and editable source remain in the private NTU-GIFTS-InferenceNet repository. Challenge dates, rules, registration and competition results will be added as confirmed. The displayed Hugging Face leaderboard is the existing research benchmark, separate from future Challenge results. The page lists NTU CCDS, Nanyang Business School and HKU Business School, with official school logos and the faculty leadership of the Global InferenceNet Initiative: Ye Luo, Lin William Cong, Yang Liu and Dacheng Tao, as listed by NTU GIFTS.

## Research examples

Two published examples from the MetricsAI paper are summarized with explanatory
pseudocode, input roles and conceptual diagrams. They are research examples, not
official Challenge tasks or executable solutions. JSON values are placeholders.

## Design and assets

The initial layout and manual light/dark theme follow the project owner's WorldEcho/WorldSync page, SiriYep/worldecho-worldsync-project-page, commit bfaaf07. The current design uses standard sans-serif headings and compact academic-project sections. The theme module was adapted with a separate preference key. WorldEcho scientific figures, authors and results were not reused.

Inter and Space Mono fonts are distributed under the SIL Open Font License; the notices are in assets/fonts/.

The unmodified MetricsAI workflow (Figure 1, Chen et al., arXiv:2506.00856v3) is
reproduced for this academic introduction under CC BY-NC-ND 4.0. Full source,
authorship, license and original hash are in assets/figures/ATTRIBUTION.txt.

The original official CCDS, NBS and HKU Business School logos retain their colors
and aspect ratios on white plates in both themes. Source URLs, ownership and
original hashes are in assets/institutions/ATTRIBUTION.txt. Institutional marks
belong to their respective owners and are not covered by code or font licenses.

## Leaderboard data

The public Hugging Face results.csv is fetched anonymously on page load and
manual refresh. A reviewed 14-entry snapshot is shown immediately and remains
available if the source is unavailable or JavaScript is disabled. All four
published metrics retain their 0–100 scale, with one-decimal percentage display;
Partial Replication is the default descending sort. Capture time and source-file
provenance are retained in assets/data/leaderboard-provenance.json. The source
does not specify the sample denominator or evaluation date for this table.

## Publication

GitHub Pages serves the main branch root. Updates contain only the checked public output from website/dist in the source workspace, never private research files or Git history.
