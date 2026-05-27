/**
 * UIScene — runs in parallel with GameScene
 * Displays:
 *   - Score (top-left)
 *   - Charge bar (bottom-left)
 *   - Power-up name + timer (above charge bar)
 *   - Boss HP bar (top-center, hidden until boss enters)
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── Score HUD ─────────────────────────────────────────────────────────────
    this._scoreText = this.add.text(20, 16, 'SCORE  0', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setDepth(22);

    // ── Power-up HUD (bottom-left) ────────────────────────────────────────────
    const hudX = 20;
    const hudY = H - 28;
    this._powerUpLabel = this.add.text(hudX, hudY, '', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#00eeff',
    }).setDepth(22).setVisible(false);

    this._powerUpTimer = this.add.text(hudX + 90, hudY, '', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#aaffff',
    }).setDepth(22).setVisible(false);

    const POWERUP_COLORS = {
      spread:  '#00eeff',
      missile: '#ff6622',
      rapid:   '#ffee00',
    };
    this._powerUpColors = POWERUP_COLORS;

    // ── Boss HP Bar ───────────────────────────────────────────────────────────
    const bossBarW = 300;
    const bossBarH = 18;
    const bossBarX = W / 2 - bossBarW / 2;
    const bossBarY = 22;

    this._bossBarContainer = this.add.container(0, 0).setDepth(20).setVisible(false);

    const bossBg = this.add.rectangle(W / 2, bossBarY, bossBarW + 4, bossBarH + 4, 0x000000).setOrigin(0.5, 0.5);
    const bossTrack = this.add.rectangle(W / 2, bossBarY, bossBarW, bossBarH, 0x440000).setOrigin(0.5, 0.5);
    this._bossBarFill = this.add.rectangle(bossBarX, bossBarY, bossBarW, bossBarH, 0xff2222).setOrigin(0, 0.5);
    this._bossLabel = this.add.text(W / 2, bossBarY - 16, 'BOSS', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#ff8888',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this._bossBarContainer.add([bossBg, bossTrack, this._bossBarFill, this._bossLabel]);
    this._bossBarMaxW = bossBarW;
    this._bossBarX = bossBarX;

    // ── Event listeners ───────────────────────────────────────────────────────
    // ── Boss alert banner (hidden until triggered) ────────────────────────────
    this._bossAlertOverlay = this.add.rectangle(0, 0, W, H, 0x330000, 0.75)
      .setOrigin(0, 0).setDepth(90).setVisible(false);

    const alertImg = this.textures.exists('boss-alert')
      ? this.add.image(W / 2, H / 2, 'boss-alert')
      : null;
    if (alertImg) {
      const imgW = Math.min(W * 0.7, 760);
      alertImg.setDisplaySize(imgW, imgW * (869 / 1810))
        .setDepth(91).setVisible(false);
    }
    this._bossAlertImage = alertImg;
    this._bossAlertTween = null;

    this.game.events.on('bossEntered', this._onBossEntered, this);
    this.game.events.on('bossHpUpdate', this._onBossHpUpdate, this);
    this.game.events.on('scoreUpdate', this._onScoreUpdate, this);
    this.game.events.on('powerUpUpdate', this._onPowerUpUpdate, this);
    this.game.events.on('playerDied', this._onPlayerDied, this);
    this.game.events.on('bossAlert', this._onBossAlert, this);
    this.game.events.on('bossAlertDone', this._onBossAlertDone, this);

    this.events.once('shutdown', () => {
      this.game.events.off('bossEntered', this._onBossEntered, this);
      this.game.events.off('bossHpUpdate', this._onBossHpUpdate, this);
      this.game.events.off('scoreUpdate', this._onScoreUpdate, this);
      this.game.events.off('powerUpUpdate', this._onPowerUpUpdate, this);
      this.game.events.off('playerDied', this._onPlayerDied, this);
      this.game.events.off('bossAlert', this._onBossAlert, this);
      this.game.events.off('bossAlertDone', this._onBossAlertDone, this);
    });
  }

  _onScoreUpdate(score) {
    this._scoreText.setText('SCORE  ' + score);
  }

  _onPowerUpUpdate(activeTypes) {
    if (!activeTypes || activeTypes.length === 0) {
      this._powerUpLabel.setVisible(false);
      this._powerUpTimer.setVisible(false);
      return;
    }
    const names = { spread: 'SPREAD', missile: 'MISSILE', rapid: 'RAPID' };
    const labelText = activeTypes.map(t => names[t] ?? t.toUpperCase()).join(' + ');
    // Color: use first active type's color, or white if mixed
    const color = activeTypes.length === 1
      ? (this._powerUpColors[activeTypes[0]] ?? '#ffffff')
      : '#ffffff';
    this._powerUpLabel.setText(labelText);
    this._powerUpLabel.setColor(color);
    this._powerUpLabel.setVisible(true);
    this._powerUpTimer.setVisible(false);
  }

  _onBossAlert() {
    this._bossAlertOverlay.setVisible(true).setAlpha(0);
    this.tweens.add({
      targets: this._bossAlertOverlay,
      alpha: 0.75,
      duration: 400,
      ease: 'Quad.easeOut',
    });

    if (this._bossAlertImage) {
      this._bossAlertImage.setVisible(true).setAlpha(1);
      this._bossAlertTween = this.tweens.add({
        targets: this._bossAlertImage,
        alpha: 0.15,
        duration: 380,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    }
  }

  _onBossAlertDone() {
    if (this._bossAlertTween) {
      this._bossAlertTween.stop();
      this._bossAlertTween = null;
    }
    const targets = [this._bossAlertOverlay, this._bossAlertImage].filter(Boolean);
    this.tweens.add({
      targets,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => targets.forEach(t => t.setVisible(false)),
    });
  }

  _onPlayerDied() {
    const W = this.scale.width;
    const H = this.scale.height;
    const flash = this.add.rectangle(0, 0, W, H, 0xff0000, 0.6).setOrigin(0, 0).setDepth(100);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  _onBossEntered(hp, maxHp) {
    this._bossBarContainer.setVisible(true);
    this._bossBarFill.width = this._bossBarMaxW;
  }

  _onBossHpUpdate(hp, maxHp) {
    const ratio = Math.max(0, hp / maxHp);
    this._bossBarFill.width = ratio * this._bossBarMaxW;
    const r = Math.floor(Phaser.Math.Linear(0, 255, 1 - ratio));
    const g = Math.floor(Phaser.Math.Linear(255, 0, 1 - ratio));
    this._bossBarFill.setFillStyle(Phaser.Display.Color.GetColor(r, g, 0));
  }
}

