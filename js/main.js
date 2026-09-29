import { mountBoard } from './render.js';
import {
  restart, move, undo, on, canUndoFree, canUndoPaid,
  applyUndoReward, continueAfterGameOver, doubleScore,
  getHintCell, getHints, consumeHint, addHints,
} from './game.js';
import { initInput } from './input.js';
import {
  init as initSdk,
  loadProgress,
  showRewarded,
  showInterstitial,
  syncStickyBanner,
  submitScore,
  fetchLeaderboard,
  hasLeaderboards,
} from './sdk.js';
import { play, startBg, isBgStarted } from './sound.js';
import { loadBest } from './storage.js';
import { t } from './locales.js';

const boardEl = document.getElementById('board');
mountBoard(boardEl);

const scoreEl = document.querySelector('[data-score="current"]');
const bestEl = document.querySelector('[data-score="best"]');
const undoBtn = document.querySelector('[data-action="undo"]');
const overlay = document.querySelector('.overlay');
const overlayScore = document.querySelector('[data-overlay-score]');
const recordsEl = document.getElementById('records');
const recordsList = document.querySelector('[data-records-list]');
const hintCountEl = document.querySelector('[data-hint-count]');
const hintModal = document.getElementById('hint-modal');

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  document.title = t('title');
  const titleEl = document.querySelector('.game__title');
  if (titleEl) titleEl.textContent = t('title');
}

function updateScoreUI({ score, best }) {
  if (scoreEl) scoreEl.textContent = score;
  if (bestEl) bestEl.textContent = best;
  if (undoBtn) undoBtn.disabled = !(canUndoFree() || canUndoPaid());
}

function updateHintsUI({ hints }) {
  if (hintCountEl) hintCountEl.textContent = hints;
}

function updateOverlay({ active, score }) {
  if (!overlay) return;
  overlay.classList.toggle('overlay--visible', active);
  overlay.setAttribute('aria-hidden', String(!active));
  if (active && overlayScore) overlayScore.textContent = score;
}

function setRecordsVisible(v) {
  if (!recordsEl) return;
  recordsEl.classList.toggle('records--visible', v);
  recordsEl.setAttribute('aria-hidden', String(!v));
}

function setHintModalVisible(v) {
  if (!hintModal) return;
  hintModal.classList.toggle('modal--visible', v);
  hintModal.setAttribute('aria-hidden', String(!v));
}

on('score', updateScoreUI);
on('hints', updateHintsUI);
on('gameover', async (state) => {
  updateOverlay(state);
  if (state.active) {
    await submitScore(state.score);
  }
});

function renderRecordsList(entries) {
  if (!recordsList) return;
  if (entries && entries.length) {
    recordsList.innerHTML = entries.map((e) => {
      const name = (e.player && (e.player.publicName || t('player'))) || t('player');
      const score = e.score != null ? e.score : 0;
      return `<li class="records__item"><span class="records__name">${name}</span><span class="records__score">${score}</span></li>`;
    }).join('');
    return;
  }
  const local = loadBest();
  if (local > 0) {
    recordsList.innerHTML = `
      <li class="records__item">
        <span class="records__name">${t('you')}</span>
        <span class="records__score">${local}</span>
      </li>
      <li class="records__empty">${t('leaderboardUnavailable')}</li>
    `;
  } else {
    recordsList.innerHTML = `<li class="records__empty">${t('noResults')}</li>`;
  }
}

function highlightHint(hint) {
  if (!hint) return;
  play('hint');
  document.querySelectorAll('.tile').forEach((el) => {
    const r = Number(el.style.getPropertyValue('--row'));
    const c = Number(el.style.getPropertyValue('--col'));
    if ((r === hint.r && c === hint.c) || (r === hint.r2 && c === hint.c2)) {
      el.classList.add('tile--hint');
      setTimeout(() => el.classList.remove('tile--hint'), 1500);
    }
  });
}

async function useHint() {
  const hint = getHintCell();
  if (!hint) return;
  if (getHints() > 0) {
    consumeHint();
    highlightHint(hint);
    return;
  }
  setHintModalVisible(true);
}

async function watchAdForHints() {
  setHintModalVisible(false);
  await showRewarded({
    onReward: () => {
      addHints(2);
      const hint = getHintCell();
      if (hint) {
        consumeHint();
        highlightHint(hint);
      }
    },
  });
}

function bindButtons() {
  document.querySelectorAll('[data-action="undo"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (canUndoFree()) { undo(); return; }
      if (canUndoPaid()) {
        await showRewarded({ onReward: applyUndoReward });
      }
    });
  });

  document.querySelectorAll('[data-action="restart"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await showInterstitial();
      restart();
    });
  });

  document.querySelectorAll('[data-action="hint"]').forEach((btn) => {
    btn.addEventListener('click', useHint);
  });

  document.querySelectorAll('[data-action="hint-watch"]').forEach((btn) => {
    btn.addEventListener('click', watchAdForHints);
  });

  document.querySelectorAll('[data-action="hint-close"]').forEach((btn) => {
    btn.addEventListener('click', () => setHintModalVisible(false));
  });

  document.querySelectorAll('[data-action="continue"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await showRewarded({
        onReward: () => {
          continueAfterGameOver();
          play('merge');
        },
      });
    });
  });

  document.querySelectorAll('[data-action="double"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await showRewarded({ onReward: doubleScore });
    });
  });

  document.querySelectorAll('[data-action="records"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      setRecordsVisible(true);
      if (!recordsList) return;
      recordsList.innerHTML = `<li class="records__loading">${t('loading')}</li>`;
      let entries = null;
      if (hasLeaderboards()) {
        entries = await fetchLeaderboard();
      }
      renderRecordsList(entries);
    });
  });

  document.querySelectorAll('[data-action="records-close"]').forEach((btn) => {
    btn.addEventListener('click', () => setRecordsVisible(false));
  });
}

function bindButtonSound() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('.btn')) play('button');
  });
}

async function bootstrap() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (e) {
      console.warn('[sw] registration failed', e);
    }
  }

  const sdk = await initSdk();
  applyTranslations();

  if (sdk) {
    const saved = await loadProgress();
    if (saved && typeof saved.best === 'number') {
      bestEl.textContent = saved.best;
    }
    syncStickyBanner();
    window.addEventListener('resize', syncStickyBanner);
  }

  const armBg = () => { if (!isBgStarted()) startBg(); };
  window.addEventListener('pointerdown', armBg, { once: true });
  window.addEventListener('keydown', armBg, { once: true });

  initInput({
    onMove: (dir) => {
      const played = move(dir);
      if (played) play('move');
    },
  });

  bindButtonSound();
  bindButtons();
  restart();
}

bootstrap();