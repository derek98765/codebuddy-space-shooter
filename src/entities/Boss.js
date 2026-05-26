import { SPRITES } from '../config/sprites.js';

/**
 * Boss — single phase, 3-cycle attack behaviors
 * HP = 20 (normal bullet = 1 hit, charged bullet = 5 hits)
 */
export class Boss {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y) {
    this.scene = scene;
    const cfg = SPRITES.boss;

    this._ensureTexture(scene, 'boss_tex', cfg.width, cfg.height, cfg.color);
    // Accent stripe
    if (!scene.textures.exists('boss_accent_tex')) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x4444aa, 1);
      g.fillRect(0, 0, cfg.width, cfg.height);
      g.fillStyle(0x8888ff, 1);
      g.fillRect(4, 8, 8, cfg.height - 16);
      g.fillRect(4, 8, cfg.width - 8, 6);
      g.generateTexture('boss_accent_tex', cfg.width, cfg.height);
      g.destroy();
    }

    this.sprite = scene.physics.add.image(x, y, 'boss_accent_tex');
    this.sprite.setDepth(8);
    this.sprite.body.moves = false;
    this.sprite.body.setAllowGravity(false);

    this.hp = 20;
    this.maxHp = 20;
    this.alive = true;
    this.behaviorIndex = 0; // 0=spread, 1=aimed, 2=lunge
    this.behaviorTimer = 99999; // large sentinel — entrance tween will set the real value
    this.behaviorInterval = 2800; // ms between behaviors
    this.lunging = false;
    this.homeX = x;
    this.homeY = y;

    this._player = null;       // set from GameScene
    this.spreadBullets = null; // set from GameScene
    this.aimedBullets = null;  // set from GameScene

    // Idle bob
    this.bobOffset = 0;
    this.bobSpeed = 1.2;
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

  _syncBody() {
    if (this.sprite.body && this.sprite.body.enable) {
      this.sprite.body.reset(this.sprite.x, this.sprite.y);
    }
  }

  update(time, delta) {
    if (!this.alive) return;

    // Idle vertical bob (when not lunging)
    if (!this.lunging) {
      this.bobOffset += delta / 1000 * this.bobSpeed;
      this.sprite.y = this.homeY + Math.sin(this.bobOffset) * 18;
      this._syncBody();
    }

    this.behaviorTimer -= delta;
    if (this.behaviorTimer <= 0) {
      this._executeBehavior();
      this.behaviorIndex = (this.behaviorIndex + 1) % 3;
      this.behaviorTimer = this.behaviorInterval;
    }
  }

  _executeBehavior() {
    switch (this.behaviorIndex) {
      case 0: this._spreadShot(); break;
      case 1: this._aimedShot(); break;
      case 2: this._lunge(); break;
    }
  }

  _spreadShot() {
    if (!this.spreadBullets) return;
    const cfg = SPRITES.bossBulletSpread;
    this._ensureBulletTex('boss_spread_tex', cfg.width, cfg.height, cfg.color);

    const angles = [-30, -15, 0, 15, 30]; // degrees, firing left
    angles.forEach(deg => {
      const rad = Phaser.Math.DegToRad(180 + deg);
      const b = this.spreadBullets.get(this.sprite.x, this.sprite.y, 'boss_spread_tex');
      if (!b) return;
      b.setActive(true).setVisible(true).setDepth(7);
      b.body.setEnable(true);
      b.body.reset(this.sprite.x, this.sprite.y);
      const speed = 200;
      b.setVelocity(Math.cos(rad) * speed, Math.sin(rad) * speed);
    });
  }

  _aimedShot() {
    if (!this.aimedBullets || !this._player || !this._player.alive) return;
    const cfg = SPRITES.bossBulletAimed;
    this._ensureBulletTex('boss_aimed_tex', cfg.width, cfg.height, cfg.color);

    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      this._player.x, this._player.y
    );
    const b = this.aimedBullets.get(this.sprite.x, this.sprite.y, 'boss_aimed_tex');
    if (!b) return;
    b.setActive(true).setVisible(true).setDepth(7);
    b.body.setEnable(true);
    b.body.reset(this.sprite.x, this.sprite.y);
    const speed = 180;
    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  _lunge() {
    if (!this._player || this.lunging) return;
    this.lunging = true;
    const targetX = this._player.x + 60;
    const targetY = this._player.y;

    this.scene.tweens.add({
      targets: this.sprite,
      x: targetX,
      y: targetY,
      duration: 380,
      ease: 'Power2',
      onUpdate: () => {
        this._syncBody();
      },
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.sprite,
          x: this.homeX,
          y: this.homeY,
          duration: 520,
          ease: 'Power1',
          onUpdate: () => {
            this._syncBody();
          },
          onComplete: () => {
            this.lunging = false;
            this._syncBody();
          }
        });
      }
    });
  }

  _ensureBulletTex(key, w, h, color) {
    if (!this.scene.textures.exists(key)) {
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillCircle(w / 2, h / 2, w / 2);
      g.generateTexture(key, w, h);
      g.destroy();
    }
  }

  hit(damage = 1) {
    if (!this.alive) return;
    console.log(`[Boss] hit(${damage}) — hp before=${this.hp}`);
    this.hp -= damage;
    // Flash effect
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.2,
      duration: 60,
      yoyo: true,
      onComplete: () => this.sprite.setAlpha(1)
    });
    this.scene.game.events.emit('bossHpUpdate', this.hp, this.maxHp);

    if (this.hp <= 0) {
      this._die();
    }
  }

  _die() {
    console.log('[Boss] _die() called — emitting bossDefeated');
    this.alive = false;
    if (this.sprite.body) {
      this.sprite.body.setEnable(false);
    }
    this.sprite.setActive(false).setVisible(false);
    // Notify GameScene
    this.scene.game.events.emit('bossDefeated');
  }

  destroy() {
    this.sprite.destroy();
  }
}
