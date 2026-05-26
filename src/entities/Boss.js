import { SPRITES } from '../config/sprites.js';
import { bossExplosion } from '../utils/particles.js';

/**
 * Boss — 4-pattern ranged-only attack cycle
 *
 * Patterns (cycle 0→3, repeat):
 *   0  Spread Fan   — wide fan of projectiles
 *   1  Aimed Burst  — rapid successive aimed shots at the player
 *   2  Ring Shot    — full 360° ring of bullets
 *   3  Laser Barrage — tight cluster of fast beams aimed at player
 *
 * Phase 2 (≤50% HP): all counts increase, interval drops, visual tint changes.
 * No melee / lunge — purely ranged.
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

    // Accent stripe texture
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

    this.hp    = 300;
    this.maxHp = 300;
    this.alive = true;

    this.behaviorIndex    = 0;     // cycles 0–3
    this.behaviorTimer    = 99999; // entrance tween sets the real first delay
    this.behaviorInterval = 2000;  // ms between attacks (Phase 1)

    this._enraged = false;

    this.homeX = x;
    this.homeY = y;

    this._player       = null; // set from GameScene
    this.spreadBullets = null; // set from GameScene
    this.aimedBullets  = null; // set from GameScene

    // Idle bob
    this.bobOffset = 0;
    this.bobSpeed  = 1.2;

    // Aimed burst sub-state
    this._burstActive  = false;
    this._burstRemain  = 0;
    this._burstTimer   = 0;
    this._burstInterval = 180; // ms between individual burst shots

    // Laser barrage sub-state
    this._laserActive   = false;
    this._laserRemain   = 0;
    this._laserTimer    = 0;
    this._laserInterval = 120; // ms between individual laser shots
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

    // Idle vertical bob
    this.bobOffset += delta / 1000 * this.bobSpeed;
    this.sprite.y = this.homeY + Math.sin(this.bobOffset) * 18;
    this._syncBody();

    // Tick sub-state timers for multi-shot patterns
    this._tickBurst(delta);
    this._tickLaser(delta);

    // Main pattern timer — only advance when no sub-state is running
    if (!this._burstActive && !this._laserActive) {
      this.behaviorTimer -= delta;
      if (this.behaviorTimer <= 0) {
        this._executeBehavior();
        this.behaviorIndex    = (this.behaviorIndex + 1) % 4;
        this.behaviorTimer    = this.behaviorInterval;
      }
    }
  }

  // ── Pattern dispatcher ──────────────────────────────────────────────────────
  _executeBehavior() {
    switch (this.behaviorIndex) {
      case 0: this._spreadFan();    break;
      case 1: this._startAimedBurst(); break;
      case 2: this._ringShot();     break;
      case 3: this._startLaserBarrage(); break;
    }
  }

  // ── Pattern 0: Spread Fan ───────────────────────────────────────────────────
  // Fires a wide arc of projectiles toward the player's side.
  _spreadFan() {
    if (!this.spreadBullets) return;
    const cfg = SPRITES.bossBulletSpread;
    this._ensureBulletTex('boss_spread_tex', cfg.width, cfg.height, cfg.color);

    const count    = this._enraged ? 7 : 4;
    const halfSpan = this._enraged ? 40 : 35; // degrees
    const speed    = this._enraged ? 300 : 260;

    for (let i = 0; i < count; i++) {
      const deg = -halfSpan + (i / (count - 1)) * (halfSpan * 2);
      const rad = Phaser.Math.DegToRad(180 + deg);
      const b = this.spreadBullets.get(this.sprite.x, this.sprite.y, 'boss_spread_tex');
      if (!b) continue;
      b.setActive(true).setVisible(true).setDepth(7);
      b.body.setEnable(true);
      b.body.reset(this.sprite.x, this.sprite.y);
      b.setVelocity(Math.cos(rad) * speed, Math.sin(rad) * speed);
    }
  }

  // ── Pattern 1: Aimed Burst ──────────────────────────────────────────────────
  // Fires several aimed shots in rapid succession toward the player.
  _startAimedBurst() {
    if (!this.aimedBullets || !this._player || !this._player.alive) return;
    this._burstActive   = true;
    this._burstRemain   = this._enraged ? 5 : 3;
    this._burstTimer    = 0; // fire first shot immediately
  }

  _tickBurst(delta) {
    if (!this._burstActive) return;
    this._burstTimer -= delta;
    if (this._burstTimer <= 0) {
      this._fireSingleAimed();
      this._burstRemain--;
      if (this._burstRemain <= 0) {
        this._burstActive = false;
        this.behaviorTimer = this.behaviorInterval; // reset main timer after burst
      } else {
        this._burstTimer = this._burstInterval;
      }
    }
  }

  _fireSingleAimed() {
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
    const speed = this._enraged ? 300 : 240;
    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  // ── Pattern 2: Ring Shot ────────────────────────────────────────────────────
  // Fires a full 360° ring of equally-spaced bullets.
  _ringShot() {
    if (!this.spreadBullets) return;
    const cfg = SPRITES.bossBulletSpread;
    this._ensureBulletTex('boss_spread_tex', cfg.width, cfg.height, cfg.color);

    const count = this._enraged ? 16 : 12;
    const speed = this._enraged ? 220 : 180;

    for (let i = 0; i < count; i++) {
      const rad = Phaser.Math.DegToRad((360 / count) * i);
      const b = this.spreadBullets.get(this.sprite.x, this.sprite.y, 'boss_spread_tex');
      if (!b) continue;
      b.setActive(true).setVisible(true).setDepth(7);
      b.body.setEnable(true);
      b.body.reset(this.sprite.x, this.sprite.y);
      b.setVelocity(Math.cos(rad) * speed, Math.sin(rad) * speed);
    }
  }

  // ── Pattern 3: Laser Barrage ────────────────────────────────────────────────
  // Fires a rapid sequence of fast, narrow beams tightly aimed at the player.
  // Each beam tracks the player's position at the moment it fires (predictive).
  _startLaserBarrage() {
    if (!this.aimedBullets || !this._player || !this._player.alive) return;
    this._laserActive  = true;
    this._laserRemain  = this._enraged ? 5 : 3;
    this._laserTimer   = 0; // fire first beam immediately
  }

  _tickLaser(delta) {
    if (!this._laserActive) return;
    this._laserTimer -= delta;
    if (this._laserTimer <= 0) {
      this._fireLaserBeam();
      this._laserRemain--;
      if (this._laserRemain <= 0) {
        this._laserActive = false;
        this.behaviorTimer = this.behaviorInterval;
      } else {
        this._laserTimer = this._laserInterval;
      }
    }
  }

  _fireLaserBeam() {
    if (!this.aimedBullets || !this._player || !this._player.alive) return;
    this._ensureLaserTex();

    // Predict player position slightly ahead
    const px = this._player.sprite.body
      ? this._player.x + this._player.sprite.body.velocity.x * 0.08
      : this._player.x;
    const py = this._player.sprite.body
      ? this._player.y + this._player.sprite.body.velocity.y * 0.08
      : this._player.y;

    const spreadCount = this._enraged ? 3 : 2; // beams per salvo
    const halfDeg     = this._enraged ? 6 : 4;
    const speed       = this._enraged ? 520 : 440;

    const baseAngle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y, px, py
    );

    for (let i = 0; i < spreadCount; i++) {
      const offset = spreadCount === 1 ? 0
        : -halfDeg + (i / (spreadCount - 1)) * halfDeg * 2;
      const angle = baseAngle + Phaser.Math.DegToRad(offset);
      const b = this.aimedBullets.get(this.sprite.x, this.sprite.y, 'boss_laser_tex');
      if (!b) continue;
      b.setActive(true).setVisible(true).setDepth(7);
      b.body.setEnable(true);
      b.body.reset(this.sprite.x, this.sprite.y);
      b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }

  _ensureLaserTex() {
    if (!this.scene.textures.exists('boss_laser_tex')) {
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x00ffff, 1);   // cyan laser core
      g.fillRect(0, 1, 20, 3);
      g.fillStyle(0xffffff, 0.8);
      g.fillRect(0, 2, 20, 1);    // bright centre line
      g.generateTexture('boss_laser_tex', 20, 5);
      g.destroy();
    }
  }

  // ── Bullet texture helper ───────────────────────────────────────────────────
  _ensureBulletTex(key, w, h, color) {
    if (!this.scene.textures.exists(key)) {
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillCircle(w / 2, h / 2, w / 2);
      g.generateTexture(key, w, h);
      g.destroy();
    }
  }

  // ── Hit / death ─────────────────────────────────────────────────────────────
  hit(damage = 1) {
    if (!this.alive) return;
    this.hp -= damage;
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.2,
      duration: 60,
      yoyo: true,
      onComplete: () => this.sprite.setAlpha(1)
    });
    this.scene.game.events.emit('bossHpUpdate', this.hp, this.maxHp);

    if (!this._enraged && this.hp <= this.maxHp * 0.5) {
      this._enrage();
    }

    if (this.hp <= 0) {
      this._die();
    }
  }

  _enrage() {
    this._enraged = true;
    this.behaviorInterval = 1400; // faster attack cadence
    this._burstInterval   = 130;  // quicker burst
    this._laserInterval   = 90;   // quicker laser

    // Rapid red-flash to signal phase transition
    let flashes = 0;
    const flashInterval = this.scene.time.addEvent({
      delay: 120,
      repeat: 7,
      callback: () => {
        if (!this.alive) { flashInterval.remove(); return; }
        flashes++;
        this.sprite.setTint(flashes % 2 === 0 ? 0xff4444 : 0xffffff);
        if (flashes >= 8) this.sprite.setTint(0xff4444);
      }
    });
  }

  _die() {
    this.alive = false;
    if (this.sprite.body) {
      this.sprite.body.setEnable(false);
    }
    bossExplosion(this.scene, this.sprite.x, this.sprite.y);
    this.sprite.setActive(false).setVisible(false);
    this.scene.game.events.emit('bossDefeated');
  }

  destroy() {
    this.sprite.destroy();
  }
}
