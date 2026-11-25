// Ember Ladle — config.js
// One clear job: every tunable number, recipe, colour and label in one place.
// Nothing here touches the canvas, the keyboard or the network.

export const GAME_TITLE = 'Ember Ladle';
export const GAME_SUBTITLE = 'a tiny hearth kitchen';
export const SHIFT_SECONDS = 180;
export const PLAYER_SPEED = 265;
export const PLAYER_RADIUS = 20;
export const INTERACT_RANGE = 62;
export const CHOP_SECONDS = 2.2;
export const COOK_SECONDS = 6.0;
export const BURN_AFTER_SECONDS = 5.0;
export const MAX_ACTIVE_ORDERS = 3;
export const ORDER_SPAWN_EVERY = 14;
export const EXPIRE_PENALTY = 15;
export const COMBO_STEP = 0.25;
export const COMBO_MAX = 3;

// Warm terracotta / cream palette — the whole kitchen draws from here.
export const PALETTE = {
  floorA: '#e8cfa8',
  floorB: '#dfc193',
  wall: '#b65c3a',
  wallTrim: '#8f4527',
  counterTop: '#f3e3c2',
  counterSide: '#a9805a',
  counterEdge: '#7d5a38',
  crate: '#c98d4b',
  crateDark: '#9c6a33',
  board: '#e9c98f',
  stoveTop: '#4a4a52',
  stoveHot: '#e2572b',
  pass: '#7fb069',
  trash: '#6b7280',
  ink: '#3a2418',
  cream: '#fff6e3',
  gold: '#f2b705',
  red: '#d64541',
  green: '#4c9a52',
  smoke: '#9aa0a6',
};

export const INGREDIENTS = {
  tomato: { name: 'Tomato', color: '#e14b3a', chop: true, cook: false, price: 2 },
  lettuce: { name: 'Lettuce', color: '#6fb84f', chop: true, cook: false, price: 2 },
  carrot: { name: 'Carrot', color: '#ef7d2e', chop: true, cook: false, price: 2 },
  potato: { name: 'Potato', color: '#d9b380', chop: true, cook: false, price: 2 },
  mushroom: { name: 'Mushroom', color: '#cbb9a3', chop: true, cook: false, price: 3 },
  bread: { name: 'Bread', color: '#d9a45b', chop: false, cook: true, price: 3 },
  cheese: { name: 'Cheese', color: '#f2c531', chop: false, cook: true, price: 3 },
  broth: { name: 'Broth', color: '#c98a2e', chop: false, cook: false, price: 3 },
};

// Each recipe step is an ingredient id plus the state it must be in
// when it lands on the plate: 'raw', 'chopped' or 'cooked'.
export const RECIPES = [
  {
    id: 'soup',
    name: 'Tomato Soup',
    price: 18,
    steps: [
      { ing: 'tomato', state: 'chopped' },
      { ing: 'broth', state: 'raw' },
    ],
  },
  {
    id: 'salad',
    name: 'Garden Salad',
    price: 16,
    steps: [
      { ing: 'lettuce', state: 'chopped' },
      { ing: 'tomato', state: 'chopped' },
    ],
  },
  {
    id: 'sandwich',
    name: 'Grilled Sandwich',
    price: 22,
    steps: [
      { ing: 'bread', state: 'cooked' },
      { ing: 'cheese', state: 'cooked' },
    ],
  },
  {
    id: 'stirfry',
    name: 'Veggie Stir-fry',
    price: 24,
    steps: [
      { ing: 'carrot', state: 'cooked' },
      { ing: 'mushroom', state: 'cooked' },
    ],
  },
  {
    id: 'stew',
    name: 'Hearty Stew',
    price: 28,
    steps: [
      { ing: 'potato', state: 'chopped' },
      { ing: 'carrot', state: 'chopped' },
      { ing: 'broth', state: 'raw' },
    ],
  },
];

// ---- difficulty helpers (config.js, part 2) ----

// Look a recipe up by id; returns undefined for an unknown id.
export function recipeById(id) {
  return RECIPES.find((r) => r.id === id);
}

// How long an order lives. Early orders are generous; later ones hurry.
export function orderSecondsFor(elapsed, steps) {
  const base = 72 - Math.min(24, elapsed * 0.12);
  return Math.max(34, base - (steps - 2) * 6);
}

// Tip fraction from how much of the order timer is left (0..1).
export function tipFor(fractionLeft) {
  if (fractionLeft > 0.66) return 0.5;
  if (fractionLeft > 0.33) return 0.25;
  return 0.1;
}

// Coins for a served order at the current combo multiplier.
export function coinsFor(recipe, fractionLeft, combo) {
  const tip = Math.round(recipe.price * tipFor(fractionLeft));
  return Math.round((recipe.price + tip) * combo);
}

// Seconds between order spawns shrink as the shift wears on.
export function spawnIntervalFor(elapsed) {
  return Math.max(9, ORDER_SPAWN_EVERY - elapsed * 0.02);
}

// A station label the player can read at a glance.
export function stationLabel(kind, extra) {
  const labels = {
    crate: 'CRATE',
    board: 'CHOP',
    stove: 'STOVE',
    plate: 'PLATE',
    pass: 'SERVE',
    trash: 'TRASH',
  };
  const base = labels[kind] || kind.toUpperCase();
  return extra ? base + ' · ' + extra : base;
}
