import { pauseAll, resumeAll } from './sound.js';

const LEADERBOARD = 'fruit2048';
const SAVE_KEY = 'progress';
const INTERSTITIAL_COOLDOWN = 120000;

let ysdk = null;
let player = null;
let leaderboards = null;
let lastInterstitialAt = 0;
let ready = false;

function onPlatform() {
  return typeof window.YandexGamesSDKEnvironment !== 'undefined';
}

export function isReady() { return ready; }
export function hasPlayer() { return !!player; }
export function hasLeaderboards() { return !!leaderboards; }

import { setLang } from './locales.js';

export async function init() {
  try {
    if (typeof YaGames === 'undefined') return null;
    ysdk = await YaGames.init();

    try {
      const lang = ysdk.environment && ysdk.environment.i18n && ysdk.environment.i18n.lang;
      if (lang) setLang(lang);
    } catch {}

    try {
      ysdk.on('game_api_pause', pauseAll);
      ysdk.on('game_api_resume', resumeAll);
    } catch {}

    try {
      player = await ysdk.getPlayer({ scopes: false });
    } catch (e) {
      player = null;
    }

    try {
      const ok = await ysdk.isAvailableMethod('leaderboards.setScore');
      leaderboards = ok ? ysdk.leaderboards : null;
    } catch {
      leaderboards = null;
    }

    try {
      if (ysdk.features && ysdk.features.LoadingAPI) {
        ysdk.features.LoadingAPI.ready();
      }
    } catch {}

    ready = true;
    return ysdk;
  } catch (e) {
    console.warn('[sdk] init failed', e);
    ready = false;
    return null;
  }
}

export async function loadProgress() {
  if (!player) return null;
  try {
    const data = await player.getData([SAVE_KEY]);
    return data && data[SAVE_KEY] ? data[SAVE_KEY] : null;
  } catch (e) {
    console.warn('[sdk] loadProgress failed', e);
    return null;
  }
}

export async function saveProgress(payload) {
  if (!player) return false;
  try {
    await player.setData({ [SAVE_KEY]: payload }, true);
    return true;
  } catch (e) {
    console.warn('[sdk] saveProgress failed', e);
    return false;
  }
}

export async function showRewarded({ onReward } = {}) {
  if (!ysdk || !onPlatform() || !ysdk.adv) {
    if (typeof onReward === 'function') {
      try { onReward(); } catch (e) { console.warn(e); }
    }
    return true;
  }

  return new Promise((resolve) => {
    let rewarded = false;
    try {
      ysdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => pauseAll(),
          onRewarded: () => { rewarded = true; },
          onClose: () => {
            resumeAll();
            if (rewarded && typeof onReward === 'function') {
              try { onReward(); } catch (e) { console.warn(e); }
            }
            resolve(rewarded);
          },
          onError: (e) => {
            console.warn('[sdk] rewarded error', e);
            resumeAll();
            resolve(false);
          },
        },
      });
    } catch (e) {
      console.warn('[sdk] rewarded failed', e);
      resumeAll();
      resolve(false);
    }
  });
}

export async function showInterstitial() {
  if (!ysdk || !onPlatform() || !ysdk.adv) return false;

  const now = Date.now();
  if (now - lastInterstitialAt < INTERSTITIAL_COOLDOWN) return false;

  return new Promise((resolve) => {
    try {
      ysdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => pauseAll(),
          onClose: (wasShown) => {
            resumeAll();
            if (wasShown) lastInterstitialAt = Date.now();
            resolve(!!wasShown);
          },
          onError: (e) => {
            console.warn('[sdk] interstitial error', e);
            resumeAll();
            resolve(false);
          },
        },
      });
    } catch (e) {
      console.warn('[sdk] interstitial failed', e);
      resumeAll();
      resolve(false);
    }
  });
}

export async function syncStickyBanner() {
  if (!ysdk || !onPlatform() || !ysdk.adv) return;
  try {
    const isDesktop = window.matchMedia('(min-width: 760px)').matches;
    const status = await ysdk.adv.getBannerAdvStatus();
    if (isDesktop) {
      if (!status || !status.stickyAdvIsShowing) {
        try { ysdk.adv.showBannerAdv(); } catch {}
      }
    } else {
      if (status && status.stickyAdvIsShowing) {
        try { ysdk.adv.hideBannerAdv(); } catch {}
      }
    }
  } catch (e) {
    console.warn('[sdk] sticky banner failed', e);
  }
}

export async function submitScore(score) {
  if (!leaderboards || !onPlatform()) return false;
  try {
    await leaderboards.setScore(LEADERBOARD, score);
    return true;
  } catch (e) {
    console.warn('[sdk] submitScore failed', e);
    return false;
  }
}

export async function fetchLeaderboard() {
  if (!leaderboards || !onPlatform()) return null;
  try {
    const result = await leaderboards.getEntries(LEADERBOARD, {
      quantityTop: 10,
      includeUser: true,
      quantityAround: 3,
    });
    return result && result.entries ? result.entries : null;
  } catch (e) {
    console.warn('[sdk] fetchLeaderboard failed', e);
    return null;
  }
}