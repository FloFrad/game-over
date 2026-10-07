import Phaser from 'phaser';
import { CSS, GAME_HEIGHT, GAME_WIDTH, PHYSICS } from './config';
import { AlbumScene } from './scenes/AlbumScene';
import { BootScene } from './scenes/BootScene';
import { LevelScene } from './scenes/LevelScene';
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
  scene: [BootScene, TitleScene, LevelScene, ResultScene, AlbumScene, PauseScene],
});

// Safari n'autorise le son qu'après un geste de l'utilisateur.
for (const ev of ['pointerup', 'touchend', 'keydown', 'click']) window.addEventListener(ev, () => sound.unlock(), { passive: true });

// Pratique pour déboguer depuis la console du navigateur.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
