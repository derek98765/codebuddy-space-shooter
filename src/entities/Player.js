import { SPRITES } from '../config/sprites.js';
import { createEngineTrail } from '../utils/particles.js';

export const PLAYER_SPEED = 253;

export class Player {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y) {
    this.scene = scene;
    this.game = scene.game;

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

    // Charge indicator — small rect in front of the ship
    this.chargeBar = scene.add.rectangle(
      x + cfg.width / 2 + 4,
      y,
      0, 8,
      0xff8800
    ).setDepth(11).setOrigin(0, 0.5);

    // Input — WASD movement, J rapid-fire, K charge shot
    this.keyW = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyJ = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.keyK = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);

    // Shooting state
    this.fireTimer = 0;
    this._baseFireRate = 160; // ms between rapid-fire bullets
    this.fireRate = this._baseFireRate;
    this.normalDamage = 1;
    this.chargedDamage = 2;
    this.chargeTime = 0;
    this._baseMaxCharge = 1500;
    this.maxCharge = this._baseMaxCharge;
    this.isCharging = false;

    this.alive = true;

    // Bullet groups (set from GameScene after creation)
    this.normalBullets = null;
    this.chargedBullets = null;

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
      this.maxCharge  = this._baseMaxCharge / 2;
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

    // Movement — WASD
    let vx = 0, vy = 0;
    if (keyA.isDown) vx = -PLAYER_SPEED;
    if (keyD.isDown) vx =  PLAYER_SPEED;
    if (keyW.isDown) vy = -PLAYER_SPEED;
    if (keyS.isDown) vy =  PLAYER_SPEED;

    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
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

    // ── Firing — J key ─────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.keyJ)) {
      this.fireTimer = 0;
    }

    if (this.keyJ.isDown && this.normalBullets) {
      // Clear laser if previously active
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

    // ── Charge shot — K key ────────────────────────────────────────────────
    if (this.keyK.isDown) {
      this.isCharging = true;
      this.chargeTime = Math.min(this.chargeTime + delta, this.maxCharge);
    }

    if (!this.keyK.isDown && this.isCharging) {
      this.isCharging = false;
      if (this.chargedBullets && this.chargeTime > 200) {
        this._fireCharged();
      }
      this.chargeTime = 0;
    }

    // Update charge indicator
    const chargeRatio = this.chargeTime / this.maxCharge;
    const maxBarWidth = 36;
    const cfg = SPRITES.player;
    this.chargeBar.width = chargeRatio * maxBarWidth;
    this.chargeBar.x = sp.x + cfg.width / 2 - 2;
    this.chargeBar.y = sp.y;

    this.game.events.emit('chargeUpdate', chargeRatio);
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
    this._ensureMissileTex();
    const m = this.missileBullets.get(ox, oy, 'missile_tex');
    if (!m) return;
    m.setActive(true).setVisible(true).setDepth(9);
    m.body.setEnable(true);
    m.body.reset(ox, oy);
    m.damage = 2;
    m.piercing = false;
    m.hitTargets = new Set();
    m._target = target;       // homing target (may be null)
    m._speed = 420;
    // Initial velocity: straight right if no target, else toward target
    if (target) {
      const angle = Phaser.Math.Angle.Between(ox, oy, target.sprite.x, target.sprite.y);
      m.setVelocity(Math.cos(angle) * m._speed, Math.sin(angle) * m._speed);
    } else {
      m.setVelocity(m._speed, 0);
    }
  }

  _ensureMissileTex() {
    if (!this.scene.textures.exists('missile_tex')) {
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xff4400, 1);
      g.fillRect(0, 2, 14, 4);   // body
      g.fillStyle(0xffdd00, 1);
      g.fillRect(12, 3, 4, 2);   // nose glow
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
    this._ensureTexture('bullet_normal_tex', cfg.width, cfg.height, cfg.color);
    const b = this.normalBullets.get(
      this.sprite.x + SPRITES.player.width / 2 + 4,
      this.sprite.y,
      'bullet_normal_tex'
    );
    if (!b) return;
    b.body.setEnable(false);
    b.charged = false;
    b.piercing = false;
    b.damage = this.normalDamage;
    b.hitTargets = new Set();
    b.setActive(true).setVisible(true).setDepth(9);
    b.body.reset(this.sprite.x + SPRITES.player.width / 2 + 4, this.sprite.y);
    const speed = 600;
    b.setVelocityX(Math.cos(angleOffset) * speed);
    b.setVelocityY(Math.sin(angleOffset) * speed);
    b.body.setEnable(true);
  }

  // ── Normal / charged fire ──────────────────────────────────────────────────
  _fireNormal() {
    const cfg = SPRITES.bulletNormal;
    this._ensureTexture('bullet_normal_tex', cfg.width, cfg.height, cfg.color);
    const b = this.normalBullets.get(
      this.sprite.x + SPRITES.player.width / 2 + 4,
      this.sprite.y,
      'bullet_normal_tex'
    );
    if (!b) return;
    b.body.setEnable(false);
    b.charged = false;
    b.piercing = false;
    b.damage = this.normalDamage;
    b.hitTargets = new Set();
    b.setActive(true).setVisible(true).setDepth(9);
    b.body.reset(this.sprite.x + SPRITES.player.width / 2 + 4, this.sprite.y);
    b.setVelocityX(600);
    b.setVelocityY(0);
    b.body.setEnable(true);
  }

  _fireCharged() {
    const cfg = SPRITES.bulletCharged;
    this._ensureTexture('bullet_charged_tex', cfg.width, cfg.height, cfg.color);
    const b = this.chargedBullets.get(
      this.sprite.x + SPRITES.player.width / 2 + 4,
      this.sprite.y,
      'bullet_charged_tex'
    );
    if (!b) return;
    b.body.setEnable(false);
    b.charged = true;
    b.piercing = true;
    b.damage = this.chargedDamage;
    b.hitTargets = new Set();
    b.setActive(true).setVisible(true).setDepth(9);
    b.body.reset(this.sprite.x + SPRITES.player.width / 2 + 4, this.sprite.y);
    b.setVelocityX(480);
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
    this.maxCharge   = this._baseMaxCharge;
    this.sprite.setActive(false).setVisible(false);
    this.chargeBar.setVisible(false);
    if (this._engineTrail) {
      this._engineTrail.stop();
    }
    this.game.events.emit('powerUpUpdate', []);
  }

  destroy() {
    this._clearLaser();
    this.chargeBar.destroy();
    this._laserGfx.destroy();
    this.sprite.destroy();
  }
}
