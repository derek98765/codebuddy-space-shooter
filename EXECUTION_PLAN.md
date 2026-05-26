# Execution Plan — Space Shooter MVP

## Tech Stack

- **Phaser 3** (CDN, no build tool needed — plain HTML + JS)
- Single `index.html` entry point
- Source split into logical JS files loaded as ES modules

---

## File Structure

```
/
├── index.html
├── GDD.md
├── EXECUTION_PLAN.md
├── src/
│   ├── main.js               # Phaser game config, scene registration
│   ├── scenes/
│   │   ├── GameScene.js      # Core gameplay
│   │   ├── UIScene.js        # HUD (charge bar, boss HP bar) — runs parallel
│   │   ├── GameOverScene.js
│   │   └── WinScene.js
│   ├── entities/
│   │   ├── Player.js
│   │   ├── EnemyA.js
│   │   ├── EnemyB.js
│   │   └── Boss.js
│   └── config/
│       └── sprites.js        # Sprite/asset config (swap placeholders with real art here)
└── assets/                   # Empty for now, sprites dropped here later
```

---

## Build Milestones (targeting 1–2 hours total)

### Milestone 1 — Scaffold & Scrolling Background (15 min)
- `index.html` with Phaser 3 CDN
- `GameScene` with scrolling star background
- Player ship placeholder (blue rect) on screen, 8-directional movement
- Screen boundary clamping

### Milestone 2 — Player Shooting (15 min)
- `Z` key: rapid-fire bullet (auto-fire while held, bullet travels right)
- `X` key: hold-to-charge mechanic with visual charge indicator (rect grows on ship)
- Release fires large charged bullet
- Bullets despawn off-screen

### Milestone 3 — Enemy A (15 min)
- Enemy A spawns from right, sine-wave movement
- Enemy A fires aimed bullet at player every N seconds
- Bullet collision: enemy dies on 1 hit from player bullet
- Player dies on contact with enemy or enemy bullet → Game Over scene

### Milestone 4 — Enemy B (15 min)
- Enemy B spawns in formation from right
- Straight flight → kamikaze dive when within ~200px range
- Same collision rules

### Milestone 5 — Level Scrolling & Wave Spawner (15 min)
- Time-based wave spawner in `GameScene`
- Auto-scroll logic (background scroll speed)
- Wave sequence matches the GDD level structure table

### Milestone 6 — Boss (20 min)
- Screen scroll stops, Boss enters from right
- HP = 20, boss HP bar rendered in UIScene
- 3 cycling behaviors (spread shot, aimed shot, lunge)
- Boss death → Win scene

### Milestone 7 — Polish Pass (5 min)
- Game Over / Win screens with "Restart" button
- Charge bar in UIScene
- Verify all collisions are correct
- Quick playthrough test

---

## Sprite Swap Strategy

The `src/config/sprites.js` file maps entity names to asset keys. When replacing placeholders with real pixel art:
1. Drop sprite files into `/assets`
2. Update `sprites.js` with the new asset keys
3. No changes required to game logic

---

## Notes

**Why Phaser 3?**
Phaser 3 includes a built-in arcade physics engine, scene management, input handling, and group/sprite management — everything needed without a build pipeline. Fastest path to a working browser game in 1–2 hours. Alternatives like PixiJS require writing more game systems from scratch; Unity/Godot add compilation overhead.
