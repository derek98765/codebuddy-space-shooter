import { Player } from '../entities/Player.js';
import { EnemyA } from '../entities/EnemyA.js';
import { EnemyB } from '../entities/EnemyB.js';
import { EnemyC } from '../entities/EnemyC.js';
import { EnemyD } from '../entities/EnemyD.js';
import { EnemyE } from '../entities/EnemyE.js';
import { Boss } from '../entities/Boss.js';
import { PowerUp } from '../entities/PowerUp.js';


export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('spaceship-default', 'assets/spaceship-default.webp');
    this.load.image('spaceship-up',      'assets/spaceship-up.webp');
    this.load.image('spaceship-down',    'assets/spaceship-down.webp');
    this.load.image('sky-background',    'assets/sky-background.webp');
    this.load.image('clouds-foreground', 'assets/clouds-foreground.webp');
    this.load.image('boss',              'assets/boss.webp');
    this.load.image('enemy-1',          'assets/enemy-1.webp');
    this.load.image('enemy-2',          'assets/enemy-2.webp');
    this.load.image('enemy-3',          'assets/enemy-3.webp');
    this.load.image('carrier-1',         'assets/carrier-1.webp');
    this.load.image('carrier-2',         'assets/carrier-2.webp');
    this.load.image('carrier-3',         'assets/carrier-3.webp');
    this.load.image('enemy-4',          'assets/enemy-4.webp');
    this.load.image('bullet-1',          'assets/bullet-1.webp');
    this.load.image('bullet-2',          'assets/bullet-2.webp');
    this.load.image('bullet-3',          'assets/bullet-3.webp');
    this.load.image('bullet-4',          'assets/bullet-4.webp');
    this.load.image('bullet-5',          'assets/bullet-5.webp');
    this.load.image('bullet-6',          'assets/bullet-6.webp');
    this.load.image('bullet-7',          'assets/bullet-7.webp');
    this.load.image('bullet-8',          'assets/bullet-8.webp');
    this.load.image('missile',           'assets/misslie.webp');
    this.load.spritesheet('explode', 'assets/explode.webp', { frameWidth: 242, frameHeight: 248 });
    this.load.image('power-up-diverge',  'assets/power-up-diverge.webp');
    this.load.image('power-up-missile',  'assets/power-up-missile.webp');
    this.load.image('power-up-rapid',    'assets/power-up-rapid.webp');
    this.load.image('boss-alert',        'assets/boss-alert.webp');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this._W = W;
    this._H = H;
    this._score = 0;
    // ── Scrolling background ──────────────────────────────────────────────────
    this._bg = this.add.tileSprite(0, 0, W, H, 'sky-background')
      .setOrigin(0, 0)
      .setDepth(0);
    // Scale tile so it fills the screen height
    const bgTexH = this.textures.get('sky-background').getSourceImage().height;
    const bgScale = H / bgTexH;
    this._bg.setTileScale(bgScale, bgScale);
    this.add.rectangle(0, 0, W, H, 0x000000, 0.2).setOrigin(0, 0).setDepth(1);

    // ── Mid clouds (parallax layer 2) ────────────────────────────────────────
    const cloudTexH = this.textures.get('clouds-foreground').getSourceImage().height;
    const midCloudScale = H * 0.245 * 0.75 / cloudTexH; // 25% smaller than foreground
    const midCloudH = cloudTexH * midCloudScale;
    this._cloudsMid = this.add.tileSprite(0, H - midCloudH * 0.3, W, midCloudH, 'clouds-foreground')
      .setOrigin(0, 1)
      .setTileScale(midCloudScale, midCloudScale)
      .setAlpha(0.7)
      .setDepth(1.5);

    // ── Foreground clouds (parallax layer 3) ─────────────────────────────────
    const cloudScale = H * 0.245 / cloudTexH;
    const cloudH = cloudTexH * cloudScale;
    this._clouds = this.add.tileSprite(0, H, W, cloudH, 'clouds-foreground')
      .setOrigin(0, 1)
      .setTileScale(cloudScale, cloudScale)
      .setDepth(2);
    this._scrollLocked = false;
    this._bgScrollSpeed = 1.0; // pixels per ms multiplier

    // ── Physics world bounds ──────────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, W, H);

    // ── Explosion animation ───────────────────────────────────────────────────
    if (!this.anims.exists('explode')) {
      this.anims.create({
        key: 'explode',
        frames: this.anims.generateFrameNumbers('explode', { start: 0, end: 4 }),
        frameRate: 14,
        repeat: 0,
      });
    }

    // ── Bullet groups ─────────────────────────────────────────────────────────
    this.normalBullets = this.physics.add.group({
      maxSize: 40,
      runChildUpdate: false,
    });
    this.enemyBullets = this.physics.add.group({
      maxSize: 60,
      runChildUpdate: false,
    });
    this.spreadBullets = this.physics.add.group({
      maxSize: 30,
      runChildUpdate: false,
    });
    this.aimedBullets = this.physics.add.group({
      maxSize: 20,
      runChildUpdate: false,
    });
    this.missileBullets = this.physics.add.group({
      maxSize: 20,
      runChildUpdate: false,
    });

    // ── Player ────────────────────────────────────────────────────────────────
    this.player = new Player(this, 100, H / 2);
    this.player.normalBullets = this.normalBullets;
    this.player.missileBullets = this.missileBullets;

    // ── Enemy containers ──────────────────────────────────────────────────────
    this.enemiesA = [];
    this.enemiesB = [];
    this.enemiesC = [];
    this.enemiesD = [];
    this.enemiesE = [];
    this.powerUps = [];
    this.boss = null;

    // ── Power-up drop type rotation ───────────────────────────────────────────
    this._powerUpTypes = ['spread', 'missile', 'rapid'];
    this._powerUpTypeIndex = 0;

    // ── Wave spawner ──────────────────────────────────────────────────────────
    this._gameTime = 0; // ms since scene start
    this._wavesTriggered = new Set();
    this._bossActive = false;
    this._gameOver = false;
    this._nextTargetId = 1;

    // ── Collision setup ───────────────────────────────────────────────────────
    this._setupCollisions();

    // ── Boss cinematic handler ────────────────────────────────────────────────
    this.game.events.off('bossDying', this._onBossDying, this);
    this.game.events.once('bossDying', this._onBossDying, this);

    // ── Cleanup on shutdown ───────────────────────────────────────────────────
    this.events.once('shutdown', () => {
      this.game.events.off('bossDying', this._onBossDying, this);
    });

    // ── Launch UIScene in parallel ────────────────────────────────────────────
    this.scene.launch('UIScene');

    // ── Pause on ESC ──────────────────────────────────────────────────────────
    this._escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this._paused = false;

    // ── Dev toolbar ───────────────────────────────────────────────────────────
    this._initDevToolbar();
  }

  _initDevToolbar() {
    // Remove any leftover toolbar from a previous run
    const existing = document.getElementById('dev-toolbar');
    if (existing) existing.remove();

    const bar = document.createElement('div');
    bar.id = 'dev-toolbar';
    bar.style.cssText = [
      'position:fixed', 'bottom:12px', 'right:12px', 'z-index:9999',
      'display:flex', 'gap:8px', 'align-items:center',
      'background:rgba(0,0,0,0.75)', 'border:1px solid #444',
      'border-radius:6px', 'padding:6px 10px',
      'font-family:monospace', 'font-size:12px',
    ].join(';');

    const label = document.createElement('span');
    label.textContent = 'DEV';
    label.style.cssText = 'color:#ff8800;font-weight:bold;margin-right:4px';

    const mkBtn = (text, onClick) => {
      const b = document.createElement('button');
      b.textContent = text;
      b.style.cssText = [
        'cursor:pointer', 'background:#222', 'color:#eee',
        'border:1px solid #555', 'border-radius:4px',
        'padding:3px 10px', 'font-family:monospace', 'font-size:12px',
      ].join(';');
      b.addEventListener('mouseenter', () => b.style.background = '#444');
      b.addEventListener('mouseleave', () => b.style.background = '#222');
      b.addEventListener('click', onClick);
      return b;
    };

    const btnClear = mkBtn('Clear Enemies', () => {
      console.log('[DEV] Clear all normal enemies');
      for (const e of [...this.enemiesA, ...this.enemiesB, ...this.enemiesC, ...this.enemiesD, ...this.enemiesE]) {
        if (e.alive) {
          e.alive = false;
          if (e.sprite.body) e.sprite.body.setEnable(false);
          e.sprite.setActive(false).setVisible(false);
        }
      }
    });

    const btnBoss = mkBtn('Enter Boss Phase', () => {
      if (this._bossActive) {
        console.log('[DEV] Boss already active, skipping');
        return;
      }
      console.log('[DEV] Entering boss phase — skipping all normal waves');
      // Mark all normal-enemy waves as triggered so they never fire
      for (let waveId = 1; waveId <= 6; waveId++) {
        this._wavesTriggered.add(waveId);
      }
      // Clear any remaining normal enemies
      for (const e of [...this.enemiesA, ...this.enemiesB, ...this.enemiesC, ...this.enemiesD, ...this.enemiesE]) {
        if (e.alive) {
          e.alive = false;
          if (e.sprite.body) e.sprite.body.setEnable(false);
          e.sprite.setActive(false).setVisible(false);
        }
      }
      this._scrollLocked = true;
      this._bgScrollSpeed = 0;
      this._wavesTriggered.add(7); // prevent wave spawner from double-spawning
      this._spawnBoss();
    });

    const btnKillBoss = mkBtn('Kill Boss', () => {
      if (!this.boss || !this.boss.alive) {
        console.log('[DEV] No active boss to kill');
        return;
      }
      console.log('[DEV] Killing boss');
      this.boss.hp = 0;
      this.boss._die();
    });

    const timerEl = document.createElement('span');
    timerEl.style.cssText = 'color:#88ddff;min-width:48px;text-align:right';
    timerEl.textContent = '0:00';
    const timerInterval = setInterval(() => {
      const s = Math.floor(this._gameTime / 1000);
      timerEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }, 250);

    bar.append(label, btnClear, btnBoss, btnKillBoss, timerEl);
    document.body.appendChild(bar);

    // Auto-remove toolbar when scene shuts down
    this.events.once('shutdown', () => {
      clearInterval(timerInterval);
      const tb = document.getElementById('dev-toolbar');
      if (tb) tb.remove();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COLLISIONS
  // ─────────────────────────────────────────────────────────────────────────────
  _setupCollisions() {
    const playerSprite = this.player.sprite;

    // Player normal bullets vs enemies A
    this.physics.add.overlap(this.normalBullets, [], () => {}, null, this);
    // (dynamic — added per enemy in _registerEnemy)

    // Player bullets vs enemy bullets: pass through (shmup style)

    // Enemy bullets hit player
    this.physics.add.overlap(playerSprite, this.enemyBullets, (_player, bullet) => {
      this._recycleBullet(bullet);
      this._killPlayer();
    });

    // Spread & aimed bullets hit player
    this.physics.add.overlap(playerSprite, this.spreadBullets, (_player, bullet) => {
      this._recycleBullet(bullet);
      this._killPlayer();
    });
    this.physics.add.overlap(playerSprite, this.aimedBullets, (_player, bullet) => {
      this._recycleBullet(bullet);
      this._killPlayer();
    });
  }

  // Register an enemy so player bullets collide with it
  _registerEnemyA(enemy) {
    const sp = enemy.sprite;
    this._ensureTargetId(sp, 'enemyA');

    this.physics.add.overlap(this.normalBullets, sp, (_sp, bullet) => {
      this._handlePlayerBulletHit(bullet, enemy, sp);
    });
    this.physics.add.overlap(this.missileBullets, sp, (_sp, bullet) => {
      this._handlePlayerBulletHit(bullet, enemy, sp);
    });
    // Enemy contact kills player
    this.physics.add.overlap(this.player.sprite, sp, () => {
      if (enemy.alive) this._killPlayer();
    });
  }

  _registerEnemyB(enemy) {
    const sp = enemy.sprite;
    this._ensureTargetId(sp, 'enemyB');

    this.physics.add.overlap(this.normalBullets, sp, (_sp, bullet) => {
      this._handlePlayerBulletHit(bullet, enemy, sp);
    });
    this.physics.add.overlap(this.missileBullets, sp, (_sp, bullet) => {
      this._handlePlayerBulletHit(bullet, enemy, sp);
    });
    this.physics.add.overlap(this.player.sprite, sp, () => {
      if (enemy.alive) this._killPlayer();
    });
  }

  _registerEnemyC(enemy) {
    const sp = enemy.sprite;
    this._ensureTargetId(sp, 'enemyC');

    this.physics.add.overlap(this.normalBullets, sp, (_sp, bullet) => {
      this._handlePlayerBulletHit(bullet, enemy, sp);
    });
    this.physics.add.overlap(this.missileBullets, sp, (_sp, bullet) => {
      this._handlePlayerBulletHit(bullet, enemy, sp);
    });
    this.physics.add.overlap(this.player.sprite, sp, () => {
      if (enemy.alive) this._killPlayer();
    });
  }

  _registerBoss(boss) {
    for (const zone of boss._hitZones) {
      this._ensureTargetId(zone, 'boss');

      this.physics.add.overlap(this.normalBullets, zone, (_z, bullet) => {
        this._handlePlayerBulletHit(bullet, boss, zone);
      });
      this.physics.add.overlap(this.missileBullets, zone, (_z, bullet) => {
        this._handlePlayerBulletHit(bullet, boss, zone);
      });
      this.physics.add.overlap(this.player.sprite, zone, () => {
        if (boss.alive) this._killPlayer();
      });
    }
  }

  _registerEnemyD(enemy) {
    const sp = enemy.sprite;
    this._ensureTargetId(sp, 'enemyD');

    this.physics.add.overlap(this.normalBullets, sp, (_sp, bullet) => {
      this._handlePlayerBulletHit(bullet, enemy, sp);
    });
    this.physics.add.overlap(this.missileBullets, sp, (_sp, bullet) => {
      this._handlePlayerBulletHit(bullet, enemy, sp);
    });
    this.physics.add.overlap(this.player.sprite, sp, () => {
      if (enemy.alive) this._killPlayer();
    });
  }

  _registerEnemyE(enemy) {
    const sp = enemy.sprite;
    this._ensureTargetId(sp, 'enemyE');

    this.physics.add.overlap(this.normalBullets, sp, (_sp, bullet) => {
      this._handlePlayerBulletHit(bullet, enemy, sp);
    });
    this.physics.add.overlap(this.missileBullets, sp, (_sp, bullet) => {
      this._handlePlayerBulletHit(bullet, enemy, sp);
    });
    this.physics.add.overlap(this.player.sprite, sp, () => {
      if (enemy.alive) this._killPlayer();
    });
  }

  _registerPowerUp(pu) {
    this.physics.add.overlap(this.player.sprite, pu.sprite, () => {
      if (!pu.alive) return;
      pu.collect();
      if (this.player.alive) {
        this.player.activatePowerUp(pu.type);
      }
    });
  }

  _ensureTargetId(sprite, prefix = 'target') {
    if (!sprite._hitTargetId) {
      sprite._hitTargetId = `${prefix}-${this._nextTargetId++}`;
    }
    return sprite._hitTargetId;
  }

  _handlePlayerBulletHit(bullet, target, sprite) {
    if (!bullet?.active || !bullet.body?.enable || !target?.alive || !sprite?.active) {
      return;
    }

    if (bullet.damage === undefined || bullet.piercing === undefined) {
      return;
    }

    const targetId = this._ensureTargetId(sprite);
    if (!bullet.hitTargets) bullet.hitTargets = new Set();
    if (bullet.hitTargets.has(targetId)) {
      return;
    }

    bullet.hitTargets.add(targetId);

    if (!bullet.piercing) {
      this._recycleBullet(bullet);
    }

    const wasAlive = target.alive;
    target.hit(bullet.damage);

    // Award score on kill
    if (wasAlive && !target.alive) {
      this._addScore(target.scoreValue ?? 0);
    }
  }

  _addScore(points) {
    if (!points) return;
    this._score += points;
    this.game.events.emit('scoreUpdate', this._score);
  }

  _recycleBullet(bullet) {
    bullet.setActive(false).setVisible(false);
    bullet.setVelocity(0, 0);
    if (bullet.body) {
      bullet.body.setEnable(false);
    }
    bullet.hitTargets = new Set();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WAVE SPAWNER
  // ─────────────────────────────────────────────────────────────────────────────
  _checkWaves() {
    const t = this._gameTime;

    // ── Phase 1: Opening (0–30s) ──────────────────────────────────────────────
    if (t >= 2000  && !this._wavesTriggered.has(1))  { this._wavesTriggered.add(1);  this._spawnEnemyA(3); }
    if (t >= 6000  && !this._wavesTriggered.has(2))  { this._wavesTriggered.add(2);  this._spawnEnemyA(3); this._spawnEnemyB(2); }
    if (t >= 11000 && !this._wavesTriggered.has(3))  { this._wavesTriggered.add(3);  this._spawnEnemyB(4); }
    if (t >= 16000 && !this._wavesTriggered.has(4))  { this._wavesTriggered.add(4);  this._spawnEnemyA(3); this._spawnEnemyC(1); }
    if (t >= 21000 && !this._wavesTriggered.has(5))  { this._wavesTriggered.add(5);  this._spawnEnemyB(4); this._spawnEnemyC(2); }
    if (t >= 27000 && !this._wavesTriggered.has(6))  { this._wavesTriggered.add(6);  this._spawnEnemyA(4); this._spawnEnemyB(3); }

    // ── Phase 2: Late (30–60s) ────────────────────────────────────────────────
    if (t >= 33000 && !this._wavesTriggered.has(20)) { this._wavesTriggered.add(20); this._spawnEnemyA(4); this._spawnEnemyC(2); }
    if (t >= 38000 && !this._wavesTriggered.has(21)) { this._wavesTriggered.add(21); this._spawnEnemyB(5); this._spawnEnemyE(3); }
    if (t >= 43000 && !this._wavesTriggered.has(22)) { this._wavesTriggered.add(22); this._spawnEnemyA(5); this._spawnEnemyC(2); }
    if (t >= 48000 && !this._wavesTriggered.has(23)) { this._wavesTriggered.add(23); this._spawnEnemyB(4); this._spawnEnemyC(3); }
    if (t >= 53000 && !this._wavesTriggered.has(24)) {
      this._wavesTriggered.add(24);
      this._spawnEnemyA(5); this._spawnEnemyB(4);
      this._bgScrollSpeed = 0.3;
    }
    if (t >= 58000 && !this._wavesTriggered.has(25)) { this._wavesTriggered.add(25); this._spawnEnemyC(3); this._spawnEnemyE(4); }

    // ── Boss alert (60s) → boss spawns 5s later at 65s ───────────────────────
    if (t >= 60000 && !this._wavesTriggered.has(7)) {
      this._wavesTriggered.add(7);
      this._scrollLocked = true;
      this._bgScrollSpeed = 0;
      this.game.events.emit('bossAlert');
      this.time.delayedCall(5000, () => {
        this.game.events.emit('bossAlertDone');
        this._spawnBoss();
      });
    }

    // ── EnemyE Flanker waves ──────────────────────────────────────────────────
    if (t >= 4000  && !this._wavesTriggered.has(11)) { this._wavesTriggered.add(11); this._spawnEnemyE(2); }
    if (t >= 14000 && !this._wavesTriggered.has(12)) { this._wavesTriggered.add(12); this._spawnEnemyE(3); }
    if (t >= 26000 && !this._wavesTriggered.has(13)) { this._wavesTriggered.add(13); this._spawnEnemyE(4); }

    // ── EnemyD Carrier waves: evenly spread at 10s / 30s / 50s ──────────────
    if (t >= 10000 && !this._wavesTriggered.has(8)) {
      this._wavesTriggered.add(8);
      this._spawnEnemyD(1); // drops: spread
    }
    if (t >= 30000 && !this._wavesTriggered.has(9)) {
      this._wavesTriggered.add(9);
      this._spawnEnemyD(1); // drops: missile
    }
    if (t >= 50000 && !this._wavesTriggered.has(10)) {
      this._wavesTriggered.add(10);
      this._spawnEnemyD(1); // drops: rapid
    }

    // ── Difficulty scaling triggers ───────────────────────────────────────────
    if (t >= 20000 && !this._wavesTriggered.has('diff-a1')) {
      this._wavesTriggered.add('diff-a1');
      for (const e of this.enemiesA) { if (e.alive) e.scaleDifficulty(1); }
    }
    if (t >= 35000 && !this._wavesTriggered.has('diff-b1')) {
      this._wavesTriggered.add('diff-b1');
      for (const e of this.enemiesB) { if (e.alive) e.scaleDifficulty(1); }
    }
    if (t >= 45000 && !this._wavesTriggered.has('diff-c1')) {
      this._wavesTriggered.add('diff-c1');
      for (const e of this.enemiesC) { if (e.alive) e.scaleDifficulty(1); }
    }
    if (t >= 55000 && !this._wavesTriggered.has('diff-a2')) {
      this._wavesTriggered.add('diff-a2');
      for (const e of this.enemiesA) { if (e.alive) e.scaleDifficulty(2); }
    }
  }

  _spawnEnemyA(count) {
    const W = this._W, H = this._H;
    const spacing = 80;
    const startY = Phaser.Math.Between(120, H - 120);
    for (let i = 0; i < count; i++) {
      const y = startY + i * spacing;
      const e = new EnemyA(this, W + 40, Phaser.Math.Clamp(y, 60, H - 60));
      e.scoreValue = 100;
      e.enemyBullets = this.enemyBullets;
      e._player = this.player;
      // Apply already-active difficulty tiers
      if (this._gameTime >= 20000) e.scaleDifficulty(1);
      if (this._gameTime >= 55000) e.scaleDifficulty(2);
      this.enemiesA.push(e);
      this._registerEnemyA(e);
    }
  }

  _spawnEnemyB(count) {
    const W = this._W, H = this._H;
    const rows = Math.ceil(count / 2);
    let spawned = 0;
    for (let row = 0; row < rows && spawned < count; row++) {
      const cols = Math.min(2, count - spawned);
      for (let col = 0; col < cols; col++) {
        const y = H / 2 - ((rows - 1) * 50) / 2 + row * 50;
        const x = W + 40 + col * 36;
        const e = new EnemyB(this, x, Phaser.Math.Clamp(y, 60, H - 60));
        e.scoreValue = 150;
        e._player = this.player;
        if (this._gameTime >= 35000) e.scaleDifficulty(1);
        this.enemiesB.push(e);
        this._registerEnemyB(e);
        spawned++;
      }
    }
  }

  _spawnEnemyC(count) {
    const W = this._W, H = this._H;
    const spacing = 90;
    const startY = Phaser.Math.Between(100, H - 100);
    for (let i = 0; i < count; i++) {
      const y = Phaser.Math.Clamp(startY + i * spacing, 60, H - 60);
      const e = new EnemyC(this, W + 60 + i * 50, y);
      e.scoreValue = 200;
      e.enemyBullets = this.enemyBullets;
      e._player = this.player;
      if (this._gameTime >= 45000) e.scaleDifficulty(1);
      this.enemiesC.push(e);
      this._registerEnemyC(e);
    }
  }

  _spawnEnemyD(count) {
    const W = this._W, H = this._H;
    for (let i = 0; i < count; i++) {
      const y = Phaser.Math.Between(80, H - 80);
      const variantIndex = this._powerUpTypeIndex;
      const dropType = this._nextPowerUpType();
      const e = new EnemyD(this, W + 60, y, (ex, ey) => {
        this._spawnPowerUp(ex, ey, dropType);
      }, variantIndex);
      e.scoreValue = 300;
      e.enemyBullets = this.enemyBullets;
      e._player = this.player;
      this.enemiesD.push(e);
      this._registerEnemyD(e);
    }
  }

  _spawnEnemyE(count) {
    const W = this._W, H = this._H;
    for (let i = 0; i < count; i++) {
      // Alternate spawning from top and bottom edges
      const fromTop = i % 2 === 0;
      const y = fromTop ? Phaser.Math.Between(40, H * 0.3) : Phaser.Math.Between(H * 0.7, H - 40);
      const e = new EnemyE(this, W + 40 + i * 30, y);
      e.enemyBullets = this.enemyBullets;
      e._player = this.player;
      this.enemiesE.push(e);
      this._registerEnemyE(e);
    }
  }

  _nextPowerUpType() {
    const type = this._powerUpTypes[this._powerUpTypeIndex % this._powerUpTypes.length];
    this._powerUpTypeIndex++;
    return type;
  }

  _spawnPowerUp(x, y, type) {
    const pu = new PowerUp(this, x, y, type);
    this.powerUps.push(pu);
    this._registerPowerUp(pu);
  }

  _spawnBoss() {
    const W = this._W, H = this._H;
    this._bossActive = true;
    const b = new Boss(this, W + 80, H / 2);
    b._player = this.player;
    b.spreadBullets = this.spreadBullets;
    b.aimedBullets = this.aimedBullets;
    this.boss = b;
    this._registerBoss(b);

    // Slide boss onto screen
    this.tweens.add({
      targets: b.sprite,
      x: W - 100,
      duration: 2000,
      ease: 'Power2',
      onUpdate: () => {
        b._syncBody();
      },
      onComplete: () => {
        b._syncBody();
        b.homeX = b.sprite.x;
        b.homeY = b.sprite.y;
        b.behaviorTimer = 600; // short delay before first attack
      }
    });

    // Show boss HP bar
    this.game.events.emit('bossEntered', b.hp, b.maxHp);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DEATH & WIN
  // ─────────────────────────────────────────────────────────────────────────────
  _killPlayer() {
    if (this._gameOver || !this.player.alive) return;
    this._gameOver = true;
    this.player.die();
    this.game.events.emit('playerDied');

    this.time.delayedCall(600, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', { score: this._score });
    });
  }

  _onBossDying(bossSprite) {
    if (this._gameOver) return;
    this._gameOver = true;
    this._addScore(1000);

    // Clear all active bullets so the screen goes quiet
    [this.normalBullets, this.enemyBullets, this.spreadBullets, this.aimedBullets, this.missileBullets]
      .forEach(g => g.getChildren().forEach(b => this._recycleBullet(b)));

    // Freeze player input / movement
    this.player.alive = false;

    const W = this._W, H = this._H;
    const bx = bossSprite.x;
    const by = bossSprite.y;

    // ── Phase 1: Staggered explosions across the boss body (0–2.2 s) ──────────
    // Spread hit points relative to boss center covering the whole sprite area
    const hitPoints = [
      { dx:   0, dy:   0 },   // center
      { dx: -130, dy: -60 },  // top-left
      { dx:  130, dy: -80 },  // top-right
      { dx: -160, dy:  30 },  // cannon arm
      { dx:   80, dy:  80 },  // lower body
      { dx: -60,  dy: -120 }, // head
      { dx:  180, dy:  40 },  // right wing
      { dx: -100, dy: 100 },  // lower-left
      { dx:  60,  dy: -40 },  // cockpit
      { dx:  140, dy: -100 }, // top-right corner
    ];

    hitPoints.forEach((pt, i) => {
      this.time.delayedCall(i * 220, () => {
        if (!this.scene.isActive()) return;
        const ex = bx + pt.dx;
        const ey = by + pt.dy;

        // Spritesheet explosion (medium size, arcade feel)
        const sz = Phaser.Math.Between(80, 140);
        if (this.textures.exists('explode')) {
          const anim = this.add.sprite(ex, ey, 'explode', 0)
            .setDisplaySize(sz, sz)
            .setDepth(16)
            .setOrigin(0.5, 0.5);
          anim.play('explode');
          anim.once('animationcomplete', () => anim.destroy());
        }

        // Screen shake on the first few hits for impact
        if (i < 4) {
          this.cameras.main.shake(180, 0.010 - i * 0.002);
        }

        // Flash the boss sprite white then back for each hit
        if (bossSprite && bossSprite.active) {
          bossSprite.setTintFill(0xffffff);
          this.time.delayedCall(80, () => {
            if (bossSprite && bossSprite.active) bossSprite.clearTint();
          });
        }
      });
    });

    // ── Phase 2: Boss sprite fades out (starts at 2.0 s) ─────────────────────
    this.time.delayedCall(2000, () => {
      if (!this.scene.isActive()) return;
      this.tweens.add({
        targets: bossSprite,
        alpha: 0,
        duration: 700,
        ease: 'Power2',
        onComplete: () => {
          if (bossSprite) bossSprite.setVisible(false);
        },
      });
      // One final big explosion on fadeout
      if (this.textures.exists('explode')) {
        const finale = this.add.sprite(bx, by, 'explode', 0)
          .setDisplaySize(220, 220)
          .setDepth(17)
          .setOrigin(0.5, 0.5);
        finale.play('explode');
        finale.once('animationcomplete', () => finale.destroy());
      }
      this.cameras.main.shake(400, 0.018);
    });

    // ── Phase 3: Player victory flyby (starts at 2.9 s) ──────────────────────
    this.time.delayedCall(2900, () => {
      if (!this.scene.isActive()) return;
      const playerSprite = this.player.sprite;

      // Keep the ship exactly where it is — just make sure it's visible and frozen
      playerSprite.setActive(true).setVisible(true).setAlpha(1);
      if (playerSprite.body) {
        playerSprite.body.setVelocity(0, 0);
        playerSprite.body.setEnable(false);
      }
      if (this.textures.exists('spaceship-default')) {
        playerSprite.setTexture('spaceship-default');
      }

      // Fly from current position off the right edge
      this.tweens.add({
        targets: playerSprite,
        x: W + 120,
        duration: 1400,
        ease: 'Quad.easeIn',
      });
    });

    // ── Phase 4: Transition to WinScene (starts at 4.6 s) ────────────────────
    this.time.delayedCall(4600, () => {
      if (!this.scene.isActive()) return;
      // White flash then cut
      this.cameras.main.flash(400, 255, 255, 255);
      this.time.delayedCall(400, () => {
        this.scene.stop('UIScene');
        this.scene.start('WinScene', { score: this._score });
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────────────────────
  update(time, delta) {
    if (this._gameOver) return;

    // ── Pause toggle ──────────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this._escKey)) {
      this.scene.pause();
      this.scene.pause('UIScene');
      this.scene.launch('PauseScene');
      return;
    }

    this._gameTime += delta;

    // Scrolling background
    this._scrollBg(delta);

    // Wave spawner
    this._checkWaves();

    // Player
    this.player.update(time, delta);
    this.player.updateMissiles(delta);

    // Enemies A
    for (const e of this.enemiesA) {
      if (e.alive) e.update(time, delta);
    }

    // Enemies B
    for (const e of this.enemiesB) {
      if (e.alive) e.update(time, delta);
    }

    // Enemies C
    for (const e of this.enemiesC) {
      if (e.alive) e.update(time, delta);
    }

    // Enemies D
    for (const e of this.enemiesD) {
      if (e.alive) e.update(time, delta);
    }

    // Enemies E
    for (const e of this.enemiesE) {
      if (e.alive) e.update(time, delta);
    }

    // Power-ups
    for (const pu of this.powerUps) {
      if (pu.alive) pu.update(time, delta);
    }

    // Boss
    if (this.boss && this.boss.alive) {
      this.boss.update(time, delta);
    }

    // Recycle off-screen bullets
    this._cullBullets(this.normalBullets);
    this._cullBullets(this.enemyBullets);
    this._cullBullets(this.spreadBullets);
    this._cullBullets(this.aimedBullets);
    this._cullBullets(this.missileBullets);
  }

  _scrollBg(delta) {
    this._bg.tilePositionX        += delta * 0.05;
    this._cloudsMid.tilePositionX += delta * 0.2;
    this._clouds.tilePositionX    += delta * 0.3;
  }

  _cullBullets(group) {
    const W = this._W, H = this._H;
    group.getChildren().forEach(b => {
      if (!b.active) return;
      if (b.x > W + 40 || b.x < -40 || b.y > H + 40 || b.y < -40) {
        this._recycleBullet(b);
      }
    });
  }
}
