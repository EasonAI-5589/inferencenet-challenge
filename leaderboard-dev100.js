import { mountBoard } from './leaderboard-board.js?v=20261018-dev100-challenge';
import { devBoardDescriptor } from './leaderboard-dev100-data.js?v=20261027-site';

// Only leaderboard.html loads this module; a missing or malformed source keeps
// the saved development results readable on that page.
const board = devBoardDescriptor(new URL('./assets/data/dev100-v10-results.json?v=20261012-dual-board', import.meta.url));
for (const widget of document.querySelectorAll('[data-dev-leaderboard]')) mountBoard(widget, board);
