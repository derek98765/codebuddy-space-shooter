/**
 * MobileInput
 * -----------
 * Translates touch input into a directional velocity vector for the player.
 *
 * Behaviour:
 *   - The player holds anywhere on screen.
 *   - The DIRECTION from the initial touch point to the current finger position
 *     determines the movement direction (not the absolute position).
 *   - A dead-zone of DEAD_RADIUS pixels prevents micro-drift.
 *   - Returns { vx, vy } normalized — multiply by PLAYER_SPEED in Player.
 *
 * No visible joystick knob is rendered (keep the shmup feel clean).
 * The touch area is the entire game canvas.
 */

const DEAD_RADIUS = 12; // px — ignore tiny wobbles

export class MobileInput {
  constructor(scene) {
    this.scene = scene;

    this._active  = false;
    this._startX  = 0;
    this._startY  = 0;
    this._dx      = 0;
    this._dy      = 0;
    this._pointerId = null;

    // Bind to Phaser pointer events on the whole scene
    scene.input.on('pointerdown', this._onDown, this);
    scene.input.on('pointermove', this._onMove, this);
    scene.input.on('pointerup',   this._onUp,   this);
    scene.input.on('pointerupoutside', this._onUp, this);
  }

  _onDown(pointer) {
    // Only track one finger (the first one down)
    if (this._active) return;
    this._active     = true;
    this._pointerId  = pointer.id;
    this._startX     = pointer.x;
    this._startY     = pointer.y;
    this._dx         = 0;
    this._dy         = 0;
  }

  _onMove(pointer) {
    if (!this._active || pointer.id !== this._pointerId) return;
    this._dx = pointer.x - this._startX;
    this._dy = pointer.y - this._startY;
  }

  _onUp(pointer) {
    if (pointer.id !== this._pointerId) return;
    this._active    = false;
    this._pointerId = null;
    this._dx        = 0;
    this._dy        = 0;
  }

  /**
   * Returns { vx, vy } — each in [-1, 1], normalized for diagonals.
   * Multiply by PLAYER_SPEED when setting physics velocity.
   */
  getDirection() {
    if (!this._active) return { vx: 0, vy: 0 };

    const dx = this._dx;
    const dy = this._dy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < DEAD_RADIUS) return { vx: 0, vy: 0 };

    // Normalize
    let vx = dx / dist;
    let vy = dy / dist;

    return { vx, vy };
  }

  /** True if a touch is currently held */
  get isDown() {
    return this._active;
  }

  destroy() {
    this.scene.input.off('pointerdown', this._onDown, this);
    this.scene.input.off('pointermove', this._onMove, this);
    this.scene.input.off('pointerup',   this._onUp,   this);
    this.scene.input.off('pointerupoutside', this._onUp, this);
  }
}
