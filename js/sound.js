let muted = false;
let paused = false;
let bgStarted = false;

const bg = () => document.getElementById('bg-music');

export function setMuted(v) {
  muted = v;
  if (muted) {
    document.querySelectorAll('audio').forEach((a) => a.pause());
  } else if (!paused) {
    startBg();
  }
}

export function pauseAll() {
  paused = true;
  document.querySelectorAll('audio').forEach((a) => a.pause());
}

export function resumeAll() {
  paused = false;
  if (muted) return;
  startBg();
}

export function startBg() {
  const el = bg();
  if (!el || muted || paused) return;
  if (!el.paused) { bgStarted = true; return; }
  const p = el.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
  bgStarted = true;
}

export function isBgStarted() { return bgStarted; }

export function play(name) {
  if (muted || paused) return;
  const el = document.querySelector(`audio[data-sfx="${name}"]`);
  if (!el) return;
  el.currentTime = 0;
  const p = el.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
}