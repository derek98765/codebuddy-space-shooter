# Art Asset Checklist

## Must-Have Sprites

### Player
| File | Size | Notes |
|---|---|---|
| `player.png` | 64×32 px | Facing right; cockpit, wings, thruster nozzle at left end |

### Enemies
| File | Size | Notes |
|---|---|---|
| `enemy_a.png` | 48×32 px | Sniper — sleek, angular, facing left |
| `enemy_b.png` | 40×32 px | Kamikaze — aggressive pointed nose, facing left |
| `enemy_c.png` | 64×40 px | Tank — bulky/armored, facing left |
| `enemy_d.png` | 64×48 px | Carrier — wide, facing left |

### Boss
| File | Size | Notes |
|---|---|---|
| `boss.png` | 160×240 px | Facing left; large asymmetric design with visible weapon ports |

### Player Bullets
| File | Size | Notes |
|---|---|---|
| `bullet_normal.png` | 16×6 px | Small horizontal energy bolt |
| `bullet_charged.png` | 32×16 px | Large glowing orb/bolt |
| `missile.png` | 20×10 px | Rocket shape with nose cone |

### Enemy Bullets
| File | Size | Notes |
|---|---|---|
| `bullet_enemy.png` | 12×8 px | Red/plasma oval |
| `boss_bullet_spread.png` | 14×14 px | Magenta energy orb |
| `boss_bullet_aimed.png` | 18×18 px | Red pulsing orb |
| `boss_laser.png` | 24×6 px | Cyan laser segment (tiled along flight path) |
| `boss_beam_core.png` | 48×18 px | Yellow/white beam core segment |
| `boss_beam_arc.png` | 44×10 px | Yellow glow arc segment |

### Power-Ups
| File | Size | Notes |
|---|---|---|
| `powerup_spread.png` | 24×24 px | Cyan gem/orb |
| `powerup_missile.png` | 24×24 px | Orange gem/orb |
| `powerup_rapid.png` | 24×24 px | Yellow gem/orb |

---

## Parallax Background Layers

All layers: **1280×720 px**, PNG, seamlessly tileable horizontally.

| File | Scroll Speed | Content |
|---|---|---|
| `bg_layer0.png` *(optional)* | 0.1× | Faint nebula wash / distant galaxy smudges |
| `bg_layer1.png` | 0.25× | Dense small pinpoint stars |
| `bg_layer2.png` | 0.5× | Medium stars, brighter clusters |
| `bg_layer3.png` | 1.0× | Sparse large/bright stars, nebula wisps |
| `bg_layer4.png` *(optional)* | 1.8× | Fast-moving dust streaks for speed feel |

---

## Checklist

**Must-have:**
- [ ] `player.png`
- [ ] `enemy_a.png`, `enemy_b.png`, `enemy_c.png`, `enemy_d.png`
- [ ] `boss.png`
- [ ] `bullet_normal.png`, `bullet_charged.png`, `bullet_enemy.png`
- [ ] `bg_layer1.png`, `bg_layer2.png`, `bg_layer3.png`

**Nice-to-have:**
- [ ] `missile.png`
- [ ] `powerup_spread.png`, `powerup_missile.png`, `powerup_rapid.png`
- [ ] `boss_bullet_spread.png`, `boss_bullet_aimed.png`, `boss_laser.png`, `boss_beam_core.png`, `boss_beam_arc.png`
- [ ] `bg_layer0.png`, `bg_layer4.png`

> All sprites should be **PNG with transparency**, pixel art style.  
> Place finished files in `/assets/` and update `src/config/sprites.js` with their keys.
