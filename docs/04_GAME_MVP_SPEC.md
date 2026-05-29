# 04 Game MVP Spec — 《海洋戰紀：異變追跡》

## MVP target
Create a playable browser prototype that proves the core game idea:

> A story-driven vertical mobile shooter based on the current Ocean Chronicle narrative.

The full game should follow the existing videos. A normal chapter can play a vertical story video first, then transition directly into the playable stage for that same story event.

For stage lead-ins, use relevant video segments rather than always playing an entire episode video. The MVP first stage should use the 《殘光集結》 segment showing 雙帶武士 / northern border guarding as the story lead-in for 北境戰場.

The first BGM source should be the main music already used in the provided videos. For the MVP, keep the video segment's audio active during the lead-in, then either continue with an extracted / looped version of the same theme or fade into a gameplay loop derived from that music.

Combat should feel closer to a vertical scrolling shooter such as 雷電 / Raiden than to a side-scrolling shooter. Keep the whole experience in a 9:16 phone interface.

## Screen list

### 1. Title screen
Elements:

- Background poster or animated ocean backdrop
- Main title: 海洋戰紀
- Subtitle: 異變追跡
- Buttons:
  - 開始遊戲
  - 劇情地圖
  - 角色圖鑑
  - 圖像素材 / 設定集

### 2. Episode map screen
Purpose:

- Show major story regions as selectable nodes.
- Not all nodes need to be playable.

Nodes:

- 冰晶王城
- 珊瑚老街
- 北境邊防
- 暗流區
- 冰原方向
- 海潮部落
- 深淵高塔

MVP state:

- 北境邊防 is playable.
- Other nodes show story cards or “coming soon”.

### 3. Character gallery
Purpose:

- Display character art, role, current story status.
- This is a reference/gallery screen, not a free character-select screen for story stages.

MVP minimum characters:

- 雙帶武士
- 黑豹忍者
- 透紅浪人
- 雪印法師
- 銀背突擊兵
- 公子王子
- 粉紅舞孃
- 鯙鰻軍師
- 六齒魨工程師
- 巨大垃圾海葵
- 病毒紫海膽

Gallery data fields:

```ts
interface CharacterEntry {
  id: string;
  name: string;
  faction: 'hero' | 'villain' | 'ancient' | 'monster';
  role: string;
  shortDescription: string;
  assetPath?: string;
  status: string;
}
```

### 4. Combat stage
Playable stage:

> 北境戰場：雙帶武士 vs 巨大垃圾海葵・紫色觸手模式

Video lead-in:

- Source video: 《殘光集結》
- File: `/assets/videos/05-afterglow-rally.mp4`
- Segment: 雙帶小丑的北境守護
- Exact start/end time: 待標記
- Audio: use the segment's original music as the first-pass lead-in BGM
- After the segment ends, transition into the vertical shooter stage.

Gameplay BGM:

- Preferred: loop a clean extracted segment of the same main music.
- Fallback: continue muted / low-volume ambience until a loop is prepared.
- Mobile note: audio must start after user interaction to satisfy browser autoplay restrictions.

Core mechanics:

- Player moves in a 9:16 vertical shooter field.
- The active character or team is defined by the story episode.
- No free character selection before story stages.
- If a stage has 2 or 3 story-present characters, the player can switch between those fixed team members during play.
- Basic attacks are automatic.
- Basic attacks should auto-aim at valid enemies when possible.
- The player does not hold or repeatedly tap a normal attack button.
- Player skill is focused on movement, dodging enemy bullets, positioning, character switching, and timing the shared ultimate.
- Player can dash/dodge.
- Player can manually trigger a shared special / ultimate attack when meter is ready.
- Shared special / ultimate attacks use a freeze-frame cut-in before the effect resolves.
- Boss major attacks can also use freeze-frame cut-ins for cinematic warning moments.
- Enemies and hazards enter from upper screen, side currents, or scrolling background lanes.
- Boss has HP bar.
- Player has HP bar.
- Boss has attack telegraphs.
- Victory unlocks story card.

## Story-locked team system

Each stage defines its playable team from the video / story context.

Examples:

- 北境戰場: 雙帶武士 only.
- 暗流神廟: 黑豹忍者 + 透紅浪人.
- 冰原途中: 雪印法師 + 銀背突擊兵.
- 海潮部落: 鸚哥勇士, with 公子王子 as support or later switchable character.

Rules:

- Players do not choose arbitrary characters for a story stage.
- Character switching is only available when the current story scene contains multiple playable characters.
- Switching changes moveset, attack style, dodge feel, and special animation.
- Shared skill state belongs to the stage team, not the individual character.
- Team skill level can be represented as LV1, LV2, LV3, LV4, LV5.
- Team skill level is raised by collecting 海光能量 during the stage.
- Ultimate / special meter is shared by the team.
- Switching characters must not reset skill level, cooldown progression, story flags, or ultimate charge.

Suggested controls:

For mobile:

- Drag movement or virtual joystick
- Dodge button
- Shared ultimate / special button
- Character switch portrait buttons when the stage team has more than one character

For keyboard:

- A/D or Arrow keys: move
- K: dodge
- L: special
- Q/E or 1/2/3: switch active character when available

### 5. Victory card
After defeating boss:

- Show title: 食人鯊戰神石像
- Text: 雙帶武士斬開巨葵核心後，通往古老石像的道路終於露出。戰場恢復短暫清明，但真正的突破，才剛開始。
- Button: 返回地圖

## MVP combat details

### Player: 雙帶武士
Stats:

```ts
hp: 100
moveSpeed: medium
autoAttackDamage: 10
autoAttackIntervalMs: 450
specialDamage: 35
invulnerabilityAfterHitMs: 800
```

Abilities:

#### Auto Slash Wave
- Fires automatically at a fixed interval.
- Auto-aims at the nearest or highest-priority valid enemy.
- Uses a short arc, projectile slash wave, or guided slash depending on character.
- Damages boss and small anemones.
- Scales with shared team skill level.

#### Dodge Step
- Short invulnerability window
- Reposition

#### Golden Arc Special
- Requires shared special meter.
- Triggers a freeze-frame character cut-in before damage resolves.
- Long upward slash wave
- Damages boss core heavily

## Freeze-frame cut-in system

When a major special move starts, the gameplay moment briefly pauses and shows a static illustrated cut-in. This provides the feeling of a powerful move without requiring full animation.

Player special flow:

1. Player presses shared special / ultimate button.
2. Gameplay freezes for a short moment.
3. Show active character special art, skill name, LV, and energy effect.
4. Resume gameplay and apply the attack effect.

Boss special flow:

1. Boss reaches a major attack timing or phase transition.
2. Gameplay freezes briefly.
3. Show Boss cut-in art and attack warning.
4. Resume gameplay and execute the telegraphed attack.

Implementation notes:

- Cut-ins are static images, not required to be animated.
- Duration should be short, around 500-900 ms for player specials and 700-1200 ms for Boss warnings.
- During cut-in, enemy bullets and player movement are paused.
- UI may dim behind the cut-in.
- Input should be buffered or ignored until the cut-in ends.
- Boss cut-ins must communicate danger, not feel like an unavoidable cheap hit.

Required MVP cut-in assets:

- 雙帶武士 special cut-in: 破芯金斬
- 巨大垃圾海葵 Boss cut-in: 毒潮聚核 or 紫觸橫掃

## Auto-aim rules

Basic attacks should automatically select a target so the player can focus on dodging.

Suggested priority:

1. Exposed boss core
2. Closest dangerous enemy
3. Closest enemy in front of the player
4. Boss body

If no target exists, attacks fire forward/upward. Auto-aim should feel helpful but not remove positioning; characters can still have different ranges, spread, tracking strength, and fire rates.

## Upgrade energy system

The stage team has a shared upgrade level from LV1 to LV5. The current working pickup is called **海光能量**.

Pickup fantasy:

- Small glowing ocean-light orbs, fragments, pearls, scroll-like seals, or luminous plankton clusters.
- For the first prototype, use glowing energy orbs because they are readable on a phone screen and fit the underwater setting.

Core rules:

- Defeated enemies can drop 海光能量.
- Collecting energy fills a shared upgrade meter.
- When the meter crosses a threshold, teamSkillLevel increases up to LV5.
- Team skill level affects the active character's auto-attack pattern, damage, fire rate, or projectile count.
- The upgrade level is shared by the current story team.
- Switching characters does not change or reset the upgrade level.

Suggested thresholds:

```ts
LV1: 0
LV2: 10
LV3: 25
LV4: 45
LV5: 70
```

Death recovery rule:

- On player death, about half of the carried upgrade energy is ejected into the field as recoverable pickups.
- The ejected pickups should drift briefly, then slowly pull toward the player if they get close.
- This creates a chance to recover power after a mistake without removing the penalty.
- If the stage uses a hard game-over instead of respawn, the rule can be saved for later checkpoint / continue design.

### Team state

For MVP Stage 1, the team contains only 雙帶武士, but implement data in a way that can later support fixed teams.

```ts
teamSkillLevel: 1 | 2 | 3 | 4 | 5
teamUpgradeEnergy: number
sharedSpecialMeter: 0..100
activeCharacterId: 'double-band-samurai'
stageRoster: ['double-band-samurai']
```

### Boss: 巨大垃圾海葵・紫色觸手模式
Stats:

```ts
hp: 300
phase1Threshold: 300
phase2Threshold: 180
phase3Threshold: 80
```

Attack patterns:

#### Tentacle Sweep
- Telegraph: purple glow on side
- Action: wide lane sweep across the vertical playfield
- Counterplay: dodge or move away

#### Toxic Pulse
- Telegraph: boss core glows
- Action: circular area damage
- Counterplay: back away

#### Small Anemone Spawn
- Boss spawns small garbage anemones.
- Small enemies slow player or deal contact damage.

#### Core Expose
- At intervals, boss exposes glowing core.
- Player special does extra damage during this window.

#### Boss Cut-in Warning
- Used for major phase changes or signature attacks.
- Freezes gameplay briefly and shows a static Boss special art card.
- After the cut-in, the attack still needs readable telegraph lanes or warning zones.

## Win / lose
Win:

- Boss HP reaches zero.

Lose:

- Player HP reaches zero.

MVP death behavior:

- If testing with respawn, drop half of current teamUpgradeEnergy as recoverable 海光能量.
- If testing without respawn, show defeat state and record that the recovery behavior is not yet active.

## MVP technical requirements

Suggested source structure:

```text
src/
  App.tsx
  main.tsx
  styles/
  data/
    characters.ts
    episodes.ts
    assets.ts
  components/
    TitleScreen.tsx
    EpisodeMap.tsx
    CharacterGallery.tsx
    StoryCard.tsx
  game/
    CombatStage.tsx
    player.ts
    boss.ts
    collisions.ts
    controls.ts
    gameTypes.ts
```

## First implementation priority
Codex should implement in this order:

1. Project setup
2. Data files
3. Title screen
4. Episode map
5. Story video / cutscene screen using a placeholder state if no MP4 is available
6. Character gallery
7. Vertical shooter stage with placeholder shapes
8. Replace placeholder shapes with assets
9. Add boss phases
10. Add victory card
11. Build and fix errors
