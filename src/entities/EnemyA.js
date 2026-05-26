import { SPRITES } from '../config/sprites.js';

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

    const b = this.enemyBullets.get(this.sprite.x, this.sprite.y, 'bullet_enemy_tex');
    if (!b) return;
    b.setActive(true).setVisible(true).setDepth(7);
    b.body.setEnable(true);
    b.body.reset(this.sprite.x, this.sprite.y);

    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      this._player.x, this._player.y
    );
    const speed = 160;
    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  hit(damage = 1) {
    if (!this.alive) return;
    console.log(`[EnemyA] hit(${damage}) — hp before=${this.hp}`);
    this.hp -= damage;
    // Flash white on hit
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.2,
      duration: 50,
      yoyo: true,
      onComplete: () => { if (this.sprite) this.sprite.setAlpha(1); }
    });
    if (this.hp <= 0) {
      this.alive = false;
      if (this.sprite.body) this.sprite.body.setEnable(false);
      this.sprite.setActive(false).setVisible(false);
    }
  }

  destroy() {
    this.sprite.destroy();
  }
}
