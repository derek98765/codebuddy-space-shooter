/**
 * PowerUp — collectible pickup
 * Drifts left; player overlap activates a weapon mode.
 *
 * types: 'spread' | 'missile' | 'rapid'
 */

const COLORS = {
  spread:  0x00eeff,
  missile: 0xff4400,
  rapid:   0xffee00,
};

const LABELS = {
  spread:  'S',
  missile: 'M',
  rapid:   'R',
};

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

    const color = COLORS[type] ?? 0xffffff;
    const size = 70;

    this._ensureTexture(scene, `powerup_${type}_tex`, size, color);
    this.sprite = scene.physics.add.image(x, y, `powerup_${type}_tex`);
    this.sprite.setDepth(12);
    this.sprite.setVelocityX(-80);
    this.sprite.setVelocityY(0);

    // Floating bob
    this._spawnY = y;
    this._elapsed = Math.random() * Math.PI * 2;

    // Label overlay
    this._label = scene.add.text(x, y, LABELS[type] ?? '?', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#000000',
    }).setOrigin(0.5, 0.5).setDepth(13);

    // Pulsing alpha tween
    this._tween = scene.tweens.add({
      targets: this.sprite,
      alpha: 0.55,
      yoyo: true,
      repeat: -1,
      duration: 420,
    });
  }

  _ensureTexture(scene, key, size, color) {
    if (!scene.textures.exists(key)) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillCircle(size / 2, size / 2, size / 2);
      g.generateTexture(key, size, size);
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
    this._label.setPosition(this.sprite.x, this.sprite.y);

    // Despawn off left edge
    if (this.sprite.x < -40) {
      this.collect(); // silent despawn
    }
  }

  /** Called when player picks it up (or it leaves screen). */
  collect() {
    if (!this.alive) return;
    this.alive = false;
    if (this._tween) this._tween.stop();
    if (this.sprite.body) this.sprite.body.setEnable(false);
    this.sprite.setActive(false).setVisible(false);
    this._label.setVisible(false);
  }

  destroy() {
    if (this._tween) this._tween.stop();
    this._label.destroy();
    this.sprite.destroy();
  }
}
