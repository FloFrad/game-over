import Phaser from 'phaser';
import { CSS, GAME_HEIGHT, GAME_WIDTH, PHYSICS } from './config';
import { BootScene } from './scenes/BootScene';
import { LevelScene } from './scenes/LevelScene';
import { ResultScene } from './scenes/ResultScene';
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
  scene: [BootScene, TitleScene, LevelScene, ResultScene],
});

// Pratique pour déboguer depuis la console du navigateur.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
