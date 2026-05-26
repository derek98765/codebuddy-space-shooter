import { SPRITES } from '../config/sprites.js';
import { explode } from '../utils/particles.js';

/**
 * Enemy Type A — Sniper
 * - Spawns from right edge, sine-wave vertical movement
 * - Periodically fires a slow bullet aimed at the player
 * - HP = 1 (1-hit KO)
 */
export class EnemyA {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y) {
    this.scene = scene;
    const cfg = SPRITES.enemyA;

    this._ensureTexture(scene, 'enemyA_tex', cfg.width, cfg.height, cfg.color);
    this.sprite = scene.physics.add.image(x, y, 'enemyA_tex');
    this.sprite.setDepth(8);
    this.sprite.setVelocityX(-90);

    this.spawnY = y;
    this.sineAmplitude = 70;
    this.sineSpeed = 1.8; // radians per second
    this.sineOffset = Math.random() * Math.PI * 2;
    this.elapsedTime = 0;

    this.fireInterval = Phaser.Math.Between(2200, 3500); // ms
    this.fireTimer = Phaser.Math.Between(800, 2000);

    this.hp = 1;
    this.alive = true;
    this.enemyBullets = null; // set from GameScene
    this._player = null;      // set from GameScene
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

    this.elapsedTime += delta / 1000;
    const newY = this.spawnY + Math.sin(this.elapsedTime * this.sineSpeed + this.sineOffset) * this.sineAmplitude;
    this.sprite.y = Phaser.Math.Clamp(newY, 20, this.scene.scale.height - 20);

    // Despawn off left edge
    if (this.sprite.x < -60) {
      this.alive = false;
      if (this.sprite.body) this.sprite.body.setEnable(false);
      this.sprite.setActive(false).setVisible(false);
      return;
    }

    // Fire timer
    if (this._player && this._player.alive && this.enemyBullets) {
      this.fireTimer -= delta;
      if (this.fireTimer <= 0) {
        this._fireAtPlayer();
        this.fireTimer = this.fireInterval;
      }
    }
  }

  _fireAtPlayer() {
    const cfg = SPRITES.bulletEnemy;
    if (!this.scene.textures.exists('bullet_enemy_tex')) {
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(cfg.color, 1);
      g.fillRect(0, 0, cfg.width, cfg.height);
      g.generateTexture('bullet_enemy_tex', cfg.width, cfg.height);
      g.destroy();
    }

    const speed = this._bulletSpeed ?? 160;
    const angles = [
      Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, this._player.x, this._player.y)
    ];
    if (this._dualAim) {
      angles.push(angles[0] + Phaser.Math.DegToRad(20));
    }

    for (const angle of angles) {
      const b = this.enemyBullets.get(this.sprite.x, this.sprite.y, 'bullet_enemy_tex');
      if (!b) continue;
      b.setActive(true).setVisible(true).setDepth(7);
      b.body.setEnable(true);
      b.body.reset(this.sprite.x, this.sprite.y);
      b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }

  /**
   * Called by GameScene to ramp up this enemy's difficulty.
   * level 1 = bullet speed +20%
   * level 2 = dual aim (fires at player from 2 angles)
   */
  scaleDifficulty(level) {
    if (level >= 1) {
      this._bulletSpeed = (this._bulletSpeed ?? 160) * 1.2;
    }
    if (level >= 2) {
      this._dualAim = true;
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
      explode(this.scene, this.sprite.x, this.sprite.y, 0xff3333, 14, 0.9);
      this.sprite.setActive(false).setVisible(false);
    }
  }

  destroy() {
    this.sprite.destroy();
  }
}
