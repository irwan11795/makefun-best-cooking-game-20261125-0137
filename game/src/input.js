// Ember Ladle — input.js
// One clear job: keyboard + mouse state, nothing else.
// The game loop reads this; this file never draws or scores anything.

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    keys,
    // True only on the frame the key went down.
    pressed: new Set(),
    // Mouse position in canvas pixels (logical 1280x800 space).
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    // A click the game loop has not consumed yet: { x, y } or null.
    click: null,
    // True while the interact key (E / Space) is held down.
    interactHeld: false,
    interactPressed: false,
    // True while the chop key is held (same key as interact here).
    chopHeld: false,
  };

  const KEYMAP = {
    KeyW: 'up',
    ArrowUp: 'up',
    KeyS: 'down',
    ArrowDown: 'down',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
  };

  function canvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 1280,
      y: ((clientY - rect.top) / rect.height) * 800,
    };
  }

  function onKeyDown(e) {
    if (KEYMAP[e.code]) {
      keys.add(KEYMAP[e.code]);
      state.pressed.add(KEYMAP[e.code]);
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyE' || e.code === 'Space') {
      if (!state.interactHeld) state.interactPressed = true;
      state.interactHeld = true;
      state.chopHeld = true;
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyR') { state.pressed.add('restart'); e.preventDefault(); }
    if (e.code === 'KeyP') { state.pressed.add('pause'); e.preventDefault(); }
    if (e.code === 'KeyM') { state.pressed.add('mute'); e.preventDefault(); }
    if (e.code === 'Enter') { state.pressed.add('confirm'); e.preventDefault(); }
  }

  function onKeyUp(e) {
    if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]);
    if (e.code === 'KeyE' || e.code === 'Space') {
      state.interactHeld = false;
      state.chopHeld = false;
    }
  }

  function onMouseMove(e) {
    const p = canvasPoint(e.clientX, e.clientY);
    state.mouseX = p.x;
    state.mouseY = p.y;
  }

  function onMouseDown(e) {
    const p = canvasPoint(e.clientX, e.clientY);
    state.mouseX = p.x;
    state.mouseY = p.y;
    state.mouseDown = true;
    state.click = { x: p.x, y: p.y };
  }

  function onMouseUp() {
    state.mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return state;
}

// Movement vector from the held keys: { x, y } each in -1..1, normalised.
export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('left')) x -= 1;
  if (input.keys.has('right')) x += 1;
  if (input.keys.has('up')) y -= 1;
  if (input.keys.has('down')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.SQRT2;
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

// ---- one-frame edge helpers (input.js, part 2) ----

// Was this logical action pressed since the last endFrame()?
export function wasPressed(input, action) {
  return input.pressed.has(action);
}

// Consume a pending mouse click; returns { x, y } or null.
export function takeClick(input) {
  const c = input.click;
  input.click = null;
  return c;
}

// Consume a pending interact press; returns true if one was waiting.
export function takeInteract(input) {
  const hit = input.interactPressed;
  input.interactPressed = false;
  return hit;
}

// Call once at the end of every game-loop tick: clears edge triggers
// so a press is only ever seen by a single frame.
export function endFrame(input) {
  input.pressed.clear();
  input.interactPressed = false;
}

// True when the pointer is inside a rectangle { x, y, w, h }.
export function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

// Distance between two points, for station proximity checks.
export function distance(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}
