// Ember Ladle — main.js
// One clear job: the game loop and the state machine
// (title → playing → paused → shift-end), plus the ?shot= photo hook.
// Cooking rules live in world.js and orders.js; drawing in render.js.

import { GAME_TITLE, SHIFT_SECONDS, CHOP_SECONDS } from './config.js';
import { createInput, moveVector, wasPressed, takeClick, takeInteract, endFrame, pointInRect } from './input.js';
import { createAudio, playChop, playServe, playFail, playPop, playSizzle, playJingle, playOrder, playBurnWarn } from './audio.js';
import { createWorld, movePlayer, nearestStation, useStation, tickStations, makeItem, itemName, canChop, canCook, approachPoint, routeWaypoints } from './world.js';
import { createOrders, tickOrders, findMatchingOrder, serveOrder, comboMultiplier, shiftLeft, isRush, shiftSummary } from './orders.js';
import { drawFloor, drawStation, drawPlayer, drawTopBar, drawOrderBoard, drawFloaters, drawHint, drawTitle, drawEnd, drawPaused, formatTime } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();

const game = {
  state: 'title', // 'title' | 'playing' | 'paused' | 'end'
  world: createWorld(),
  orders: createOrders(),
  held: null,
  floaters: [],
  time: 0,
  hint: '',
  hintUntil: 0,
  summary: null,
  chopTick: 0,
  clickTarget: null,
  shot: null,
};

function showHint(text, seconds) {
  game.hint = text;
  game.hintUntil = game.time + (seconds || 3);
}

function addFloater(x, y, text, color, size) {
  game.floaters.push({ x, y, text, color: color || '#f2b705', size: size || 22, age: 0, life: 1.4 });
}

function startShift() {
  game.world = createWorld();
  game.orders = createOrders();
  game.held = null;
  game.floaters = [];
  game.state = 'playing';
  game.summary = null;
  showHint('Grab an ingredient from a crate — E or click', 4);
}

// ---- photo presets: ?shot=cover|mid|end seeds a photogenic state ----

function applyShot(shot) {
  game.shot = shot;
  startShift();
  const w = game.world;
  const o = game.orders;
  if (shot === 'cover') {
    // Two active orders, food mid-assembly, a plate ready at the pass.
    o.active.push(
      { id: 1, recipe: { id: 'soup', name: 'Tomato Soup', price: 18, steps: [{ ing: 'tomato', state: 'chopped' }, { ing: 'broth', state: 'raw' }] }, total: 60, left: 41 },
      { id: 2, recipe: { id: 'sandwich', name: 'Grilled Sandwich', price: 22, steps: [{ ing: 'bread', state: 'cooked' }, { ing: 'cheese', state: 'cooked' }] }, total: 66, left: 52 },
      { id: 3, recipe: { id: 'salad', name: 'Garden Salad', price: 16, steps: [{ ing: 'lettuce', state: 'chopped' }, { ing: 'tomato', state: 'chopped' }] }, total: 60, left: 24 },
    );
    o.coins = 34;
    o.combo = 2;
    o.elapsed = 58;
    w.board.item = makeItem('tomato', 'raw');
    w.board.progress = 0.55;
    w.burners[0].item = makeItem('bread', 'raw');
    w.burners[0].progress = 0.6;
    w.burners[1].item = makeItem('cheese', 'raw');
    w.burners[1].progress = 0.35;
    w.plate.items = [makeItem('tomato', 'chopped'), makeItem('broth', 'raw')];
    w.prepItems = [makeItem('carrot', 'raw'), makeItem('lettuce', 'raw')];
    w.player.x = 300;
    w.player.y = 460;
    w.player.dirX = 1;
    w.player.dirY = 0;
    game.held = makeItem('lettuce', 'raw');
    addFloater(1090, 520, '+22', '#f2b705', 26);
  } else if (shot === 'mid') {
    o.active.push(
      { id: 1, recipe: { id: 'stew', name: 'Hearty Stew', price: 28, steps: [{ ing: 'potato', state: 'chopped' }, { ing: 'carrot', state: 'chopped' }, { ing: 'broth', state: 'raw' }] }, total: 72, left: 33 },
      { id: 2, recipe: { id: 'stirfry', name: 'Veggie Stir-fry', price: 24, steps: [{ ing: 'carrot', state: 'cooked' }, { ing: 'mushroom', state: 'cooked' }] }, total: 66, left: 18 },
      { id: 3, recipe: { id: 'soup', name: 'Tomato Soup', price: 18, steps: [{ ing: 'tomato', state: 'chopped' }, { ing: 'broth', state: 'raw' }] }, total: 60, left: 47 },
    );
    o.coins = 86;
    o.combo = 3;
    o.elapsed = 118;
    w.board.item = makeItem('carrot', 'raw');
    w.board.progress = 0.7;
    w.burners[0].item = makeItem('mushroom', 'chopped');
    w.burners[0].progress = 0.85;
    w.burners[0].warned = true;
    w.burners[1].item = makeItem('carrot', 'chopped');
    w.burners[1].progress = 0.5;
    w.plate.items = [makeItem('potato', 'chopped')];
    w.prepItems = [makeItem('tomato', 'raw'), makeItem('mushroom', 'raw')];
    w.player.x = 700;
    w.player.y = 470;
    w.player.dirX = 0;
    w.player.dirY = -1;
    game.held = makeItem('potato', 'chopped');
  } else if (shot === 'end') {
    o.coins = 148;
    o.served = 9;
    o.expired = 2;
    o.bestCombo = 4;
    o.elapsed = 180;
    game.summary = { coins: 148, served: 9, expired: 2, bestCombo: 4, accuracy: 82 };
    game.state = 'end';
    playJingle(audio);
  }
}

// ---- interaction (main.js, part 2) ----

// What the player is standing next to, in plain words, for the hint bar.
function contextHint() {
  const s = nearestStation(game.world);
  if (!s) return '';
  const held = game.held;
  if (s.kind === 'crate') return held ? 'Hands full — chop, cook or plate first' : 'E: take ' + (s.extra || '');
  if (s.kind === 'board') {
    const b = game.world.board;
    if (b.item && b.item.state !== 'chopped') return 'Hold E to chop…';
    if (b.item) return 'E: pick up chopped ' + b.item.ing;
    return held && canChop(held) ? 'E: put ' + held.ing + ' on the board' : 'Chop board — bring something choppable';
  }
  if (s.kind === 'stove') {
    if (held && canCook(held)) return 'E: put ' + held.ing + ' on the stove';
    if (!held) return 'E: take cooked food off the stove';
    return 'This needs chopping first — or it never cooks';
  }
  if (s.kind === 'plate') {
    if (held && held.ing !== 'plate') return 'E: add ' + held.ing + ' to the plate';
    if (!held && game.world.plate.items.length > 0) return 'E: pick up the plate';
    return 'Plating counter — build the dish here';
  }
  if (s.kind === 'pass') {
    if (held && held.ing === 'plate') return 'E: SERVE this dish!';
    return 'Serving pass — bring a finished plate';
  }
  if (s.kind === 'trash') return held ? 'E: throw away ' + itemName(held) : 'Trash — burnt food goes here';
  if (s.kind === 'prep') return held ? 'E: set it down here' : 'Prep counter — spare ingredients live here';
  return '';
}

// Serve the plate the player carries, if it matches an open order.
function tryServe() {
  const held = game.held;
  if (!held || held.ing !== 'plate') return false;
  const order = findMatchingOrder(held.items || [], game.orders);
  if (!order) {
    playFail(audio);
    addFloater(game.world.player.x, game.world.player.y - 70, 'Wrong dish!', '#ff8a80', 20);
    showHint('That plate matches no open order — check the tickets', 3);
    return false;
  }
  const result = serveOrder(game.orders, order, held.items);
  game.held = null;
  playServe(audio);
  addFloater(1090, 520, '+' + result.earned + ' coins', '#f2b705', 26);
  if (result.combo > 1) addFloater(1090, 486, 'COMBO x' + result.combo.toFixed(2), '#ffd54f', 18);
  showHint('Served ' + order.recipe.name + ' — +' + result.earned + ' coins', 2.5);
  return true;
}

// One press of E / Space at the nearest station, or at the station a
// mouse click walked to (forceStation) so the click always uses what
// was clicked, not whatever happens to be nearest. A forced station
// only counts when the player is actually within reach of it.
function interact(forceStation) {
  let s = forceStation || nearestStation(game.world);
  if (forceStation) {
    const p = game.world.player;
    const dx = Math.max(forceStation.x - p.x, 0, p.x - (forceStation.x + forceStation.w));
    const dy = Math.max(forceStation.y - p.y, 0, p.y - (forceStation.y + forceStation.h));
    if (Math.sqrt(dx * dx + dy * dy) > 62) s = nearestStation(game.world);
  }
  if (!s) return;
  if (s.kind === 'pass') {
    if (tryServe()) return;
    if (!game.held) showHint('Bring a finished plate to the pass', 2);
    return;
  }
  const before = game.held;
  const result = useStation(game.world, s, game.held);
  game.held = result.held;
  if (result.note === 'pickup' || result.note === 'pickup-plate' || result.note === 'place-board' || result.note === 'place-stove' || result.note === 'place-plate' || result.note === 'place-prep') playPop(audio);
  if (result.note === 'place-stove') playSizzle(audio);
  if (result.note === 'trash') {
    playPop(audio);
    showHint('Tossed. The trash never judges.', 2);
  }
  if (result.note === 'stove-full') showHint('Both burners are busy!', 2);
  if (result.note === 'hands-full') showHint('Hands full!', 2);
  if (result.note === 'still-chopping') showHint('Hold E to finish chopping first', 2);
  if (result.note === 'pickup-burnt') showHint('Burnt! Trash it.', 2);
  if (before === game.held && result.note === 'none') showHint(contextHint(), 2);
}

// A mouse click: on a station, walk to it and use it; on open floor,
// just walk there.
function handleClick(click) {
  const w = game.world;
  for (const s of w.stations) {
    if (pointInRect(click.x, click.y, s)) {
      const spot = approachPoint(s, w.player.x, w.player.y, w.stations);
      const finalSpot = { x: spot.x, y: spot.y, station: s };
      const legs = routeWaypoints(w.player.x, w.player.y, spot.x, spot.y, w.stations, s);
      w.player.waypoints = [...legs, finalSpot];
      w.player.target = w.player.waypoints.shift();
      game.clickTarget = s;
      game.stuckAt = null;
      return;
    }
  }
  w.player.waypoints = [];
  w.player.target = { x: click.x, y: click.y, station: null };
  game.clickTarget = null;
}

// ---- update ----

function update(dt) {
  game.time += dt;
  const orders = game.orders;
  const before = orders.active.length;
  const expired = tickOrders(orders, dt);
  for (const order of expired) {
    playFail(audio);
    addFloater(640, 130, 'Order expired! -15', '#ff8a80', 22);
  }
  if (orders.active.length > before) playOrder(audio);

  // Chopping / cooking progress.
  const holdingChop = input.chopHeld && nearestStation(game.world) && nearestStation(game.world).kind === 'board';
  const events = tickStations(game.world, dt, !!holdingChop);
  for (const ev of events) {
    if (ev === 'chopped') {
      playPop(audio);
      addFloater(game.world.player.x, game.world.player.y - 70, 'Chopped!', '#a5d6a7', 18);
    }
    if (ev === 'burnwarn') playBurnWarn(audio);
    if (ev === 'burnt') {
      playFail(audio);
      addFloater(710, 300, 'BURNT!', '#ff8a80', 22);
    }
  }
  if (holdingChop && game.world.board.item) {
    game.chopTick += dt;
    if (game.chopTick > 0.28) {
      game.chopTick = 0;
      playChop(audio);
    }
  }

  // Movement + mouse arrival.
  const v = moveVector(input);
  movePlayer(game.world, v.x, v.y, dt);
  const p = game.world.player;
  if (game.clickTarget) {
    const s = game.clickTarget;
    if (!p.target) {
      p.target = null;
      game.clickTarget = null;
      game.stuckAt = null;
      game.world.nearest = s;
      interact(s);
    } else {
      // Stuck against something: if the player has barely moved for
      // over a second, give up the walk and use whatever is in reach.
      if (!game.stuckAt) game.stuckAt = { x: p.x, y: p.y, t: game.time };
      const moved = Math.hypot(p.x - game.stuckAt.x, p.y - game.stuckAt.y);
      if (moved > 6) {
        game.stuckAt = { x: p.x, y: p.y, t: game.time };
      } else if (game.time - game.stuckAt.t > 1.2) {
        p.target = null;
        game.clickTarget = null;
        game.stuckAt = null;
        interact();
      }
    }
  }
  if (takeInteract(input)) interact();

  // Floaters age — except in photo mode, where they stay put for the shot.
  if (!game.shot) {
    for (const f of game.floaters) f.age += dt;
    game.floaters = game.floaters.filter((f) => f.age < f.life);
  }

  // Shift end.
  if (shiftLeft(orders, SHIFT_SECONDS) <= 0) {
    game.state = 'end';
    game.summary = shiftSummary(orders);
    playJingle(audio);
  }
}

// ---- render (main.js, part 3) ----

function render() {
  const w = game.world;
  ctx.clearRect(0, 0, 1280, 800);
  drawFloor(ctx);
  for (const s of w.stations) drawStation(ctx, s, w, game.time);
  if (game.state === 'playing' || game.state === 'paused') {
    w.nearest = nearestStation(w);
  }
  drawPlayer(ctx, w.player, game.held, game.time);
  const left = shiftLeft(game.orders, SHIFT_SECONDS);
  drawTopBar(ctx, {
    shiftLeft: left,
    coins: game.orders.coins,
    comboText: 'COMBO x' + comboMultiplier(game.orders).toFixed(2),
    muted: audio.muted,
    rush: game.state === 'playing' && isRush(game.orders, SHIFT_SECONDS),
  });
  drawOrderBoard(ctx, game.orders);
  drawFloaters(ctx, game.floaters);
  if (game.state === 'playing') {
    const hint = game.time < game.hintUntil ? game.hint : contextHint();
    drawHint(ctx, hint);
  }
  if (game.state === 'title') drawTitle(ctx, game.time);
  if (game.state === 'paused') drawPaused(ctx);
  if (game.state === 'end' && game.summary) drawEnd(ctx, game.summary, game.time);
}

// ---- the loop ----

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.time += 0; // time advances in update(); title screen animates here.
  if (game.state === 'title' || game.state === 'end') game.time += dt;

  if (wasPressed(input, 'mute')) {
    audio.toggleMute();
    showHint(audio.muted ? 'Sound off' : 'Sound on', 1.5);
  }
  if (game.state === 'title') {
    if (wasPressed(input, 'confirm') || takeClick(input)) {
      audio.ensure();
      startShift();
    }
  } else if (game.state === 'playing') {
    if (wasPressed(input, 'pause')) {
      game.state = 'paused';
    } else if (wasPressed(input, 'restart')) {
      startShift();
    } else {
      const click = takeClick(input);
      if (click) handleClick(click);
      update(dt);
    }
  } else if (game.state === 'paused') {
    if (wasPressed(input, 'pause') || wasPressed(input, 'confirm')) game.state = 'playing';
    if (wasPressed(input, 'restart')) startShift();
    takeClick(input);
  } else if (game.state === 'end') {
    if (wasPressed(input, 'restart') || wasPressed(input, 'confirm') || takeClick(input)) startShift();
  }

  render();
  endFrame(input);
  requestAnimationFrame(frame);
}

// ---- boot ----

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot === 'cover' || shot === 'mid' || shot === 'end') {
  applyShot(shot);
} else {
  document.title = GAME_TITLE + ' — a tiny hearth kitchen';
}
requestAnimationFrame(frame);

// Expose a tiny debug handle for playtesting (not part of the game).
window.__emberLadle = game;
