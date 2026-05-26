// Visual config for all game entities.
// To swap in real pixel art:
//   1. Drop sprite files into /assets
//   2. Update the `key` field with the asset key
//   3. Set `useTexture: true` on the entity
//   4. No game-logic changes required.

export const SPRITES = {
  player: {
    key: 'spaceship-default',
    keyUp: 'spaceship-up',
    keyDown: 'spaceship-down',
    width: 104,
    height: 62,
    color: 0x4488ff,
  },
  bulletNormal: {
    width: 12,
    height: 5,
    color: 0xffff88,
  },
  bulletCharged: {
    width: 24,
    height: 12,
    color: 0xff8800,
  },
  bulletEnemy: {
    width: 8,
    height: 5,
    color: 0xff4444,
  },
  enemyA: {
    width: 83,
    height: 52,
    color: 0xff3333,
  },
  enemyB: {
    width: 73,
    height: 57,
    color: 0xff8800,
  },
  enemyC: {
    width: 114,
    height: 78,
    color: 0x22aa44,  // green tank
  },
  boss: {
    key: 'boss',
    width: 678,
    height: 600,
    color: 0x222244,
  },
  bossBulletSpread: {
    width: 10,
    height: 10,
    color: 0xff00ff,
  },
  bossBulletAimed: {
    width: 14,
    height: 14,
    color: 0xff6666,
  },
  enemyD: {
    width: 120,
    height: 88,
    color: 0x6622aa,  // purple carrier
  },
};
