import { SPRITES } from '../config/sprites.js';
import { explode } from '../utils/particles.js';

/**
 * Enemy Type B — Kamikaze
 * - Spawns from right edge in formation
 * - Flies straight left until within ~200px of player
 * - Then dives directly toward player at high speed
 * - 1-hit death
 */
export class EnemyB {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y) {
    this.scene = scene;
    const cfg = SPRITES.enemyB;

    this._ensureTexture(scene, 'enemyB_tex', cfg.width, cfg.height, cfg.color);
    this.sprite = scene.physics.add.image(x, y, 'enemyB_tex');
    this.sprite.setDepth(8);
    this.sprite.setVelocityX(-130);

    this.diving = false;
    this.hp = 3;
    this.alive = true;
    this._player = null; // set from GameScene
  }

  _ensureTexture(scene, key, w, h, color) {
    if (!scene.textures.exists(key)) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillRect(0, 0, w, h);
      g.generateTexture(key, w, h);
      g.destroy();
    }
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(time, delta) {
    if (!this.alive || !this.sprite.active) return;

    // Despawn off left edge
    if (this.sprite.x < -60 || this.sprite.y < -60 || this.sprite.y > this.scene.scale.height + 60) {
      this.alive = false;
      if (this.sprite.body) this.sprite.body.setEnable(false);
      this.sprite.setActive(false).setVisible(false);
      return;
    }

    // Kamikaze dive trigger
    if (!this.diving && this._player && this._player.alive) {
      const dist = Phaser.Math.Distance.Between(
        this.sprite.x, this.sprite.y,
        this._player.x, this._player.y
      );
      if (dist <= (this._diveRange ?? 200)) {
        this.diving = true;
        const angle = Phaser.Math.Angle.Between(
          this.sprite.x, this.sprite.y,
          this._player.x, this._player.y
        );
        const diveSpeed = 340;
        this.sprite.setVelocity(
          Math.cos(angle) * diveSpeed,
          Math.sin(angle) * diveSpeed
        );
      }
    }
  }

  /**
   * level 1 = reduce kamikaze dive trigger range from 200 → 150 px
   */
  scaleDifficulty(level) {
    if (level >= 1) {
      this._diveRange = 150;
    }
  }

  hit(damage = 1) {
    if (!this.alive) return;
    this.hp -= damage;
    this.sprite.setTintFill(0xffffff);
    this.sprite.setAlpha(0.6);
    this.scene.time.delayedCall(70, () => { if (this.sprite) { this.sprite.clearTint(); this.sprite.setAlpha(1); } });
    if (this.hp <= 0) {
      this.alive = false;
      if (this.sprite.body) this.sprite.body.setEnable(false);
      explode(this.scene, this.sprite.x, this.sprite.y, 0xff8800, 14, 0.85);
      this.sprite.setActive(false).setVisible(false);
    }
  }

  destroy() {
    this.sprite.destroy();
  }
}
