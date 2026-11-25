// Ember Ladle — orders.js
// One clear job: the order queue, order timers, and scoring.
// It never draws and never moves the player.

import { RECIPES, MAX_ACTIVE_ORDERS, EXPIRE_PENALTY, COMBO_STEP, COMBO_MAX, orderSecondsFor, spawnIntervalFor, coinsFor } from './config.js';

let orderCounter = 0;

// Fresh order state for a shift.
export function createOrders() {
  return {
    active: [],
    served: 0,
    expired: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    spawnIn: 2.5,
    elapsed: 0,
  };
}

// Pick the next recipe. Early on only the two-step dishes appear;
// three-step dishes join once the shift is under way.
export function pickRecipe(elapsed) {
  const pool = elapsed < 40 ? RECIPES.slice(0, 3) : RECIPES;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Spawn one order if the board has room.
export function spawnOrder(orders, elapsed) {
  if (orders.active.length >= MAX_ACTIVE_ORDERS) return null;
  const recipe = pickRecipe(elapsed);
  const order = {
    id: ++orderCounter,
    recipe,
    total: orderSecondsFor(elapsed, recipe.steps.length),
    left: orderSecondsFor(elapsed, recipe.steps.length),
  };
  orders.active.push(order);
  return order;
}

// Advance timers by dt. Returns the orders that just expired.
export function tickOrders(orders, dt) {
  orders.elapsed += dt;
  orders.spawnIn -= dt;
  if (orders.spawnIn <= 0) {
    const made = spawnOrder(orders, orders.elapsed);
    if (made) orders.spawnIn = spawnIntervalFor(orders.elapsed);
    else orders.spawnIn = 2;
  }
  const expired = [];
  for (const order of orders.active) order.left -= dt;
  orders.active = orders.active.filter((order) => {
    if (order.left <= 0) {
      expired.push(order);
      return false;
    }
    return true;
  });
  for (const order of expired) {
    orders.expired += 1;
    orders.coins = Math.max(0, orders.coins - EXPIRE_PENALTY);
    orders.combo = 0;
  }
  return expired;
}

// Does a plated set of items match an order exactly? Order of items
// on the plate does not matter; every step must be present once.
export function plateMatchesOrder(plateItems, order) {
  const steps = order.recipe.steps;
  if (plateItems.length !== steps.length) return false;
  const used = new Array(steps.length).fill(false);
  for (const item of plateItems) {
    let found = false;
    for (let i = 0; i < steps.length; i++) {
      if (!used[i] && steps[i].ing === item.ing && steps[i].state === item.state) {
        used[i] = true;
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

// Find the active order a plate can serve, or null.
export function findMatchingOrder(plateItems, orders) {
  for (const order of orders.active) {
    if (plateMatchesOrder(plateItems, order)) return order;
  }
  return null;
}

// ---- serving and scoring (orders.js, part 2) ----

// Serve a plate to its matching order. Returns the coins earned and
// the tip, and updates combo, served count and the coin total.
export function serveOrder(orders, order, plateItems) {
  const fractionLeft = Math.max(0, order.left / order.total);
  const combo = Math.min(COMBO_MAX, 1 + orders.combo * COMBO_STEP);
  const earned = coinsFor(order.recipe, fractionLeft, combo);
  orders.coins += earned;
  orders.served += 1;
  orders.combo += 1;
  orders.bestCombo = Math.max(orders.bestCombo, orders.combo);
  orders.active = orders.active.filter((o) => o.id !== order.id);
  return { earned, combo, fractionLeft };
}

// Current combo multiplier shown on the HUD.
export function comboMultiplier(orders) {
  return Math.min(COMBO_MAX, 1 + orders.combo * COMBO_STEP);
}

// Fraction of the shift that has passed (0..1).
export function shiftFraction(orders, shiftSeconds) {
  return Math.min(1, orders.elapsed / shiftSeconds);
}

// Seconds left in the shift (never below zero).
export function shiftLeft(orders, shiftSeconds) {
  return Math.max(0, shiftSeconds - orders.elapsed);
}

// Is the rush on? The last 45 seconds spawn a little faster and the
// HUD shows the rush banner.
export function isRush(orders, shiftSeconds) {
  return shiftLeft(orders, shiftSeconds) <= 45;
}

// A one-line summary for the end-of-shift screen.
export function shiftSummary(orders) {
  const total = orders.served + orders.expired;
  const accuracy = total === 0 ? 100 : Math.round((orders.served / total) * 100);
  return {
    coins: orders.coins,
    served: orders.served,
    expired: orders.expired,
    bestCombo: orders.bestCombo,
    accuracy,
  };
}
