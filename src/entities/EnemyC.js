import { SPRITES } from '../config/sprites.js';

/**
 * Enemy Type C — Tank
 * - Slow straight movement left
 * - HP = 5 (takes several hits to kill)
 * - Fires a 3-bullet burst aimed at the player every ~2.5s
 */
export class EnemyC {
  constructor(scene, x, y) {
    this.scene = scene;
    const cfg = SPRITES.enemyC;

    this._ensureTexture(scene, 'enemyC_tex', cfg.width, cfg.height, cfg.color);
    this.sprite = scene.physics.add.image(x, y, 'enemyC_tex');
    this.sprite.setDepth(8);
    this.sprite.setVelocityX(-55); // slow

    this.hp = 6;
    this.alive = true;
    this.enemyBullets = null; // set from GameScene
    this._player = null;      // set from GameScene

    this.burstTimer = Phaser.Math.Between(1500, 2800);
    this.burstInterval = Phaser.Math.Between(2200, 3000);
    this._bursting = false;
  }

  _ensureTexture(scene, key, w, h, color) {
    if (!scene.textures.exists(key)) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillRect(0, 0, w, h);
      // Darker border stripe for visual detail
      g.fillStyle(0x004400, 1);
      g.fillRect(0, 0, w, 4);
      g.fillRect(0, h - 4, w, 4);
      g.generateTexture(key, w, h);
      g.destroy();
    }
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(time, delta) {
    if (!this.alive || !this.sprite.active) return;

    // Despawn off left edge
    if (this.sprite.x < -80) {
      this.alive = false;
      if (this.sprite.body) this.sprite.body.setEnable(false);
      this.sprite.setActive(false).setVisible(false);
      return;
    }

    // Burst fire timer
    if (this._player && this._player.alive && this.enemyBullets) {
      this.burstTimer -= delta;
      if (this.burstTimer <= 0 && !this._bursting) {
        this._fireBurst();
        this.burstTimer = this.burstInterval;
      }
    }
  }

  _fireBurst() {
    if (!this._player || !this.enemyBullets) return;
    this._bursting = true;
    const count = 3;
    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(i * 140, () => {
        if (!this.alive || !this.sprite.active) return;
        this._fireOne();
      });
    }
    this.scene.time.delayedCall(count * 140 + 50, () => {
      this._bursting = false;
    });
  }

  _fireOne() {
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
    const speed = 175;
    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  hit(damage = 1) {
    if (!this.alive) return;
    console.log(`[EnemyC] hit(${damage}) — hp before=${this.hp}`);
    this.hp -= damage;
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.2,
      duration: 60,
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
