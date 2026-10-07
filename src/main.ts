import Phaser from 'phaser';
import { CSS, GAME_HEIGHT, GAME_WIDTH, PHYSICS } from './config';
import { AlbumScene } from './scenes/AlbumScene';
import { BootScene } from './scenes/BootScene';
import { LevelScene } from './scenes/LevelScene';
import { MapScene } from './scenes/MapScene';
import { PauseScene } from './scenes/PauseScene';
import { ResultScene } from './scenes/ResultScene';
import { sound } from './systems/sound';
import { TitleScene } from './scenes/TitleScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: CSS.night,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: PHYSICS.gravity }, debug: false },
  },
  input: { activePointers: 4 },
  // Album et Pause sont après Result : ils s'affichent par-dessus tout le reste.
  scene: [BootScene, TitleScene, MapScene, LevelScene, ResultScene, AlbumScene, PauseScene],
});

// Safari n'autorise le son qu'après un geste de l'utilisateur.
for (const ev of ['pointerup', 'touchend', 'keydown', 'click']) window.addEventListener(ev, () => sound.unlock(), { passive: true });

// Pratique pour déboguer depuis la console du navigateur.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;

// Tablette en portrait : le message « tourne la tablette » (index.html) recouvre l'écran, on met le jeu en pause.
const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
const syncOrientation = () => (portrait.matches ? game.pause() : game.resume());
portrait.addEventListener('change', syncOrientation);
if (portrait.matches) game.events.once(Phaser.Core.Events.READY, syncOrientation);

// Appui long sur un bouton tactile : pas de menu contextuel.
window.addEventListener('contextmenu', (e) => e.preventDefault());

// Hors connexion : le service worker (public/sw.js) garde le jeu en cache. Seulement dans le build final.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
