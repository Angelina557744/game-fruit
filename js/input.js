const SWIPE_THRESHOLD = 30;

export function initInput({ onMove }) {
  initKeyboard(onMove);
  initPointer(onMove);
}

function initKeyboard(onMove) {
  const map = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    a: 'left', d: 'right', w: 'up', s: 'down',
    ф: 'left', в: 'right', ц: 'up', ы: 'down',
  };

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'F5' || e.key === 'F11' || e.key === 'F12') return;
    if (e.key === 'Tab' && !e.shiftKey) return;
    if (e.key === ' ') e.preventDefault();

    const dir = map[e.key];
    if (!dir) return;
    e.preventDefault();
    onMove(dir);
  });
}


function initPointer(onMove) {
  const target = document.querySelector('.board-wrap');
  if (!target) return;

  target.addEventListener('contextmenu', (e) => e.preventDefault());
  target.addEventListener('selectstart', (e) => e.preventDefault());
  target.addEventListener('dragstart', (e) => e.preventDefault());
  target.style.webkitTouchCallout = 'none';
  target.style.webkitUserSelect = 'none';
  target.style.userSelect = 'none';

  let start = null;
  let activeId = null;

  target.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (activeId !== null) return;
    activeId = e.pointerId;
    start = { x: e.clientX, y: e.clientY };
    try { target.setPointerCapture(e.pointerId); } catch {}
  });

  target.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activeId || !start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);

    if (Math.max(ax, ay) < SWIPE_THRESHOLD) return;

    if (ax > ay) onMove(dx > 0 ? 'right' : 'left');
    else onMove(dy > 0 ? 'down' : 'up');

    if (e.pointerId === activeId) {
      try { target.releasePointerCapture(e.pointerId); } catch {}
    }
    activeId = null;
    start = null;
  });

  const finish = (e) => {
    if (e.pointerId !== activeId) return;
    if (!start) { activeId = null; return; }

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);

    if (Math.max(ax, ay) >= SWIPE_THRESHOLD) {
      if (ax > ay) onMove(dx > 0 ? 'right' : 'left');
      else onMove(dy > 0 ? 'down' : 'up');
    }

    activeId = null;
    start = null;
  };

  target.addEventListener('pointerup', finish);
  target.addEventListener('pointercancel', (e) => {
    if (e.pointerId !== activeId) return;
    activeId = null;
    start = null;
  });
}