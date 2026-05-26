/**
 * particles.js — Phaser 3.60 particle helpers
 *
 * Uses the new Phaser 3.60 API:
 *   scene.add.particles(x, y, texture, emitterConfig)
 * which returns a ParticleEmitter directly.
 */

/**
 * Play the explode spritesheet animation at (x, y) and destroy it when done.
 * Falls back to the particle burst if the spritesheet isn't loaded.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} [size=96] - display size in pixels (square)
 */
export function explodeSprite(scene, x, y, size = 96) {
  if (!scene.textures.exists('explode')) {
    explode(scene, x, y, 0xff6600, 16, 1.0);
    return;
  }
  const anim = scene.add.sprite(x, y, 'explode', 0)
    .setDisplaySize(size, size)
    .setDepth(16)
    .setOrigin(0.5, 0.5);
  anim.play('explode');
  anim.once('animationcomplete', () => anim.destroy());
}

/**
 * Fire a one-shot burst of particles at (x, y).
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} color  - hex tint colour (e.g. 0xff3333)
 * @param {number} [count=16] - particle count
 * @param {number} [scale=1]  - size multiplier
 */
export function explode(scene, x, y, color, count = 16, scale = 1) {
  _ensureParticleTex(scene);

  const emitter = scene.add.particles(x, y, '_particle_dot', {
    color: [color, 0xffffff],
    colorEase: 'power2',
    lifespan: { min: 280, max: 520 },
    speed: { min: 60 * scale, max: 220 * scale },
    scale: { start: scale * 1.4, end: 0 },
    quantity: count,
    emitting: false,
    depth: 15,
  });

  emitter.explode(count, 0, 0);

  // Clean up after longest particle lifetime
  scene.time.delayedCall(600, () => {
    if (emitter && emitter.scene) emitter.destroy();
  });
}

/**
 * Fire a multi-wave large explosion (Boss death, ~2 s).
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 */
export function bossExplosion(scene, x, y) {
  _ensureParticleTex(scene);

  const waves = [
    { delay: 0,   color: 0xff6600, count: 28, scale: 2.4 },
    { delay: 180, color: 0xff2222, count: 20, scale: 2.0 },
    { delay: 380, color: 0xffaa00, count: 22, scale: 1.8 },
    { delay: 600, color: 0xff8800, count: 18, scale: 1.5 },
    { delay: 900, color: 0xffffff, count: 14, scale: 1.2 },
    { delay: 1200, color: 0xff4444, count: 10, scale: 1.0 },
  ];

  for (const w of waves) {
    scene.time.delayedCall(w.delay, () => {
      if (!scene.scene.isActive()) return;
      const dx = Phaser.Math.Between(-30, 30);
      const dy = Phaser.Math.Between(-20, 20);
      explode(scene, x + dx, y + dy, w.color, w.count, w.scale);
    });
  }
}

/**
 * Create a continuous engine trail that follows a sprite.
 * Returns the emitter so the caller can stop/destroy it.
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Image} sprite  - sprite to follow
 * @returns {Phaser.GameObjects.Particles.ParticleEmitter}
 */
export function createEngineTrail(scene, sprite) {
  _ensureParticleTex(scene);

  const emitter = scene.add.particles(0, 0, '_particle_dot', {
    color: [0x88bbff, 0xffffff, 0x4488ff],
    colorEase: 'power1',
    lifespan: { min: 120, max: 260 },
    speed: { min: 20, max: 60 },
    angle: { min: 160, max: 200 },   // fires backward (left)
    scale: { start: 0.9, end: 0 },
    quantity: 2,
    frequency: 30,                    // ms between emissions
    follow: sprite,
    followOffset: { x: -20, y: 0 },  // behind the ship nose
    depth: 9,
  });

  return emitter;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function _ensureParticleTex(scene) {
  if (scene.textures.exists('_particle_dot')) return;
  const size = 6;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffffff, 1);
  g.fillCircle(size / 2, size / 2, size / 2);
  g.generateTexture('_particle_dot', size, size);
  g.destroy();
}
