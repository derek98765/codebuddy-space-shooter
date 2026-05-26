// Visual config for all game entities.
// To swap in real pixel art:
//   1. Drop sprite files into /assets
//   2. Update the `key` field with the asset key
//   3. Set `useTexture: true` on the entity
//   4. No game-logic changes required.

export const SPRITES = {
  player: {
    width: 40,
    height: 24,
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
    width: 32,
    height: 20,
    color: 0xff3333,
  },
  enemyB: {
    width: 28,
    height: 22,
    color: 0xff8800,
  },
  enemyC: {
    width: 44,
    height: 30,
    color: 0x22aa44,  // green tank
  },
  boss: {
    width: 240,
    height: 720,
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
    width: 46,
    height: 34,
    color: 0x6622aa,  // purple carrier
  },
};
