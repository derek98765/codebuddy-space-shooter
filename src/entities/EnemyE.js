import { SPRITES } from '../config/sprites.js';
import { explodeSprite } from '../utils/particles.js';

/**
 * Enemy Type E — Flanker
 * - Enters from the right edge at a random Y near the top or bottom
 * - Dashes diagonally toward mid-screen, then straightens left
 * - Fires a 3-way spread burst when within range of the player
 * - HP = 2, fast movement
 */
export class EnemyE {
  constructor(scene, x, y) {
    this.scene = scene;
    const cfg = SPRITES.enemyE;

    if (scene.textures.exists(cfg.key)) {
      this.sprite = scene.physics.add.image(x, y, cfg.key);
      this.sprite.setDisplaySize(cfg.width, cfg.height);
    } else {
      this._ensureTexture(scene, 'enemyE_tex', cfg.width, cfg.height, cfg.color);
      this.sprite = scene.physics.add.image(x, y, 'enemyE_tex');
    }
    this.sprite.setDepth(8);

    const H = scene.scale.height;
    // Diagonal dash toward vertical center, then fly left
    const targetY = H / 2 + Phaser.Math.Between(-80, 80);
    const dx = -220;
    const dy = (targetY - y) * 0.8;
    this.sprite.setVelocity(dx, dy);

    this._phase = 'dash'; // 'dash' | 'straight'
    this._dashTimer = 600; // ms before straightening

    this.hp = 2;
    this.alive = true;
    this.scoreValue = 180;
    this.enemyBullets = null;
    this._player = null;

    this._hasFired = false;
    this._fireRange = 280;
  }

  _ensureTexture(scene, key, w, h, color) {
    if (!scene.textures.exists(key)) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillRect(0, 0, w, h);
      g.fillStyle(0xff88aa, 1);
      g.fillRect(w - 12, h / 2 - 4, 12, 8);
      g.generateTexture(key, w, h);
      g.destroy();
    }
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(time, delta) {
    if (!this.alive || !this.sprite.active) return;

    // Despawn off edges
    const W = this.scene.scale.width, H = this.scene.scale.height;
    if (this.sprite.x < -80 || this.sprite.y < -80 || this.sprite.y > H + 80) {
      this.alive = false;
      if (this.sprite.body) this.sprite.body.setEnable(false);
      this.sprite.setActive(false).setVisible(false);
      return;
    }

    // After dash phase, fly straight left
    if (this._phase === 'dash') {
      this._dashTimer -= delta;
      if (this._dashTimer <= 0) {
        this._phase = 'straight';
        this.sprite.setVelocity(-260, 0);
      }
    }

    // Fire spread once when close enough to player
    if (!this._hasFired && this._player && this._player.alive && this.enemyBullets) {
      const dx = this._player.x - this.sprite.x;
      const dy = this._player.y - this.sprite.y;
      if (Math.sqrt(dx * dx + dy * dy) < this._fireRange) {
        this._fireSpread();
        this._hasFired = true;
      }
    }
  }

  _fireSpread() {
    const texKey = this.scene.textures.exists('bullet-5') ? 'bullet-5' : 'bullet_enemy_tex';
    if (texKey === 'bullet_enemy_tex' && !this.scene.textures.exists(texKey)) {
      const cfg = SPRITES.bulletEnemy;
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(cfg.color, 1); g.fillRect(0, 0, cfg.width, cfg.height);
      g.generateTexture(texKey, cfg.width, cfg.height); g.destroy();
    }
    const baseAngle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y, this._player.x, this._player.y
    );
    const offsets = [-20, 0, 20];
    for (const deg of offsets) {
      const angle = baseAngle + Phaser.Math.DegToRad(deg);
      const b = this.enemyBullets.get(this.sprite.x, this.sprite.y, texKey);
      if (!b) continue;
      b.setActive(true).setVisible(true).setDepth(7);
      b.setDisplaySize(22, 22).setRotation(angle);
      b.body.setEnable(true);
      b.body.reset(this.sprite.x, this.sprite.y);
      b.setVelocity(Math.cos(angle) * 190, Math.sin(angle) * 190);
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
      explodeSprite(this.scene, this.sprite.x, this.sprite.y, 100);
      this.sprite.setActive(false).setVisible(false);
    }
  }

  destroy() {
    this.sprite.destroy();
  }
}
