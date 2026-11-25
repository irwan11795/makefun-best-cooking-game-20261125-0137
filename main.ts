// Ember Ladle — main.ts
// The make.fun hand-in program: copy game/ and screenshots/ from this
// repository into the output directory and write /output/dossier.json
// with buildDossier from the kit's vendor/makefun-game.ts.
// Node 22, standard library only. No network, no side effects.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// The dossier caps from the competition rules: source text capped at
// 160 KiB, at most 4 screenshots of 256 KiB each, game/ within its caps.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

function fail(message: string): never {
  console.error('main.ts: ' + message);
  process.exit(1);
}

// Copy one directory tree, plain files and directories only.
function copyTree(src: string, dest: string): void {
  if (!existsSync(src)) fail('missing directory: ' + src);
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyTree(from, to);
    } else if (entry.isFile()) {
      cpSync(from, to);
    } else {
      fail('not a plain file or directory: ' + from);
    }
  }
}

// ---- main entry (main.ts, part 2) ----

function main(): void {
  const gameDir = join(repoRoot, 'game');
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html not found');
  if (!existsSync(shotsDir)) fail('screenshots/ not found');
  const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) fail('screenshots/ must hold 3 or 4 images, found ' + shots.length);

  // Start from a clean output directory so two runs write identical bytes.
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  copyTree(gameDir, join(outDir, 'game'));
  copyTree(shotsDir, join(outDir, 'screenshots'));

  // buildDossier reads game/ and screenshots/ from the output directory
  // and returns the exact dossier bytes; write them unchanged.
  const dossier = buildDossier(outDir, DOSSIER_CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);

  const gameFiles = readdirSync(join(outDir, 'game'), { recursive: true }).length;
  const shotBytes = shots.reduce((sum, n) => sum + statSync(join(outDir, 'screenshots', n)).size, 0);
  console.log('Ember Ladle: wrote ' + outDir + ' (game entries: ' + gameFiles + ', screenshots: ' + shots.length + ', ' + shotBytes + ' bytes, dossier: ' + dossier.length + ' bytes)');
}

main();
