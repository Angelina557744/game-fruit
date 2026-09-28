import { BOARD_SIZE } from './config.js';
import {
  getBoard,
  getEmptyCells,
  resetBoard,
  setTile,
  clearCell,
  getTile,
  newTile,
  getSnapshot,
  restore,
  markSpawned,
} from './state.js';
import { renderBoard, renderMove } from './render.js';
import { loadBest, saveBest, loadHints, saveHints } from './storage.js';
import { play } from './sound.js';
import { saveProgress } from './sdk.js';

const listeners = new Map();

let score = 0;
let best = loadBest();
let hints = loadHints();
let undoSnapshot = null;
let undoUsed = false;
let gameOver = false;
let locked = false;
let won = false;

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}

function emit(event, payload) {
  const set = listeners.get(event);
  if (!set) return;
  set.forEach((fn) => fn(payload));
}

export function getScore() { return score; }
export function getBest() { return best; }
export function getHints() { return hints; }
export function canUndo() { return !undoUsed && undoSnapshot !== null; }
export function isGameOver() { return gameOver; }

export function consumeHint() {
  if (hints <= 0) return false;
  hints -= 1;
  saveHints(hints);
  emit('hints', { hints });
  return true;
}

export function addHints(count) {
  hints += count;
  saveHints(hints);
  emit('hints', { hints });
  return hints;
}

export function move(direction) {
  if (locked || gameOver) return false;

  const snapshot = getSnapshot();

  const oldPositions = new Map();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const t = getTile(r, c);
      if (t) oldPositions.set(t.id, { r, c });
    }
  }

  const moves = [];
  const absorbedIds = new Set();
  const mergedSurvivors = [];
  let scoreGained = 0;
  let moved = false;
  let reachedWin = false;

  for (let i = 0; i < BOARD_SIZE; i++) {
    const cells = lineCells(direction, i);
    const lineTiles = cells.map(([r, c]) => getTile(r, c)).filter(Boolean);

    for (const [r, c] of cells) clearCell(r, c);

    const compacted = [];
    for (const tile of lineTiles) {
      const last = compacted[compacted.length - 1];
      if (last && last.value === tile.value && !last.merged) {
        last.value *= 2;
        last.absorbed = tile;
        last.merged = true;
      } else {
        compacted.push({ tile, value: tile.value, absorbed: null, merged: false });
      }
    }

    for (let k = 0; k < compacted.length; k++) {
      const item = compacted[k];
      const [r, c] = cells[k];
      const survivor = item.tile;

      survivor.value = item.value;
      setTile(r, c, survivor);

      const old = oldPositions.get(survivor.id);
      if (old.r !== r || old.c !== c) moved = true;
      moves.push({ id: survivor.id, toR: r, toC: c });

      if (item.absorbed) {
        const ab = item.absorbed;
        absorbedIds.add(ab.id);
        moves.push({ id: ab.id, toR: r, toC: c });
        mergedSurvivors.push({ id: survivor.id, value: item.value, gained: item.value });
        play('merge');
        scoreGained += item.value;
        moved = true;
        if (item.value === 2048 && !won) {
          won = true;
          reachedWin = true;
        }
      }
    }
  }

  if (!moved) {
    restore(snapshot);
    return false;
  }

  if (!undoUsed) {
    undoSnapshot = { board: snapshot, score };
  }

  score += scoreGained;
  if (score > best) {
    best = score;
    saveBest(best);
    play('record');
  }

  const spawned = spawnRandom();
  locked = true;

  emit('score', { score, best });

  renderMove({
    moves,
    absorbedIds,
    mergedSurvivors,
    spawned,
    onDone: () => {
      locked = false;
      const over = checkGameOver();
      if (over) {
        gameOver = true;
        play('gameover');
      }
      if (reachedWin) play('win');
      emit('gameover', { active: gameOver, score, best });
      saveProgress({ best, score, hints, savedAt: Date.now() }).catch(() => {});
    },
  });

  return true;
}

export function undo() {
  if (locked || !canUndo()) return;

  restore(undoSnapshot.board);
  score = undoSnapshot.score;
  undoUsed = true;
  undoSnapshot = null;
  gameOver = false;

  play('undo');
  renderBoard();
  emit('score', { score, best });
  emit('gameover', { active: false, score, best });
}

export function restart() {
  resetBoard();
  score = 0;
  undoSnapshot = null;
  undoUsed = false;
  gameOver = false;
  locked = false;
  won = false;

  spawnRandom();
  spawnRandom();
  renderBoard();

  emit('score', { score, best });
  emit('hints', { hints });
  emit('gameover', { active: false, score, best });
}

export function applyUndoReward() {
  if (!undoSnapshot) return false;
  restore(undoSnapshot.board);
  score = undoSnapshot.score;
  undoSnapshot = null;
  undoUsed = true;
  gameOver = false;
  locked = false;
  play('undo');
  renderBoard();
  emit('score', { score, best });
  emit('gameover', { active: false, score, best });
  return true;
}

export function continueAfterGameOver() {
  gameOver = false;
  locked = false;
  emit('gameover', { active: false, score, best });
  return true;
}

export function doubleScore() {
  score *= 2;
  if (score > best) {
    best = score;
    saveBest(best);
    play('record');
  }
  emit('score', { score, best });
  return true;
}

export function getHintCell() {
  const b = getBoard();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const t = b[r][c];
      if (!t) continue;
      if (c + 1 < BOARD_SIZE && b[r][c + 1] && t.value === b[r][c + 1].value) {
        return { r, c, r2: r, c2: c + 1 };
      }
      if (r + 1 < BOARD_SIZE && b[r + 1][c] && t.value === b[r + 1][c].value) {
        return { r, c, r2: r + 1, c2: c };
      }
    }
  }
  return null;
}

export function getCurrentScore() { return score; }

export function checkGameOver() {
  const board = getBoard();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const t = board[r][c];
      if (!t) return false;
      if (c + 1 < BOARD_SIZE && board[r][c + 1] && t.value === board[r][c + 1].value) return false;
      if (r + 1 < BOARD_SIZE && board[r + 1][c] && t.value === board[r + 1][c].value) return false;
    }
  }
  return true;
}

function spawnRandom() {
  const empty = getEmptyCells();
  if (!empty.length) return null;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  const tile = newTile(value);
  setTile(r, c, tile);
  markSpawned(tile.id);
  return { id: tile.id, value, r, c };
}

function lineCells(direction, index) {
  const cells = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (direction === 'left')  cells.push([index, i]);
    if (direction === 'right') cells.push([index, BOARD_SIZE - 1 - i]);
    if (direction === 'up')    cells.push([i, index]);
    if (direction === 'down')  cells.push([BOARD_SIZE - 1 - i, index]);
  }
  return cells;
}