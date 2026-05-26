import { SPRITES } from '../config/sprites.js';
import { bossExplosion } from '../utils/particles.js';

/**
 * Boss — 5-pattern ranged-only attack cycle
 *
 * Patterns (cycle 0→4, repeat):
 *   0  Spread Fan    — wide fan of projectiles
 *   1  Aimed Burst   — rapid successive aimed shots at the player
 *   2  Ring Shot     — full 360° ring of bullets
 *   3  Laser Barrage — tight cluster of fast beams aimed at player
 *   4  Charge Beam   — thick sustained energy beam with lightning arcs
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

    if (scene.textures.exists(cfg.key)) {
      this.sprite = scene.physics.add.image(x, y, cfg.key);
      this.sprite.setDisplaySize(cfg.width, cfg.height);
    } else {
      // Fallback: procedural accent rectangle
      this._recreateTexture(scene, 'boss_accent_tex', cfg.width, cfg.height, null, (g) => {
        g.fillStyle(0x4444aa, 1);
        g.fillRect(0, 0, cfg.width, cfg.height);
        g.fillStyle(0x8888ff, 1);
        g.fillRect(4, 8, 8, cfg.height - 16);
        g.fillRect(4, 8, cfg.width - 8, 6);
      });
      this.sprite = scene.physics.add.image(x, y, 'boss_accent_tex');
    }
    this.sprite.setDepth(8);
    this.sprite.body.moves = false;
    this.sprite.body.setAllowGravity(false);
    // Disable the main sprite body — hitboxes are handled by zones below
    this.sprite.body.setEnable(false);

    // 3 hitzone proxies (invisible, no texture)
    // Offsets are relative to boss sprite center, scaled from 1333x1180 → 678x600
    this._hitZones = [
      { offX: -13,  offY: -206, w: 216, h:  91 }, // head
      { offX:  65,  offY:   15, w: 419, h: 311 }, // main body
      { offX: -230, offY:  -23, w: 186, h:  82 }, // cannon arm
    ].map(z => {
      const img = scene.physics.add.image(x + z.offX, y + z.offY, '__DEFAULT');
      img.setDisplaySize(z.w, z.h);
      img.setAlpha(0);
      img.body.moves = false;
      img.body.setAllowGravity(false);
      img._offX = z.offX;
      img._offY = z.offY;
      return img;
    });

    this.hp    = 600;
    this.maxHp = 600;
    this.alive = true;

    this.behaviorIndex    = 0;     // cycles 0–4
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
    this._burstActive   = false;
    this._burstRemain   = 0;
    this._burstTimer    = 0;
    this._burstInterval = 180; // ms between individual burst shots

    // Laser barrage sub-state
    this._laserActive   = false;
    this._laserRemain   = 0;
    this._laserTimer    = 0;
    this._laserInterval = 120; // ms between individual laser shots

    // Charge beam sub-state
    this._chargeActive       = false;
    this._chargePhase        = 'windup'; // 'windup' | 'firing' | 'cooldown'
    this._chargeTimer        = 0;
    this._chargeWindupMs     = 600;  // telegraph delay before beam fires
    this._chargeDurationMs   = 1400; // how long beam streams out
    this._chargeCooldownMs   = 400;
    this._chargeTickTimer    = 0;
    this._chargeTickInterval = 55;   // ms between each beam-segment spawn
    this._chargeAimAngle     = 0;    // locked at windup
    this._chargeGlowOrbs     = [];
  }

  // ── Texture helpers ─────────────────────────────────────────────────────────
  /**
   * Remove + recreate a texture.
   * drawFn(graphics) — optional custom drawing; if null, fills a solid rect.
   */
  _recreateTexture(scene, key, w, h, color, drawFn) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    if (drawFn) {
      drawFn(g);
    } else {
      g.fillStyle(color, 1);
      g.fillRect(0, 0, w, h);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  _ensureBulletTex(key, w, h, color) {
    if (this.scene.textures.exists(key)) return;
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 1);
    g.fillCircle(w / 2, h / 2, w / 2);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  _ensureLaserTex() {
    if (this.scene.textures.exists('boss_laser_tex')) return;
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x00ffff, 1);
    g.fillRect(0, 1, 20, 3);
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(0, 2, 20, 1);
    g.generateTexture('boss_laser_tex', 20, 5);
    g.destroy();
  }

  _ensureChargeBeamTextures() {
    if (!this.scene.textures.exists('boss_beam_core_tex')) {
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffee00, 0.6);
      g.fillRect(0, 0, 48, 18);
      g.fillStyle(0xffff88, 0.85);
      g.fillRect(0, 3, 48, 12);
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 6, 48, 6);
      g.generateTexture('boss_beam_core_tex', 48, 18);
      g.destroy();
    }
    if (!this.scene.textures.exists('boss_beam_arc_tex')) {
      const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffcc00, 0.4);
      g.fillRect(0, 0, 44, 10);
      g.fillStyle(0xffee44, 0.8);
      g.fillRect(0, 2, 44, 6);
      g.fillStyle(0xffffcc, 0.9);
      g.fillRect(0, 4, 44, 2);
      g.generateTexture('boss_beam_arc_tex', 44, 10);
      g.destroy();
    }
  }

  // ── Accessors ───────────────────────────────────────────────────────────────
  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  _syncBody() {
    for (const z of this._hitZones) {
      if (z.body) z.body.reset(this.sprite.x + z._offX, this.sprite.y + z._offY);
    }
  }

  // ── Update loop ─────────────────────────────────────────────────────────────
  update(time, delta) {
    if (!this.alive) return;

    // Idle vertical bob
    this.bobOffset += delta / 1000 * this.bobSpeed;
    this.sprite.y = this.homeY + Math.sin(this.bobOffset) * 18;
    this._syncBody();

    // Tick sub-state timers for multi-shot patterns
    this._tickBurst(delta);
    this._tickLaser(delta);
    this._tickChargeBeam(delta);

    // Main pattern timer — only advance when no sub-state is running
    if (!this._burstActive && !this._laserActive && !this._chargeActive) {
      this.behaviorTimer -= delta;
      if (this.behaviorTimer <= 0) {
        this._executeBehavior();
        this.behaviorIndex = (this.behaviorIndex + 1) % 5;
        this.behaviorTimer = this.behaviorInterval;
      }
    }
  }

  // ── Pattern dispatcher ──────────────────────────────────────────────────────
  _executeBehavior() {
    switch (this.behaviorIndex) {
      case 0: this._spreadFan();         break;
      case 1: this._startAimedBurst();   break;
      case 2: this._ringShot();          break;
      case 3: this._startLaserBarrage(); break;
      case 4: this._startChargeBeam();   break;
    }
  }

  // ── Pattern 0: Spread Fan ───────────────────────────────────────────────────
  _spreadFan() {
    if (!this.spreadBullets) return;
    const cfg = SPRITES.bossBulletSpread;
    this._ensureBulletTex('boss_spread_tex', cfg.width, cfg.height, cfg.color);

    const count    = this._enraged ? 7 : 4;
    const halfSpan = this._enraged ? 40 : 35;
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
  _startAimedBurst() {
    if (!this.aimedBullets || !this._player || !this._player.alive) return;
    this._burstActive = true;
    this._burstRemain = this._enraged ? 5 : 3;
    this._burstTimer  = 0;
  }

  _tickBurst(delta) {
    if (!this._burstActive) return;
    this._burstTimer -= delta;
    if (this._burstTimer <= 0) {
      this._fireSingleAimed();
      this._burstRemain--;
      if (this._burstRemain <= 0) {
        this._burstActive = false;
        this.behaviorTimer = this.behaviorInterval;
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
  _startLaserBarrage() {
    if (!this.aimedBullets || !this._player || !this._player.alive) return;
    this._laserActive = true;
    this._laserRemain = this._enraged ? 5 : 3;
    this._laserTimer  = 0;
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

    const px = this._player.sprite.body
      ? this._player.x + this._player.sprite.body.velocity.x * 0.08
      : this._player.x;
    const py = this._player.sprite.body
      ? this._player.y + this._player.sprite.body.velocity.y * 0.08
      : this._player.y;

    const spreadCount = this._enraged ? 3 : 2;
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

  // ── Pattern 4: Charge Beam ──────────────────────────────────────────────────
  _startChargeBeam() {
    if (!this.aimedBullets || !this._player || !this._player.alive) return;
    this._chargeActive    = true;
    this._chargePhase     = 'windup';
    this._chargeTimer     = 0;
    this._chargeTickTimer = 0;

    this._chargeAimAngle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      this._player.x, this._player.y
    );

    this._spawnChargeWindup();
  }

  _spawnChargeWindup() {
    const mx = this.sprite.x - SPRITES.boss.width / 2;
    const my = this.sprite.y;
    const count = this._enraged ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const delay = i * (this._chargeWindupMs / count);
      this.scene.time.delayedCall(delay, () => {
        if (!this.alive || !this._chargeActive) return;
        const orb = this.scene.add.circle(mx, my, 6 + i * 4, 0xffff00, 0.9);
        orb.setDepth(9);
        this._chargeGlowOrbs.push(orb);
        this.scene.tweens.add({
          targets: orb,
          scaleX: 2.5,
          scaleY: 2.5,
          alpha: 0,
          duration: this._chargeWindupMs,
          ease: 'Quad.easeIn',
          onComplete: () => orb.destroy(),
        });
      });
    }
  }

  _tickChargeBeam(delta) {
    if (!this._chargeActive) return;
    this._chargeTimer += delta;

    if (this._chargePhase === 'windup') {
      if (this._chargeTimer >= this._chargeWindupMs) {
        this._chargePhase     = 'firing';
        this._chargeTimer     = 0;
        this._chargeTickTimer = 0;
        this._ensureChargeBeamTextures();
      }
      return;
    }

    if (this._chargePhase === 'firing') {
      this._chargeTickTimer -= delta;
      if (this._chargeTickTimer <= 0) {
        this._fireChargeBeamTick();
        this._chargeTickTimer = this._chargeTickInterval;
      }
      if (this._chargeTimer >= this._chargeDurationMs) {
        this._chargePhase = 'cooldown';
        this._chargeTimer = 0;
      }
      return;
    }

    if (this._chargePhase === 'cooldown') {
      if (this._chargeTimer >= this._chargeCooldownMs) {
        this._chargeActive = false;
        this.behaviorTimer = this.behaviorInterval;
      }
    }
  }

  _fireChargeBeamTick() {
    if (!this.aimedBullets) return;
    const mx = this.sprite.x - SPRITES.boss.width / 2;
    const my = this.sprite.y;

    const coreCount = this._enraged ? 4 : 3;
    for (let i = 0; i < coreCount; i++) {
      const jitter = Phaser.Math.FloatBetween(-0.04, 0.04);
      const angle  = this._chargeAimAngle + jitter;
      const speed  = this._enraged ? 680 : 560;
      const b = this.aimedBullets.get(mx, my, 'boss_beam_core_tex');
      if (!b) continue;
      b.setActive(true).setVisible(true).setDepth(10);
      b.body.setEnable(true);
      b.body.reset(mx, my);
      b.setRotation(angle);
      b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }

    const arcCount = this._enraged ? 4 : 3;
    for (let i = 0; i < arcCount; i++) {
      const jitter = Phaser.Math.FloatBetween(-0.18, 0.18);
      const angle  = this._chargeAimAngle + jitter;
      const speed  = this._enraged ? 600 : 480;
      const b = this.aimedBullets.get(mx, my, 'boss_beam_arc_tex');
      if (!b) continue;
      b.setActive(true).setVisible(true).setDepth(9);
      b.body.setEnable(true);
      b.body.reset(mx, my);
      b.setRotation(angle);
      b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }

  // ── Hit / death ─────────────────────────────────────────────────────────────
  hit(damage = 1) {
    if (!this.alive) return;
    this.hp -= damage;
    this.sprite.setTintFill(0xffffff);
    this.sprite.setAlpha(0.6);
    this.scene.time.delayedCall(70, () => { if (this.sprite) { this.sprite.clearTint(); this.sprite.setAlpha(1); } });
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
    this.behaviorInterval    = 1400;
    this._burstInterval      = 130;
    this._laserInterval      = 90;
    this._chargeWindupMs     = 450;
    this._chargeTickInterval = 40;

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
    for (const z of this._hitZones) {
      if (z.body) z.body.setEnable(false);
      z.setActive(false);
    }
    bossExplosion(this.scene, this.sprite.x, this.sprite.y);
    this.sprite.setActive(false).setVisible(false);
    this.scene.game.events.emit('bossDefeated');
  }

  destroy() {
    for (const z of this._hitZones) z.destroy();
    this.sprite.destroy();
  }
}
