/**
 * PowerUp — collectible pickup
 * Drifts left; player overlap activates a weapon mode.
 *
 * types: 'spread' | 'missile' | 'rapid'
 */

const TEXTURE_KEYS = {
  spread:  'power-up-diverge',
  missile: 'power-up-missile',
  rapid:   'power-up-rapid',
};

const SIZE = 64; // display size (square)

export class PowerUp {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {'spread'|'missile'|'rapid'} type
   */
  constructor(scene, x, y, type) {
    this.scene = scene;
    this.type = type;
    this.alive = true;

    const texKey = TEXTURE_KEYS[type] ?? 'power-up-rapid';

    if (scene.textures.exists(texKey)) {
      this.sprite = scene.physics.add.image(x, y, texKey);
      this.sprite.setDisplaySize(SIZE, SIZE);
    } else {
      this._ensureFallbackTexture(scene, type);
      this.sprite = scene.physics.add.image(x, y, `powerup_${type}_tex`);
    }

    this.sprite.setDepth(12);
    this.sprite.setVelocityX(-80);
    this.sprite.setVelocityY(0);

    // Floating bob
    this._spawnY = y;
    this._elapsed = Math.random() * Math.PI * 2;

    // Pulsing scale tween
    this._tween = scene.tweens.add({
      targets: this.sprite,
      scaleX: this.sprite.scaleX * 1.12,
      scaleY: this.sprite.scaleY * 1.12,
      yoyo: true,
      repeat: -1,
      duration: 420,
      ease: 'Sine.easeInOut',
    });
  }

  _ensureFallbackTexture(scene, type) {
    const COLORS = { spread: 0x00eeff, missile: 0xff4400, rapid: 0xffee00 };
    const key = `powerup_${type}_tex`;
    if (!scene.textures.exists(key)) {
      const color = COLORS[type] ?? 0xffffff;
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillCircle(SIZE / 2, SIZE / 2, SIZE / 2);
      g.generateTexture(key, SIZE, SIZE);
      g.destroy();
    }
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(time, delta) {
    if (!this.alive || !this.sprite.active) return;

    // Bob vertically
    this._elapsed += delta / 1000;
    this.sprite.y = this._spawnY + Math.sin(this._elapsed * 2.5) * 10;

    // Despawn off left edge
    if (this.sprite.x < -40) {
      this.collect();
    }
  }

  /** Called when player picks it up (or it leaves screen). */
  collect() {
    if (!this.alive) return;
    this.alive = false;
    if (this._tween) this._tween.stop();
    if (this.sprite.body) this.sprite.body.setEnable(false);
    this.sprite.setActive(false).setVisible(false);
  }

  destroy() {
    if (this._tween) this._tween.stop();
    this.sprite.destroy();
  }
}
