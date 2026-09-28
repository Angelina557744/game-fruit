import { BOARD_SIZE, TILES, DEFAULT_TILE } from './config.js';
import { getBoard, isSpawned, consumeSpawned } from './state.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export const MOVE_MS = 250;
export const PULSE_MS = 160;
export const SPAWN_MS = 200;

const tiles = new Map();
let boardEl = null;

export function mountBoard(el) {
  boardEl = el;
  createCells();
}

function createCells() {
  const fragment = document.createDocumentFragment();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.setProperty('--row', r);
      cell.style.setProperty('--col', c);
      fragment.appendChild(cell);
    }
  }
  boardEl.appendChild(fragment);
}

export function renderBoard() {
  if (!boardEl) return;

  boardEl.querySelectorAll('.tile').forEach((el) => el.remove());
  tiles.clear();

  const board = getBoard();
  const fragment = document.createDocumentFragment();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const t = board[r][c];
      if (!t) continue;
      const el = createTileEl(t.value, r, c, t.id);
      if (isSpawned(t.id)) el.classList.add('tile--new');
      fragment.appendChild(el);
      tiles.set(t.id, el);
    }
  }

  boardEl.appendChild(fragment);
  consumeSpawned();
}

export function createTile(value, row, col) {
  const id = `t-${value}-${row}-${col}-${Math.random().toString(36).slice(2, 8)}`;
  return createTileEl(value, row, col, id);
}

function createTileEl(value, row, col, id) {
  const tile = document.createElement('div');
  tile.className = 'tile';
  tile.dataset.id = id;
  tile.dataset.value = value;
  tile.style.setProperty('--row', row);
  tile.style.setProperty('--col', col);

  const inner = document.createElement('div');
  inner.className = 'tile__inner';
  inner.style.background = getTileColor(value);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'tile__icon');
  svg.setAttribute('viewBox', '0 0 64 64');

  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#icon-${getTileIcon(value)}`);
  svg.appendChild(use);
  inner.appendChild(svg);
  tile.appendChild(inner);

  return tile;
}

export function getTileColor(value) {
  return (TILES[value] || DEFAULT_TILE).color;
}

export function getTileIcon(value) {
  return (TILES[value] || DEFAULT_TILE).icon;
}

export function renderMove({ moves, absorbedIds, mergedSurvivors, spawned, onDone }) {
  if (!boardEl) {
    onDone?.();
    return;
  }

  for (const m of moves) {
    const el = tiles.get(m.id);
    if (!el) continue;
    el.style.setProperty('--row', m.toR);
    el.style.setProperty('--col', m.toC);
  }

  window.setTimeout(() => {
    for (const id of absorbedIds) {
      const el = tiles.get(id);
      if (!el) continue;
      el.remove();
      tiles.delete(id);
    }

    for (const s of mergedSurvivors) {
      const el = tiles.get(s.id);
      if (!el) continue;
      el.dataset.value = s.value;
      const inner = el.querySelector('.tile__inner');
      inner.style.background = getTileColor(s.value);
      const use = inner.querySelector('use');
      if (use) use.setAttribute('href', `#icon-${getTileIcon(s.value)}`);
      inner.classList.remove('tile__inner--pulse');
      void inner.offsetWidth;
      inner.classList.add('tile__inner--pulse');
      window.setTimeout(() => inner.classList.remove('tile__inner--pulse'), PULSE_MS + 30);

      if (s.gained) {
        const gain = document.createElement('div');
        gain.className = 'tile__gain';
        gain.textContent = `+${s.gained}`;
        el.appendChild(gain);
        window.setTimeout(() => gain.remove(), 760);
      }
    }

    if (spawned) {
      const el = createTileEl(spawned.value, spawned.r, spawned.c, spawned.id);
      el.classList.add('tile--new');
      boardEl.appendChild(el);
      tiles.set(spawned.id, el);
      window.setTimeout(() => el.classList.remove('tile--new'), SPAWN_MS + 30);
    }

    window.setTimeout(() => onDone?.(), Math.max(PULSE_MS, SPAWN_MS));
  }, MOVE_MS);
}