import { SPRITES } from '../config/sprites.js';
import { explodeSprite } from '../utils/particles.js';

/**
 * Enemy Type D — Carrier
 * - Slow straight movement left (like EnemyC but slower)
 * - HP = 3
 * - Purple-tinted
 * - Fires a single aimed shot every ~3 s
 * - Guaranteed power-up drop on death (type determined by caller via onDrop callback)
 */
export class EnemyD {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {Function} onDrop  - called with (x, y, powerUpType) when this enemy dies
   */
  constructor(scene, x, y, onDrop, variantIndex = 0) {
    this.scene = scene;
    const cfg = SPRITES.enemyD;

    const variants = cfg.variants ?? [];
    const available = variants.filter(([k]) => scene.textures.exists(k));
    if (available.length > 0) {
      const [texKey, dw, dh] = available[variantIndex % available.length];
      this.sprite = scene.physics.add.image(x, y, texKey);
      this.sprite.setDisplaySize(dw, dh);
    } else {
      this._ensureTexture(scene, 'enemyD_tex', cfg.width, cfg.height, cfg.color);
      this.sprite = scene.physics.add.image(x, y, 'enemyD_tex');
    }
    this.sprite.setDepth(8);
    this.sprite.setVelocityX(-45); // slower than EnemyC

    this.hp = 3;
    this.maxHp = 3;
    this.alive = true;
    this.scoreValue = 300;
    this.enemyBullets = null; // set from GameScene
    this._player = null;      // set from GameScene
    this._onDrop = onDrop ?? null;

    this.fireInterval = Phaser.Math.Between(2800, 3800);
    this.fireTimer = Phaser.Math.Between(1200, 2400);

    // Gentle vertical oscillation
    this._spawnY = y;
    this._oscSpeed = 0.7;
    this._oscAmp = 40;
    this._elapsed = Math.random() * Math.PI * 2;
  }

  _ensureTexture(scene, key, w, h, color) {
    if (!scene.textures.exists(key)) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      // Purple body
      g.fillStyle(color, 1);
      g.fillRect(0, 0, w, h);
      // Accent glow stripe
      g.fillStyle(0xcc88ff, 1);
      g.fillRect(4, h / 2 - 3, w - 8, 6);
      // Corner indicators
      g.fillStyle(0xffffff, 0.6);
      g.fillRect(2, 2, 6, 6);
      g.fillRect(w - 8, 2, 6, 6);
      g.generateTexture(key, w, h);
      g.destroy();
    }
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(time, delta) {
    if (!this.alive || !this.sprite.active) return;

    // Oscillate vertically
    this._elapsed += delta / 1000;
    const newY = this._spawnY + Math.sin(this._elapsed * this._oscSpeed) * this._oscAmp;
    this.sprite.y = Phaser.Math.Clamp(newY, 30, this.scene.scale.height - 30);

    // Despawn off left edge
    if (this.sprite.x < -80) {
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
    const texKey = this.scene.textures.exists('bullet-2') ? 'bullet-2' : 'bullet_enemy_tex';
    if (texKey === 'bullet_enemy_tex' && !this.scene.textures.exists(texKey)) {
      const cfg = SPRITES.bulletEnemy;
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(cfg.color, 1); g.fillRect(0, 0, cfg.width, cfg.height);
      g.generateTexture(texKey, cfg.width, cfg.height); g.destroy();
    }

    const b = this.enemyBullets.get(this.sprite.x, this.sprite.y, texKey);
    if (!b) return;
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      this._player.x, this._player.y
    );
    b.setActive(true).setVisible(true).setDepth(7);
    b.setDisplaySize(22, 22).setRotation(angle);
    b.body.setEnable(true);
    b.body.reset(this.sprite.x, this.sprite.y);
    b.setVelocity(Math.cos(angle) * 145, Math.sin(angle) * 145);
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
      explodeSprite(this.scene, this.sprite.x, this.sprite.y, 130);
      this.sprite.setActive(false).setVisible(false);
      // Drop power-up
      if (this._onDrop) {
        this._onDrop(this.sprite.x, this.sprite.y);
      }
    }
  }

  destroy() {
    this.sprite.destroy();
  }
}
