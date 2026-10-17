import { mountBoard, selectedBoardDescriptor } from './leaderboard-board.js?v=20261018-dev100-challenge';

// Home and Leaderboard show the Selected_1000 board from the same saved release.
const board = selectedBoardDescriptor(new URL('./assets/data/paired-results.json?v=20260917-harness', import.meta.url));
for (const widget of document.querySelectorAll('[data-paired-leaderboard]')) mountBoard(widget, board);
