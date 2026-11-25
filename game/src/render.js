// Ember Ladle — render.js
// One clear job: everything drawn on the canvas — kitchen, cook,
// ingredients, dishes, HUD and screens. No game logic lives here.

import { PALETTE, INGREDIENTS, RECIPES } from './config.js';
import { itemName, burnerBurnIn } from './world.js';

const W = 1280;
const H = 800;

// Round-rect path helper (works in every modern browser).
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = (weight || 'bold') + ' ' + size + 'px system-ui, sans-serif';
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function pill(ctx, x, y, w, h, fill, stroke) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// ---- the kitchen floor and walls ----

export function drawFloor(ctx) {
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, W, 160);
  ctx.fillStyle = PALETTE.wallTrim;
  ctx.fillRect(0, 156, W, 8);
  // Warm checker tiles.
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 20; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(24 + col * 62, 168 + row * 60, 62, 60);
    }
  }
  // Outer wall border.
  ctx.strokeStyle = PALETTE.wallTrim;
  ctx.lineWidth = 6;
  ctx.strokeRect(21, 165, 1238, 606);
  // A little hearth rug in the middle of the floor.
  ctx.fillStyle = '#c65f3f';
  roundRect(ctx, 560, 480, 180, 56, 12);
  ctx.fill();
  ctx.fillStyle = '#e8a87c';
  roundRect(ctx, 570, 490, 160, 36, 9);
  ctx.fill();
}

// ---- ingredients and dishes ----

// One ingredient drawn as a small recognisable shape.
export function drawIngredient(ctx, ing, x, y, size, state) {
  const def = INGREDIENTS[ing] || { color: '#999999' };
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (ing === 'tomato') {
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(0, 2, s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4c9a52';
    ctx.fillRect(-3, -s - 2, 6, 7);
  } else if (ing === 'lettuce') {
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(-s * 0.4, 0, s * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.4, 0, s * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8ed081';
    ctx.beginPath(); ctx.arc(0, -s * 0.3, s * 0.6, 0, Math.PI * 2); ctx.fill();
  } else if (ing === 'carrot') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, -s * 0.4); ctx.lineTo(s * 0.7, -s * 0.4);
    ctx.lineTo(0, s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4c9a52';
    ctx.fillRect(-2, -s - 2, 4, 8);
  } else if (ing === 'potato') {
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.75, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b98d54';
    ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.3, s * 0.2, 2, 0, Math.PI * 2); ctx.fill();
  } else if (ing === 'mushroom') {
    ctx.fillStyle = '#b4563f';
    ctx.beginPath(); ctx.arc(0, -s * 0.2, s * 0.85, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f3e3c2';
    ctx.fillRect(-s * 0.35, -s * 0.2, s * 0.7, s * 0.9);
  } else if (ing === 'bread') {
    ctx.fillStyle = def.color;
    roundRect(ctx, -s, -s * 0.6, s * 2, s * 1.4, 6); ctx.fill();
    ctx.fillStyle = '#b97f3a';
    roundRect(ctx, -s, -s * 0.6, s * 2, s * 0.4, 6); ctx.fill();
  } else if (ing === 'cheese') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(-s, s * 0.5); ctx.lineTo(-s, -s * 0.2); ctx.lineTo(s, -s * 0.7); ctx.lineTo(s, s * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9a520';
    ctx.beginPath(); ctx.arc(-s * 0.3, 0, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.2, 2.5, 0, Math.PI * 2); ctx.fill();
  } else if (ing === 'broth') {
    ctx.fillStyle = '#8a5a2b';
    roundRect(ctx, -s * 0.8, -s * 0.5, s * 1.6, s * 1.1, 5); ctx.fill();
    ctx.fillStyle = def.color;
    roundRect(ctx, -s * 0.65, -s * 0.4, s * 1.3, s * 0.5, 4); ctx.fill();
  }
  if (state === 'chopped') {
    // Chopped pieces: two halves with a cut line.
    ctx.strokeStyle = '#3a2418';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s * 0.6, s * 0.5); ctx.lineTo(s * 0.6, -s * 0.5); ctx.stroke();
  }
  if (state === 'cooked') {
    // Grill marks.
    ctx.strokeStyle = '#7a4a1f';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.4); ctx.lineTo(s * 0.3, s * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.6); ctx.lineTo(s * 0.7, s * 0.3); ctx.stroke();
  }
  if (state === 'burnt') {
    ctx.fillStyle = 'rgba(20,20,20,0.55)';
    ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// A white plate with its items arranged on it.
export function drawPlate(ctx, items, x, y, size) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(x, y, size, size * 0.72, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d8c9a8';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f3e3c2';
  ctx.beginPath(); ctx.ellipse(x, y, size * 0.62, size * 0.44, 0, 0, Math.PI * 2); ctx.fill();
  items.forEach((item, i) => {
    const off = (i - (items.length - 1) / 2) * size * 0.55;
    drawIngredient(ctx, item.ing, x + off, y - 2, size * 0.62, item.state);
  });
}

// ---- stations (render.js, part 2) ----

export function drawStation(ctx, s, world, time) {
  const hover = world.nearest === s;
  ctx.save();
  if (hover) {
    ctx.shadowColor = PALETTE.gold;
    ctx.shadowBlur = 18;
  }
  if (s.kind === 'crate') {
    ctx.fillStyle = PALETTE.crateDark;
    roundRect(ctx, s.x, s.y, s.w, s.h, 8); ctx.fill();
    ctx.fillStyle = PALETTE.crate;
    roundRect(ctx, s.x + 4, s.y + 4, s.w - 8, s.h - 8, 6); ctx.fill();
    drawIngredient(ctx, s.extra, s.cx, s.cy - 6, 34, 'raw');
    text(ctx, (INGREDIENTS[s.extra] || {}).name || s.extra, s.cx, s.y + s.h - 12, 12, PALETTE.cream);
  } else if (s.kind === 'board') {
    ctx.fillStyle = PALETTE.counterSide;
    roundRect(ctx, s.x, s.y, s.w, s.h, 8); ctx.fill();
    ctx.fillStyle = PALETTE.board;
    roundRect(ctx, s.x + 8, s.y + 8, s.w - 16, s.h - 16, 6); ctx.fill();
    const b = world.board;
    if (b.item) drawIngredient(ctx, b.item.ing, s.cx, s.cy - 8, 40, b.item.state);
    if (b.progress > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(s.x + 16, s.y + s.h - 22, s.w - 32, 10);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(s.x + 16, s.y + s.h - 22, (s.w - 32) * b.progress, 10);
    }
    text(ctx, 'CHOP BOARD', s.cx, s.y + s.h - 32, 12, PALETTE.ink);
  } else if (s.kind === 'stove') {
    ctx.fillStyle = PALETTE.counterSide;
    roundRect(ctx, s.x, s.y, s.w, s.h, 8); ctx.fill();
    ctx.fillStyle = PALETTE.stoveTop;
    roundRect(ctx, s.x + 8, s.y + 8, s.w - 16, s.h - 16, 6); ctx.fill();
    world.burners.forEach((burner, i) => {
      const bx = s.x + 70 + i * 150;
      const by = s.cy - 6;
      ctx.fillStyle = burner.item ? PALETTE.stoveHot : '#33333a';
      ctx.beginPath(); ctx.arc(bx, by, 34, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#22222a';
      ctx.lineWidth = 3;
      ctx.stroke();
      if (burner.item) {
        drawIngredient(ctx, burner.item.ing, bx, by, 34, burner.item.state);
        const frac = Math.min(1, burner.progress);
        ctx.strokeStyle = burner.burnt ? PALETTE.red : PALETTE.gold;
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(bx, by, 42, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
        if (burner.warned && !burner.burnt) {
          const puff = Math.sin(time * 6 + i) * 3;
          ctx.fillStyle = 'rgba(200,200,200,0.8)';
          ctx.beginPath(); ctx.arc(bx + puff, by - 46, 8, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(bx - puff, by - 56, 6, 0, Math.PI * 2); ctx.fill();
          text(ctx, 'BURNING!', bx, by - 72, 13, '#ffffff');
        }
        if (burner.burnt) text(ctx, 'BURNT!', bx, by - 56, 13, '#ffb3ad');
      }
    });
    text(ctx, 'STOVE', s.cx, s.y + s.h - 12, 12, PALETTE.cream);
  } else if (s.kind === 'plate') {
    ctx.fillStyle = PALETTE.counterSide;
    roundRect(ctx, s.x, s.y, s.w, s.h, 8); ctx.fill();
    ctx.fillStyle = PALETTE.counterTop;
    roundRect(ctx, s.x + 8, s.y + 8, s.w - 16, s.h - 16, 6); ctx.fill();
    if (world.plate.items.length > 0) {
      drawPlate(ctx, world.plate.items, s.cx, s.cy - 4, 44);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(s.cx, s.cy - 4, 40, 28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#d8c9a8'; ctx.lineWidth = 2; ctx.stroke();
    }
    text(ctx, 'PLATING', s.cx, s.y + s.h - 12, 12, PALETTE.ink);
  } else if (s.kind === 'pass') {
    ctx.fillStyle = PALETTE.pass;
    roundRect(ctx, s.x, s.y, s.w, s.h, 8); ctx.fill();
    ctx.fillStyle = '#a8d08d';
    roundRect(ctx, s.x + 6, s.y + 6, s.w - 12, s.h - 12, 6); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(s.cx - 30, s.cy - 6, 34, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s.cx + 40, s.cy - 6, 34, 24, 0, 0, Math.PI * 2); ctx.fill();
    text(ctx, 'SERVE HERE  ▶', s.cx, s.y + s.h - 14, 14, '#2c4a22');
  } else if (s.kind === 'trash') {
    ctx.fillStyle = PALETTE.trash;
    roundRect(ctx, s.x, s.y, s.w, s.h, 8); ctx.fill();
    ctx.fillStyle = '#4b5563';
    roundRect(ctx, s.x + 18, s.y + 14, s.w - 36, s.h - 28, 6); ctx.fill();
    text(ctx, 'TRASH', s.cx, s.cy + 2, 14, '#ffffff');
  } else if (s.kind === 'prep') {
    ctx.fillStyle = PALETTE.counterSide;
    roundRect(ctx, s.x, s.y, s.w, s.h, 8); ctx.fill();
    ctx.fillStyle = PALETTE.counterTop;
    roundRect(ctx, s.x + 8, s.y + 8, s.w - 16, s.h - 16, 6); ctx.fill();
    world.prepItems.forEach((item, i) => {
      drawIngredient(ctx, item.ing, s.x + 40 + i * 70, s.cy - 6, 34, item.state);
    });
    text(ctx, 'PREP COUNTER', s.cx, s.y + s.h - 12, 12, PALETTE.ink);
  }
  ctx.restore();
}

// ---- the cook ----

export function drawPlayer(ctx, player, held, time) {
  const bob = player.moving ? Math.sin(time * 12) * 2 : 0;
  ctx.save();
  ctx.translate(player.x, player.y + bob);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(0, 18, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
  // Body: cream apron over a terracotta shirt.
  ctx.fillStyle = '#b65c3a';
  roundRect(ctx, -15, -8, 30, 30, 10); ctx.fill();
  ctx.fillStyle = '#fff6e3';
  roundRect(ctx, -11, -2, 22, 24, 7); ctx.fill();
  // Head + chef hat.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath(); ctx.arc(0, -16, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, -13, -34, 26, 12, 6); ctx.fill();
  ctx.beginPath(); ctx.arc(-7, -32, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(7, -32, 7, 0, Math.PI * 2); ctx.fill();
  // Eyes look in the walking direction.
  ctx.fillStyle = '#3a2418';
  ctx.beginPath(); ctx.arc(player.dirX * 3 - 4, -17, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(player.dirX * 3 + 4, -17, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Carried item floats above the head.
  if (held) {
    const hy = player.y - 52 + bob;
    if (held.ing === 'plate') {
      drawPlate(ctx, held.items || [], player.x, hy, 26);
    } else {
      drawIngredient(ctx, held.ing, player.x, hy, 30, held.state);
      text(ctx, itemName(held), player.x, hy - 24, 11, PALETTE.cream);
    }
  }
}

// ---- HUD, order board and screens (render.js, part 3) ----

export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

export function drawTopBar(ctx, game) {
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, W, 64);
  text(ctx, 'EMBER LADLE', 24, 34, 30, PALETTE.cream, 'left');
  text(ctx, 'a tiny hearth kitchen', 230, 36, 13, '#f3d9b8', 'left');
  const left = game.shiftLeft;
  const urgent = left <= 30;
  pill(ctx, 560, 12, 160, 40, urgent ? PALETTE.red : '#fff6e3', urgent ? '#ffffff' : null);
  text(ctx, 'SHIFT ' + formatTime(left), 640, 33, 22, urgent ? '#ffffff' : PALETTE.ink);
  text(ctx, 'COINS  ' + game.coins, 800, 33, 22, PALETTE.gold, 'left');
  const combo = game.comboText;
  text(ctx, combo, 1010, 33, 20, combo === 'COMBO x1.0' ? '#f3d9b8' : PALETTE.gold, 'left');
  text(ctx, game.muted ? 'M muted' : 'M sound', 1240, 33, 13, '#f3d9b8', 'right');
  if (game.rush) {
    text(ctx, 'RUSH!', 1140, 33, 18, PALETTE.red, 'right');
  }
}

// One order card: recipe name, its steps with states, timer bar.
export function drawOrderCard(ctx, order, x, y, w, h) {
  const frac = Math.max(0, order.left / order.total);
  const urgent = frac < 0.33;
  ctx.save();
  ctx.fillStyle = urgent ? '#ffe3de' : '#fff6e3';
  roundRect(ctx, x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = urgent ? PALETTE.red : '#d8c9a8';
  ctx.lineWidth = 2; ctx.stroke();
  text(ctx, order.recipe.name, x + 14, y + 16, 15, PALETTE.ink, 'left');
  text(ctx, '$' + order.recipe.price, x + w - 12, y + 16, 15, '#8a5a2b', 'right');
  // Steps as small chips, two per row, so every card stays one height.
  order.recipe.steps.forEach((step, i) => {
    const def = INGREDIENTS[step.ing];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = x + 14 + col * 140;
    const cy = y + 38 + row * 20;
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(cx + 6, cy, 7, 0, Math.PI * 2); ctx.fill();
    const label = def.name + ' ' + step.state;
    text(ctx, label, cx + 18, cy, 12, PALETTE.ink, 'left');
  });
  // Timer bar.
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  roundRect(ctx, x + 12, y + h - 16, w - 24, 9, 4); ctx.fill();
  ctx.fillStyle = frac > 0.66 ? PALETTE.green : frac > 0.33 ? PALETTE.gold : PALETTE.red;
  roundRect(ctx, x + 12, y + h - 16, (w - 24) * frac, 9, 4); ctx.fill();
  text(ctx, formatTime(order.left), x + w - 12, y + h - 26, 11, urgent ? PALETTE.red : PALETTE.ink, 'right');
  ctx.restore();
}

export function drawOrderBoard(ctx, orders) {
  text(ctx, 'ORDERS', 24, 108, 15, '#f3d9b8', 'left');
  if (orders.active.length === 0) {
    text(ctx, 'No orders yet — the first ticket is coming…', 640, 118, 15, '#f3d9b8');
    return;
  }
  orders.active.forEach((order, i) => {
    drawOrderCard(ctx, order, 24 + i * 300, 70, 284, 92);
  });
}

// Floating "+coins" / warning texts that rise and fade.
export function drawFloaters(ctx, floaters) {
  for (const f of floaters) {
    ctx.globalAlpha = Math.max(0, 1 - f.age / f.life);
    text(ctx, f.text, f.x, f.y - f.age * 40, f.size || 22, f.color || PALETTE.gold);
    ctx.globalAlpha = 1;
  }
}

// Hint line at the bottom of the screen.
export function drawHint(ctx, hint) {
  if (!hint) return;
  ctx.fillStyle = 'rgba(58,36,24,0.75)';
  roundRect(ctx, 340, 766, 600, 26, 13); ctx.fill();
  text(ctx, hint, 640, 780, 14, '#fff6e3');
}

// ---- title and end screens ----

export function drawTitle(ctx, time) {
  ctx.fillStyle = 'rgba(40,20,10,0.72)';
  ctx.fillRect(0, 0, W, H);
  const flicker = 0.85 + Math.sin(time * 3) * 0.15;
  ctx.fillStyle = '#ff9a3d';
  ctx.globalAlpha = flicker;
  ctx.beginPath(); ctx.arc(640, 300, 46, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  text(ctx, 'EMBER LADLE', 640, 220, 64, PALETTE.cream);
  text(ctx, 'a tiny hearth kitchen — cook fast, serve faster', 640, 268, 20, PALETTE.gold);
  text(ctx, 'WASD / arrows to move  ·  E or Space to grab, chop, cook, plate & serve', 640, 380, 18, '#fff6e3');
  text(ctx, 'Mouse works too: click a station to walk there and use it', 640, 410, 18, '#fff6e3');
  text(ctx, 'Chop it, grill it, plate it, serve it before the ticket runs out.', 640, 440, 18, '#fff6e3');
  text(ctx, 'Burnt food goes in the trash. Fast serves earn tips and combo.', 640, 468, 18, '#fff6e3');
  pill(ctx, 520, 520, 240, 54, PALETTE.gold, '#fff6e3');
  text(ctx, 'START SHIFT  (Enter)', 640, 548, 20, PALETTE.ink);
  text(ctx, 'P pause · R restart · M mute', 640, 610, 15, '#f3d9b8');
  text(ctx, '5 recipes · 8 ingredients · 3-minute shifts', 640, 640, 15, '#f3d9b8');
}

export function drawEnd(ctx, summary, time) {
  ctx.fillStyle = 'rgba(40,20,10,0.78)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'SHIFT OVER', 640, 190, 54, PALETTE.cream);
  const verdict = summary.coins >= 120 ? 'A legendary service!' : summary.coins >= 70 ? 'A fine service!' : 'The kitchen survived.';
  text(ctx, verdict, 640, 250, 22, PALETTE.gold);
  text(ctx, 'COINS EARNED  ' + summary.coins, 640, 330, 30, '#fff6e3');
  text(ctx, 'Orders served: ' + summary.served + '    Expired: ' + summary.expired, 640, 390, 20, '#fff6e3');
  text(ctx, 'Best combo: x' + summary.bestCombo + '    Accuracy: ' + summary.accuracy + '%', 640, 424, 20, '#fff6e3');
  pill(ctx, 500, 480, 280, 54, PALETTE.gold, '#fff6e3');
  text(ctx, 'PLAY AGAIN  (R)', 640, 508, 20, PALETTE.ink);
  text(ctx, 'Ember Ladle — thanks for cooking!', 640, 580, 15, '#f3d9b8');
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(40,20,10,0.6)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'PAUSED', 640, 380, 48, PALETTE.cream);
  text(ctx, 'Press P to keep cooking', 640, 430, 18, '#fff6e3');
}
