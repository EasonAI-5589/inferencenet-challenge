import { mountBoard } from './leaderboard-board.js?v=20261012-dual-board';
import { devBoardDescriptor } from './leaderboard-dev100-data.js?v=20261012-dual-board';

// Only leaderboard.html loads this module, so a missing or malformed development
// source never reaches the Selected_1000 board or the home page.
const board = devBoardDescriptor(new URL('./assets/data/dev100-v10-results.json?v=20261012-dual-board', import.meta.url));
for (const widget of document.querySelectorAll('[data-dev-leaderboard]')) mountBoard(widget, board);
