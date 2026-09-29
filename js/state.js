import { BOARD_SIZE } from './config.js';

let board = createEmpty();
let nextId = 1;
const spawnedIds = new Set();

function createEmpty() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

export function newTile(value) {
  return { id: nextId++, value };
}

export function getBoard() { return board; }
export function getTile(r, c) { return board[r][c]; }
export function setTile(r, c, tile) { board[r][c] = tile; }
export function clearCell(r, c) { board[r][c] = null; }

export function getEmptyCells() {
  const cells = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!board[r][c]) cells.push([r, c]);
    }
  }
  return cells;
}

export function resetBoard() {
  board = createEmpty();
  spawnedIds.clear();
}

export function getSnapshot() {
  return board.map((row) => row.map((t) => (t ? { id: t.id, value: t.value } : null)));
}

export function restore(snapshot) {
  board = snapshot.map((row) => row.map((t) => (t ? { id: t.id, value: t.value } : null)));
  spawnedIds.clear();
}

export function markSpawned(id) { spawnedIds.add(id); }
export function isSpawned(id) { return spawnedIds.has(id); }
export function consumeSpawned() { spawnedIds.clear(); }


export function removeTilesByPredicate(predicate) {
  const removed = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const t = board[r][c];
      if (t && predicate(t)) {
        board[r][c] = null;
        removed.push({ id: t.id, value: t.value, r, c });
      }
    }
  }
  return removed;
}