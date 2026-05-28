import { SPRITES } from '../config/sprites.js';
import { createEngineTrail } from '../utils/particles.js';
import { MobileInput } from '../utils/mobileInput.js';

export const PLAYER_SPEED = 291;

export class Player {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y, { isMobile = false } = {}) {
    this.scene = scene;
    this.game = scene.game;
    this.isMobile = isMobile;

    // Physics rectangle as the visual/body
    const cfg = SPRITES.player;
    if (scene.textures.exists(cfg.key)) {
      this.sprite = scene.physics.add.image(x, y, cfg.key);
      this.sprite.setDisplaySize(cfg.width, cfg.height);
    } else {
      this._makeTexture('player_tex', cfg.width, cfg.height, cfg.color);
      this.sprite = scene.physics.add.image(x, y, 'player_tex');
    }
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);

    // Reduce hitbox to 90% of display size
    this.sprite.body.setSize(cfg.width * 0.9, cfg.height * 0.9);

    // Input — WASD movement, J fire (keyboard)
    this.keyW = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyJ = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);

    // Mobile touch input
    this._mobileInput = isMobile ? new MobileInput(scene) : null;

    // Shooting state
    this.fireTimer = 0;
    this._baseFireRate = 160;
    this.fireRate = this._baseFireRate;
    this.normalDamage = 1;

    this.alive = true;

    // Bullet group (set from GameScene after creation)
    this.normalBullets = null;

    // ── Power-up state (each is permanent once collected, all can stack) ─────
    this._hasSpread  = false;
    this._hasMissile = false;
    this._hasRapid   = false;

    // Missile state
    this._missileFireTimer = 0;      // countdown to next missile salvo
    this._missileFireRate  = 1200;   // ms between salvos (top + bottom each time)
    this.missileBullets = null;      // set from GameScene

    // Laser beam graphics (created on demand)
    this._laserGfx = scene.add.graphics().setDepth(10);
    this._laserActive = false;
    this._laserDamageTimers = new Map(); // target → cooldown ms remaining

    // Engine trail (Phaser 3.60 particles)
    this._engineTrail = createEngineTrail(scene, this.sprite);
  }

  _makeTexture(key, w, h, color) {
    if (!this.scene.textures.exists(key)) {
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillRect(0, 0, w, h);
      g.generateTexture(key, w, h);
      g.destroy();
    }
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  // ── Power-up activation ────────────────────────────────────────────────────
  activatePowerUp(type) {
    if (type === 'spread')  this._hasSpread  = true;
    if (type === 'missile') {
      this._hasMissile = true;
      this._missileFireTimer = 0; // fire immediately
    }
    if (type === 'rapid') {
      this._hasRapid  = true;
      this.fireRate   = this._baseFireRate / 3;
    }
    this._emitPowerUpUpdate();
  }

  _emitPowerUpUpdate() {
    const active = [];
    if (this._hasSpread)  active.push('spread');
    if (this._hasMissile) active.push('missile');
    if (this._hasRapid)   active.push('rapid');
    this.game.events.emit('powerUpUpdate', active);
  }

  _clearLaser() {
    this._laserActive = false;
    this._laserGfx.clear();
    this._laserDamageTimers.clear();
  }

  // ── Main update ────────────────────────────────────────────────────────────
  update(time, delta) {
    if (!this.alive) return;

    const sp = this.sprite;
    const { keyW, keyA, keyS, keyD } = this;

    // Movement — WASD (keyboard) or touch drag direction (mobile)
    let vx = 0, vy = 0;

    if (this._mobileInput) {
      // Mobile: direction is determined by drag direction from touch-down point
      const dir = this._mobileInput.getDirection();
      vx = dir.vx * PLAYER_SPEED;
      vy = dir.vy * PLAYER_SPEED;
    } else {
      // Desktop: WASD
      if (keyA.isDown) vx = -PLAYER_SPEED;
      if (keyD.isDown) vx =  PLAYER_SPEED;
      if (keyW.isDown) vy = -PLAYER_SPEED;
      if (keyS.isDown) vy =  PLAYER_SPEED;

      if (vx !== 0 && vy !== 0) {
        vx *= 0.7071;
        vy *= 0.7071;
      }
    }

    sp.setVelocity(vx, vy);

    // Swap ship sprite based on vertical direction
    const cfg2 = SPRITES.player;
    if (this.scene.textures.exists(cfg2.key)) {
      const nextKey = vy < 0 ? cfg2.keyUp : vy > 0 ? cfg2.keyDown : cfg2.key;
      if (sp.texture.key !== nextKey) {
        sp.setTexture(nextKey).setDisplaySize(cfg2.width, cfg2.height);
      }
    }

    // ── Missile auto-fire (no key needed) ─────────────────────────────────
    if (this._hasMissile && this.missileBullets) {
      this._missileFireTimer -= delta;
      if (this._missileFireTimer <= 0) {
        this._fireMissileSalvo();
        this._missileFireTimer = this._missileFireRate;
      }
    }

    // ── Firing ─────────────────────────────────────────────────────────────
    // On mobile: auto-fire always. On desktop: hold J key.
    const wantFire = this.isMobile || this.keyJ.isDown;

    if (!this.isMobile && Phaser.Input.Keyboard.JustDown(this.keyJ)) {
      this.fireTimer = 0;
    }

    if (wantFire && this.normalBullets) {
      if (this._laserActive) this._clearLaser();

      this.fireTimer -= delta;
      if (this.fireTimer <= 0) {
        if (this._hasSpread) {
          this._fireSpread();
        } else {
          this._fireNormal();
        }
        this.fireTimer = this.fireRate;
      }
    } else {
      if (this._laserActive) this._clearLaser();
    }
  }

  // ── Missile mode ───────────────────────────────────────────────────────────
  _getNearestEnemy() {
    const scene = this.scene;
    const allEnemies = [
      ...(scene.enemiesA ?? []),
      ...(scene.enemiesB ?? []),
      ...(scene.enemiesC ?? []),
      ...(scene.enemiesD ?? []),
      ...(scene.boss ? [scene.boss] : []),
    ];
    let nearest = null;
    let minDist = Infinity;
    for (const e of allEnemies) {
      if (!e.alive || !e.sprite.active) continue;
      const dx = e.sprite.x - this.sprite.x;
      const dy = e.sprite.y - this.sprite.y;
      const d = dx * dx + dy * dy;
      if (d < minDist) { minDist = d; nearest = e; }
    }
    return nearest;
  }

  _fireMissileSalvo() {
    if (!this.missileBullets) return;
    const cfg = SPRITES.player;
    const ox = this.sprite.x + cfg.width / 2;
    // Top missile
    this._launchMissile(ox, this.sprite.y - cfg.height / 2 - 2);
    // Bottom missile
    this._launchMissile(ox, this.sprite.y + cfg.height / 2 + 2);
  }

  _launchMissile(ox, oy) {
    const target = this._getNearestEnemy();
    const texKey = this.scene.textures.exists('missile') ? 'missile' : (this._ensureMissileTex(), 'missile_tex');
    const m = this.missileBullets.get(ox, oy, texKey);
    if (!m) return;
    m.setActive(true).setVisible(true).setDepth(9);
    m.setDisplaySize(52, 13);
    m.body.setEnable(true);
    m.body.reset(ox, oy);
    m.damage = 2;
    m.piercing = false;
    m.hitTargets = new Set();
    m._target = target;
    m._speed = 420;
    let angle;
    if (target) {
      angle = Phaser.Math.Angle.Between(ox, oy, target.sprite.x, target.sprite.y);
    } else {
      angle = 0;
    }
    m.setRotation(angle);
    m.setVelocity(Math.cos(angle) * m._speed, Math.sin(angle) * m._speed);
  }

  _ensureMissileTex() {
    if (!this.scene.textures.exists('missile_tex')) {
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xff4400, 1);
      g.fillRect(0, 2, 14, 4);
      g.fillStyle(0xffdd00, 1);
      g.fillRect(12, 3, 4, 2);
      g.generateTexture('missile_tex', 16, 8);
      g.destroy();
    }
  }

  // Called from GameScene each frame to steer active missiles
  updateMissiles(delta) {
    if (!this.missileBullets) return;
    const turnSpeed = 4.5; // radians per second
    for (const m of this.missileBullets.getChildren()) {
      if (!m.active || !m.body?.enable) continue;
      const target = m._target;
      // Re-acquire if old target died
      if (!target || !target.alive || !target.sprite.active) {
        m._target = this._getNearestEnemy();
      }
      const t = m._target;
      if (!t) continue;
      const currentAngle = Math.atan2(m.body.velocity.y, m.body.velocity.x);
      const desiredAngle = Phaser.Math.Angle.Between(m.x, m.y, t.sprite.x, t.sprite.y);
      const diff = Phaser.Math.Angle.Wrap(desiredAngle - currentAngle);
      const maxTurn = turnSpeed * (delta / 1000);
      const turn = Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
      const newAngle = currentAngle + turn;
      m.setVelocity(Math.cos(newAngle) * m._speed, Math.sin(newAngle) * m._speed);
      m.setRotation(newAngle);
    }
  }

  // ── Spread shot ────────────────────────────────────────────────────────────
  _fireSpread() {
    const angles = [-15, 0, 15];
    for (const deg of angles) {
      const rad = Phaser.Math.DegToRad(deg);
      this._fireBulletAtAngle(rad);
    }
  }

  _fireBulletAtAngle(angleOffset) {
    const cfg = SPRITES.bulletNormal;
    const texKey = this.scene.textures.exists(cfg.key) ? cfg.key : (this._ensureTexture('bullet_normal_tex', cfg.width, cfg.height, cfg.color), 'bullet_normal_tex');
    const ox = this.sprite.x + SPRITES.player.width / 2 + 4;
    const b = this.normalBullets.get(ox, this.sprite.y, texKey);
    if (!b) return;
    b.body.setEnable(false);
    b.charged = false;
    b.piercing = false;
    b.damage = this.normalDamage;
    b.hitTargets = new Set();
    b.setActive(true).setVisible(true).setDepth(9);
    b.setDisplaySize(cfg.width, cfg.height);
    b.setRotation(angleOffset);
    b.body.reset(ox, this.sprite.y);
    const speed = 600;
    b.setVelocityX(Math.cos(angleOffset) * speed);
    b.setVelocityY(Math.sin(angleOffset) * speed);
    b.body.setEnable(true);
  }

  // ── Normal / charged fire ──────────────────────────────────────────────────
  _fireNormal() {
    const cfg = SPRITES.bulletNormal;
    const texKey = this.scene.textures.exists(cfg.key) ? cfg.key : (this._ensureTexture('bullet_normal_tex', cfg.width, cfg.height, cfg.color), 'bullet_normal_tex');
    const ox = this.sprite.x + SPRITES.player.width / 2 + 4;
    const b = this.normalBullets.get(ox, this.sprite.y, texKey);
    if (!b) return;
    b.body.setEnable(false);
    b.charged = false;
    b.piercing = false;
    b.damage = this.normalDamage;
    b.hitTargets = new Set();
    b.setActive(true).setVisible(true).setDepth(9);
    b.setDisplaySize(cfg.width, cfg.height);
    b.setRotation(0);
    b.body.reset(ox, this.sprite.y);
    b.setVelocityX(600);
    b.setVelocityY(0);
    b.body.setEnable(true);
  }

  _ensureTexture(key, w, h, color) {
    if (!this.scene.textures.exists(key)) {
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillRect(0, 0, w, h);
      g.generateTexture(key, w, h);
      g.destroy();
    }
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this._clearLaser();
    this._hasSpread  = false;
    this._hasMissile = false;
    this._hasRapid   = false;
    this.fireRate    = this._baseFireRate;
    if (this._engineTrail) {
      this._engineTrail.stop();
    }
    this.game.events.emit('powerUpUpdate', []);
    this._playDeathAnimation();
  }

  _playDeathAnimation() {
    const scene = this.scene;
    const x = this.sprite.x;
    const y = this.sprite.y;

    this.sprite.setActive(false).setVisible(false);

    if (!scene.textures.exists('explode')) return;

    const anim = scene.add.sprite(x, y, 'explode', 0);
    anim.setDisplaySize(220, 220).setDepth(20);
    anim.play('explode');
    anim.once('animationcomplete', () => anim.destroy());
  }

  destroy() {
    this._clearLaser();
    this._laserGfx.destroy();
    if (this._mobileInput) this._mobileInput.destroy();
    this.sprite.destroy();
  }
}
