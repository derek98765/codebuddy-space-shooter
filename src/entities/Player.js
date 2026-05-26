import { SPRITES } from '../config/sprites.js';

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
    this.sprite = scene.physics.add.image(x, y, '__DEFAULT');
    // Generate a plain colored rectangle texture on the fly
    const cfg = SPRITES.player;
    this._makeTexture('player_tex', cfg.width, cfg.height, cfg.color);
    this.sprite.setTexture('player_tex');
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
    this.fireRate = 160; // ms between rapid-fire bullets
    this.normalDamage = 1;
    this.chargedDamage = 2;
    this.chargeTime = 0;
    this.maxCharge = 1500; // ms to full charge
    this.isCharging = false;

    this.alive = true;

    // Bullet groups (set from GameScene after creation)
    this.normalBullets = null;
    this.chargedBullets = null;
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

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }
    sp.setVelocity(vx, vy);

    // --- Rapid-fire (J key) ---
    if (Phaser.Input.Keyboard.JustDown(this.keyJ)) {
      this.fireTimer = 0; // fire immediately on press
    }
    if (this.keyJ.isDown && this.normalBullets) {
      this.fireTimer -= delta;
      if (this.fireTimer <= 0) {
        this._fireNormal();
        this.fireTimer = this.fireRate;
      }
    }

    // --- Charge shot (K key) ---
    if (this.keyK.isDown) {
      this.isCharging = true;
      this.chargeTime = Math.min(this.chargeTime + delta, this.maxCharge);
    }

    if (!this.keyK.isDown && this.isCharging) {
      // Release — fire charged shot
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

    // Emit charge ratio for UIScene HUD
    this.game.events.emit('chargeUpdate', chargeRatio);
  }

  _fireNormal() {
    const cfg = SPRITES.bulletNormal;
    this._ensureTexture('bullet_normal_tex', cfg.width, cfg.height, cfg.color);
    const b = this.normalBullets.get(
      this.sprite.x + SPRITES.player.width / 2 + 4,
      this.sprite.y,
      'bullet_normal_tex'
    );
    if (!b) return;
    // Immediately disable body so no overlap fires while we configure
    b.body.setEnable(false);
    // Set all game properties
    b.charged = false;
    b.piercing = false;
    b.damage = this.normalDamage;
    b.hitTargets = new Set();
    // Now position, configure and re-enable
    b.setActive(true).setVisible(true).setDepth(9);
    b.body.reset(this.sprite.x + SPRITES.player.width / 2 + 4, this.sprite.y);
    b.setVelocityX(600);
    b.setVelocityY(0);
    b.body.setEnable(true);
    console.log('[FIRE-NORMAL] damage=', b.damage, 'piercing=', b.piercing, 'bodyEnable=', b.body.enable);
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
    // Immediately disable body so no overlap fires while we configure
    b.body.setEnable(false);
    // Set all game properties
    b.charged = true;
    b.piercing = true;
    b.damage = this.chargedDamage;
    b.hitTargets = new Set();
    // Now position, configure and re-enable
    b.setActive(true).setVisible(true).setDepth(9);
    b.body.reset(this.sprite.x + SPRITES.player.width / 2 + 4, this.sprite.y);
    b.setVelocityX(480);
    b.setVelocityY(0);
    b.body.setEnable(true);
    console.log('[FIRE-CHARGED] damage=', b.damage, 'piercing=', b.piercing, 'bodyEnable=', b.body.enable);
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
    this.sprite.setActive(false).setVisible(false);
    this.chargeBar.setVisible(false);
  }

  destroy() {
    this.chargeBar.destroy();
    this.sprite.destroy();
  }
}
