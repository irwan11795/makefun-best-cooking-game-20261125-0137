# Ember Ladle — a tiny hearth kitchen

[![Ember Ladle](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![Rank](https://make.fun/badge/best-cooking-game-20261125-0137/irwan11795/makefun-best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![Reward](https://make.fun/badge/best-cooking-game-20261125-0137/irwan11795/makefun-best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

A complete, original 2D cooking game for the make.fun bounty
[Make the best cooking game](https://make.fun/bounty/best-cooking-game-20261125-0137).
Run a tiny hearth kitchen through a 3-minute shift: grab ingredients from
crates, chop them on the board, grill them on two burners, plate the dish
and serve it at the pass before the order ticket runs out.

## How to play

```sh
npx serve game
```

Then open the printed address in a desktop browser and press Enter.

- **Move:** WASD or arrow keys — or click anywhere to walk there.
- **Interact:** E or Space — grab, chop (hold), cook, plate, serve, trash.
  Clicking a station walks the cook there and uses it.
- **Chop:** put a choppable ingredient on the board, hold E until the ring
  fills, then pick the chopped pieces up.
- **Cook:** put grillable food on a burner. Take it off in time — leave it
  too long and it burns. Burnt food goes in the trash.
- **Serve:** build the exact dish on the plating counter, pick the plate up
  and press E at the green serving pass.
- **P** pause · **R** restart · **M** mute.

## Recipes

| Dish | Needs |
| --- | --- |
| Tomato Soup | chopped tomato + broth |
| Garden Salad | chopped lettuce + chopped tomato |
| Grilled Sandwich | grilled bread + grilled cheese |
| Veggie Stir-fry | grilled chopped carrot + grilled chopped mushroom |
| Hearty Stew | chopped potato + chopped carrot + broth |

Fast serves earn tips; serving on time in a row builds a combo multiplier
(up to x3). An expired order costs 15 coins and resets the combo. The last
45 seconds are the service rush: tickets arrive faster and timers bite.

## What is inside

- `game/index.html` — the page: canvas, help line, loads the game.
- `game/src/config.js` — recipes, timings, colours, names.
- `game/src/input.js` — keyboard + mouse state.
- `game/src/audio.js` — WebAudio synth effects (chop, ding, buzz).
- `game/src/world.js` — kitchen layout, movement, collision, stations.
- `game/src/orders.js` — order queue, timers, scoring, combo.
- `game/src/render.js` — all canvas drawing: kitchen, cook, food, HUD.
- `game/src/main.js` — game loop and state machine (title → playing → end).
- `main.ts` — the make.fun hand-in program (copies game + screenshots to
  `/output` and writes `dossier.json`).

## License

MIT — see [LICENSE](LICENSE).
