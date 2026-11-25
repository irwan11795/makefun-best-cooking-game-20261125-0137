// Ember Ladle — world.js
// One clear job: the kitchen layout, the stations, player movement and
// collision, and what happens when the player uses a station.
// Scoring lives in orders.js; drawing lives in render.js.

import { PLAYER_SPEED, PLAYER_RADIUS, INTERACT_RANGE, CHOP_SECONDS, COOK_SECONDS, BURN_AFTER_SECONDS, INGREDIENTS } from './config.js';

// The play floor: below the order board, inside the outer walls.
export const FLOOR = { x: 24, y: 168, w: 1232, h: 600 };

function station(id, kind, x, y, w, h, extra) {
  return { id, kind, x, y, w, h, extra: extra || null, cx: x + w / 2, cy: y + h / 2 };
}

// Build every station in the kitchen. Crates run along the top wall,
// the board and stove sit mid-kitchen, plate counter and pass at the
// bottom, trash in the bottom-left corner.
export function buildKitchen() {
  const stations = [];
  const crateIds = ['tomato', 'lettuce', 'carrot', 'potato', 'mushroom', 'bread', 'cheese', 'broth'];
  crateIds.forEach((ing, i) => {
    stations.push(station('crate-' + ing, 'crate', 56 + i * 148, 184, 128, 64, ing));
  });
  stations.push(station('board', 'board', 120, 330, 190, 96, null));
  stations.push(station('stove', 'stove', 560, 330, 300, 96, null));
  stations.push(station('plate', 'plate', 980, 330, 190, 96, null));
  stations.push(station('pass', 'pass', 980, 560, 220, 96, null));
  stations.push(station('trash', 'trash', 120, 560, 130, 96, null));
  // A long prep counter the player can walk around, with spare plates.
  stations.push(station('prep', 'prep', 330, 560, 300, 96, null));
  return stations;
}

// Fresh per-shift world state: player, stations, stove burners,
// the cutting board slot and the plating counter.
export function createWorld() {
  return {
    stations: buildKitchen(),
    player: { x: 640, y: 700, r: PLAYER_RADIUS, dirX: 0, dirY: 1, moving: false, target: null },
    board: { item: null, progress: 0, chopping: false },
    burners: [
      { item: null, progress: 0, burnt: false, warned: false },
      { item: null, progress: 0, burnt: false, warned: false },
    ],
    plate: { items: [] },
    // Ingredients left sitting on the prep counter for the cover shot.
    prepItems: [],
  };
}

// Every station is a solid block the player cannot walk through.
export function collideStations(world, x, y, r) {
  let nx = x;
  let ny = y;
  for (const s of world.stations) {
    const closestX = Math.max(s.x, Math.min(nx, s.x + s.w));
    const closestY = Math.max(s.y, Math.min(ny, s.y + s.h));
    const dx = nx - closestX;
    const dy = ny - closestY;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      nx = closestX + (dx / d) * r;
      ny = closestY + (dy / d) * r;
    } else if (d2 <= 0.0001) {
      // Centre inside the block: push out along the smallest overlap.
      const pushL = nx - s.x + r;
      const pushR = s.x + s.w - nx + r;
      const pushT = ny - s.y + r;
      const pushB = s.y + s.h - ny + r;
      const m = Math.min(pushL, pushR, pushT, pushB);
      if (m === pushL) nx = s.x - r;
      else if (m === pushR) nx = s.x + s.w + r;
      else if (m === pushT) ny = s.y - r;
      else ny = s.y + s.h + r;
    }
  }
  return { x: nx, y: ny };
}

// Move the player one tick. Keyboard input wins; otherwise the player
// walks toward a mouse click target and stops when it gets there.
export function movePlayer(world, vx, vy, dt) {
  const p = world.player;
  if (vx !== 0 || vy !== 0) {
    p.target = null;
    p.waypoints = [];
    p.dirX = vx;
    p.dirY = vy;
    p.moving = true;
    stepPlayer(world, vx, vy, dt);
    return;
  }
  if (p.target) {
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 8) {
      // Reached a waypoint: take the next one, or stop at the final spot.
      if (p.waypoints && p.waypoints.length > 0) {
        p.target = p.waypoints.shift();
      } else {
        p.target = null;
        p.moving = false;
        return;
      }
    }
    const tx = p.target.x - p.x;
    const ty = p.target.y - p.y;
    const td = Math.sqrt(tx * tx + ty * ty) || 1;
    p.dirX = tx / td;
    p.dirY = ty / td;
    p.moving = true;
    stepPlayer(world, tx / td, ty / td, dt);
  } else {
    p.moving = false;
  }
}

function stepPlayer(world, vx, vy, dt) {
  const p = world.player;
  let nx = p.x + vx * PLAYER_SPEED * dt;
  let ny = p.y + vy * PLAYER_SPEED * dt;
  nx = Math.max(FLOOR.x + p.r, Math.min(FLOOR.x + FLOOR.w - p.r, nx));
  ny = Math.max(FLOOR.y + p.r, Math.min(FLOOR.y + FLOOR.h - p.r, ny));
  const fixed = collideStations(world, nx, ny, p.r);
  p.x = fixed.x;
  p.y = fixed.y;
}

// ---- station use (world.js, part 2) ----

// The nearest station whose edge is within interact range. Distance is
// measured to the station's rectangle, not its centre, so standing at
// the end of a wide stove still counts as standing at the stove.
export function nearestStation(world) {
  const p = world.player;
  let best = null;
  let bestD = INTERACT_RANGE;
  for (const s of world.stations) {
    const dx = Math.max(s.x - p.x, 0, p.x - (s.x + s.w));
    const dy = Math.max(s.y - p.y, 0, p.y - (s.y + s.h));
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

// An item the player carries: { ing, state } where state is
// 'raw' | 'chopped' | 'cooked' | 'burnt'.
export function makeItem(ing, state) {
  return { ing, state: state || 'raw' };
}

export function itemName(item) {
  if (!item) return '';
  const base = INGREDIENTS[item.ing] ? INGREDIENTS[item.ing].name : item.ing;
  if (item.state === 'chopped') return 'Chopped ' + base;
  if (item.state === 'cooked') return 'Grilled ' + base;
  if (item.state === 'burnt') return 'Burnt ' + base;
  return base;
}

// Can this item be chopped on the board right now?
export function canChop(item) {
  return !!item && item.state === 'raw' && INGREDIENTS[item.ing] && INGREDIENTS[item.ing].chop;
}

// Can this item go on a burner right now? Raw grillables and chopped
// stir-fry vegetables both cook; broth never does.
export function canCook(item) {
  if (!item) return false;
  const def = INGREDIENTS[item.ing];
  if (!def || !def.cook) return false;
  if (item.state === 'raw') return true;
  if (item.state === 'chopped' && (item.ing === 'carrot' || item.ing === 'mushroom')) return true;
  return false;
}

// Advance chopping and cooking by dt seconds. Returns event strings
// the game loop turns into sounds: 'chopped', 'cooked', 'burnt',
// 'burnwarn'.
export function tickStations(world, dt, holdingChop) {
  const events = [];
  const b = world.board;
  if (b.item && holdingChop && canChop(b.item)) {
    b.chopping = true;
    b.progress += dt / CHOP_SECONDS;
    if (b.progress >= 1) {
      b.item.state = 'chopped';
      b.progress = 0;
      b.chopping = false;
      events.push('chopped');
    }
  } else {
    b.chopping = false;
  }
  for (const burner of world.burners) {
    if (!burner.item || burner.burnt) continue;
    burner.progress += dt / COOK_SECONDS;
    if (burner.progress >= 1 && !burner.warned) {
      burner.warned = true;
      events.push('burnwarn');
    }
    if (burner.progress >= 1 + BURN_AFTER_SECONDS / COOK_SECONDS) {
      burner.item.state = 'burnt';
      burner.burnt = true;
      events.push('burnt');
    }
  }
  return events;
}

// Use the station the player stands at. `held` is the carried item (or
// null) and the return value is the new carried item plus a note of
// what happened, so main.js can play the right sound.
export function useStation(world, stationObj, held) {
  if (!stationObj) return { held, note: 'none' };
  const kind = stationObj.kind;
  if (kind === 'crate') {
    if (held) return { held, note: 'hands-full' };
    return { held: makeItem(stationObj.extra, 'raw'), note: 'pickup' };
  }
  if (kind === 'board') {
    const b = world.board;
    if (!b.item && held && canChop(held)) {
      b.item = held;
      b.progress = 0;
      return { held: null, note: 'place-board' };
    }
    if (b.item && !held && b.item.state === 'chopped') {
      const item = b.item;
      b.item = null;
      b.progress = 0;
      return { held: item, note: 'pickup' };
    }
    if (b.item && !held) return { held, note: 'still-chopping' };
    return { held, note: 'none' };
  }
  if (kind === 'stove') {
    if (held && canCook(held)) {
      const free = world.burners.find((x) => !x.item);
      if (!free) return { held, note: 'stove-full' };
      free.item = held;
      free.progress = 0;
      free.burnt = false;
      free.warned = false;
      return { held: null, note: 'place-stove' };
    }
    if (!held) {
      const done = world.burners.find((x) => x.item && x.item.state === 'cooked');
      if (done) {
        const item = done.item;
        done.item = null;
        done.progress = 0;
        done.warned = false;
        return { held: item, note: 'pickup' };
      }
      const burnt = world.burners.find((x) => x.item && x.burnt);
      if (burnt) {
        const item = burnt.item;
        burnt.item = null;
        burnt.progress = 0;
        burnt.burnt = false;
        burnt.warned = false;
        return { held: item, note: 'pickup-burnt' };
      }
    }
    return { held, note: 'none' };
  }
  if (kind === 'plate') {
    if (held && held.ing !== 'plate') {
      if (world.plate.items.length >= 3) return { held, note: 'plate-full' };
      world.plate.items.push(held);
      return { held: null, note: 'place-plate' };
    }
    if (!held && world.plate.items.length > 0) {
      const items = world.plate.items;
      world.plate.items = [];
      return { held: { ing: 'plate', state: 'plated', items }, note: 'pickup-plate' };
    }
    return { held, note: 'none' };
  }
  if (kind === 'trash') {
    if (held) return { held: null, note: 'trash' };
    return { held, note: 'none' };
  }
  if (kind === 'prep') {
    if (held && world.prepItems.length < 4) {
      world.prepItems.push(held);
      return { held: null, note: 'place-prep' };
    }
    if (!held && world.prepItems.length > 0) {
      return { held: world.prepItems.pop(), note: 'pickup' };
    }
    return { held, note: 'none' };
  }
  return { held, note: 'none' };
}

// A burner is ready to pick up when its food finished cooking.
export function burnerReady(burner) {
  return !!burner.item && burner.item.state === 'cooked';
}

// Seconds left before a cooking item burns (0 when already burnt).
export function burnerBurnIn(burner) {
  if (!burner.item || burner.burnt) return 0;
  const total = COOK_SECONDS + BURN_AFTER_SECONDS;
  return Math.max(0, total - burner.progress * COOK_SECONDS);
}

// ---- click approach (world.js, part 3) ----

// The spot a mouse-clicking player should walk to: the midpoint of the
// station side facing the player — but only a side no other station
// blocks (crate rows sit shoulder to shoulder, so their left/right
// sides are never valid approaches). Falls back to the side below.
export function approachPoint(stationObj, px, py, stations) {
  const pad = PLAYER_RADIUS + 14;
  const sides = [
    { x: stationObj.cx, y: stationObj.y + stationObj.h + pad },
    { x: stationObj.cx, y: stationObj.y - pad },
    { x: stationObj.x - pad, y: stationObj.cy },
    { x: stationObj.x + stationObj.w + pad, y: stationObj.cy },
  ];
  const clear = sides.filter((s) => {
    for (const other of stations || []) {
      if (other === stationObj) continue;
      if (s.x > other.x - 24 && s.x < other.x + other.w + 24 && s.y > other.y - 24 && s.y < other.y + other.h + 24) return false;
    }
    return true;
  });
  const usable = clear.length > 0 ? clear : [sides[0]];
  let best = usable[0];
  let bestD = Infinity;
  for (const s of usable) {
    const d = Math.hypot(s.x - px, s.y - py);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return { x: best.x, y: best.y };
}

// ---- lane routing (world.js, part 4) ----

// Open x-gaps in each station row, so a click-walk can cross the row.
const MIDDLE_GAPS = [80, 435, 920, 1220];
const BOTTOM_GAPS = [80, 290, 800, 1240];

function nearestGap(gaps, x) {
  let best = gaps[0];
  for (const g of gaps) if (Math.abs(g - x) < Math.abs(best - x)) best = g;
  return best;
}

// Waypoints between (px, py) and (sx, sy) so the walk crosses each
// station row through an open gap instead of through a counter, and
// detours around any station the straight line would clip.
// Returns the intermediate points only; the caller appends the spot.
// `stations` is the kitchen list, `target` the station being walked to
// (its own rect is never treated as an obstacle).
export function routeWaypoints(px, py, sx, sy, stations, target) {
  const goingUp = sy < py;
  const pts = [];
  // Rows crossed, nearest the player first.
  const rows = [];
  const crossesMiddle = (py > 426 && sy < 330) || (py < 330 && sy > 426);
  const crossesBottom = (py > 656 && sy < 560) || (py < 560 && sy > 656);
  if (goingUp) {
    if (crossesBottom) rows.push('bottom');
    if (crossesMiddle) rows.push('middle');
  } else {
    if (crossesMiddle) rows.push('middle');
    if (crossesBottom) rows.push('bottom');
  }
  for (const row of rows) {
    if (row === 'middle') {
      const gx = nearestGap(MIDDLE_GAPS, (px + sx) / 2);
      pts.push({ x: gx, y: goingUp ? 289 : 493 });
    } else {
      const gx = nearestGap(BOTTOM_GAPS, (px + sx) / 2);
      pts.push({ x: gx, y: goingUp ? 493 : 712 });
    }
  }
  // Detour around any station a leg of the walk would clip.
  const legs = [...pts, { x: sx, y: sy }];
  const out = [];
  let cur = { x: px, y: py };
  for (const next of legs) {
    let guard = 0;
    while (guard++ < 6) {
      const hit = firstHitStation(cur, next, stations, target);
      if (!hit) break;
      const pad = PLAYER_RADIUS + 26;
      // Detour around the corner of the expanded rect that is nearest
      // the destination, pushed a little further out — that corner is
      // on the far side of the obstacle in the direction of travel.
      const rx = hit.x - pad;
      const ry = hit.y - pad;
      const rw = hit.w + pad * 2;
      const rh = hit.h + pad * 2;
      const corners = [
        { x: rx - 12, y: ry - 12 },
        { x: rx + rw + 12, y: ry - 12 },
        { x: rx - 12, y: ry + rh + 12 },
        { x: rx + rw + 12, y: ry + rh + 12 },
      ];
      let detour = corners[0];
      let bestD = Infinity;
      for (const c of corners) {
        const d = Math.hypot(c.x - next.x, c.y - next.y);
        if (d < bestD) {
          bestD = d;
          detour = c;
        }
      }
      out.push(detour);
      cur = detour;
    }
    if (next !== legs[legs.length - 1]) out.push(next);
    cur = next;
  }
  return out;
}

// First station (not the target) whose expanded rect a segment clips.
function firstHitStation(a, b, stations, target) {
  for (const s of stations || []) {
    if (s === target) continue;
    const pad = PLAYER_RADIUS + 6;
    const rect = { x: s.x - pad, y: s.y - pad, w: s.w + pad * 2, h: s.h + pad * 2 };
    if (segmentHitsRect(a.x, a.y, b.x, b.y, rect)) return s;
  }
  return null;
}

// Liang-Barsky: does segment (px,py)-(sx,sy) touch rect?
function segmentHitsRect(px, py, sx, sy, rect) {
  const dx = sx - px;
  const dy = sy - py;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [px - rect.x, rect.x + rect.w - px, py - rect.y, rect.y + rect.h - py];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}
