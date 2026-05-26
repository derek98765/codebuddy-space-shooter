import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { WinScene } from './scenes/WinScene.js';

export const SCENE_KEYS = {
  GAME: 'GameScene',
  UI: 'UIScene',
  GAME_OVER: 'GameOverScene',
  WIN: 'WinScene',
};

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [GameScene, UIScene, GameOverScene, WinScene],
};

new Phaser.Game(config);
