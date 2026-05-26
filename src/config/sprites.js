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
    width: 125,
    height: 74,
    color: 0x4488ff,
  },
  bulletNormal: {
    key: 'bullet-1',
    width: 36,
    height: 15,
    color: 0xffff88,
  },
  bulletCharged: {
    key: 'bullet-1',
    width: 52,
    height: 22,
    color: 0xff8800,
  },
  bulletEnemy: {
    width: 8,
    height: 5,
    color: 0xff4444,
  },
  enemyA: {
    key: 'enemy-1',
    width: 112,
    height: 62,
    color: 0xff3333,
  },
  enemyB: {
    key: 'enemy-2',
    width: 77,
    height: 68,
    color: 0xff8800,
  },
  enemyC: {
    key: 'enemy-3',
    width: 106,
    height: 94,
    color: 0x22aa44,
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
    variants: [
      ['carrier-1', 194, 83],
      ['carrier-2', 165, 83],
      ['carrier-3', 216, 83],
    ],
    width: 192,
    height: 83,
    color: 0x6622aa,
  },
  enemyE: {
    key: 'enemy-4',
    width: 94,
    height: 97,
    color: 0xcc2266,
  },
};
