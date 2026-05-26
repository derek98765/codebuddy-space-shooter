import { StartScene } from './scenes/StartScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { WinScene } from './scenes/WinScene.js';
import { PauseScene } from './scenes/PauseScene.js';

export const SCENE_KEYS = {
  START: 'StartScene',
  GAME: 'GameScene',
  UI: 'UIScene',
  GAME_OVER: 'GameOverScene',
  WIN: 'WinScene',
  PAUSE: 'PauseScene',
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
  scene: [StartScene, GameScene, UIScene, GameOverScene, WinScene, PauseScene],
};

new Phaser.Game(config);
