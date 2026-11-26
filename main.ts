import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, cpSync, writeFileSync, existsSync } from 'node:fs';
import { buildDossier } from './vendor/makefun-game.ts';

/**
 * Main entry point for Langit Nusantara (Nusantara Skies) bounty submission.
 * Packages the game and screenshots into the output directory and generates dossier.json.
 */

// Resolve paths relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const gameSrc = join(__dirname, 'game');
const screenshotsSrc = join(__dirname, 'screenshots');

const gameDest = join(outputDir, 'game');
const screenshotsDest = join(outputDir, 'screenshots');

// Ensure output directory and subdirectories exist
mkdirSync(outputDir, { recursive: true });
mkdirSync(gameDest, { recursive: true });
mkdirSync(screenshotsDest, { recursive: true });

// Copy game assets
if (existsSync(gameSrc)) {
    cpSync(gameSrc, gameDest, { recursive: true });
}

// Copy screenshots if they exist
if (existsSync(screenshotsSrc)) {
    cpSync(screenshotsSrc, screenshotsDest, { recursive: true });
}

// Generate dossier.json using makefun library
// Dossier requirements from bounty instructions
const dossierBytes = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { 
        max: 4, 
        max_bytes: 262144 
    },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000
});

const dossierPath = join(outputDir, 'dossier.json');
writeFileSync(dossierPath, dossierBytes);

console.log(`Successfully built Langit Nusantara dossier at ${dossierPath}`);
