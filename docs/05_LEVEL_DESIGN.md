# 05 Level Design — MVP and Future Stages

## MVP stage

# Stage 1 — 北境戰場：巨大垃圾海葵

## Narrative setup
After the first waves of garbage anemone mutation spread across the sea, the northern battlefield becomes covered in corrupted growth. 雙帶武士 enters the battlefield to clear the contamination.

He cuts through many small garbage anemones, but their remains are pulled together by black-tide energy and fuse into a giant purple-tentacle boss.

Defeating the boss opens the road to the ancient 食人鯊戰神石像.

## Stage flow

### Phase 0 — Episode video
Purpose:

- Let the chapter follow the same rhythm as the existing vertical videos.
- Use the video as the story lead-in before the playable segment.

Flow:

- Play the selected episode video segment or a temporary still/cutscene version.
- At the end, show a short transition into gameplay.
- Keep all video, UI, and gameplay in the same 9:16 vertical phone layout.

MVP lead-in:

- Source: 《殘光集結》
- File: `/assets/videos/05-afterglow-rally.mp4`
- Segment label: 雙帶小丑的北境守護
- Start time: 待標記
- End time: 待標記
- Audio: keep the segment's main music active during the lead-in
- Transition: fade / button from video segment into 北境戰場 gameplay.

Music transition:

- The gameplay stage should use the same main music identity as the lead-in whenever possible.
- If a looped gameplay BGM has not been extracted yet, fade out the video audio and use temporary ambient ocean sound or silence.
- Avoid abrupt music cuts between video and gameplay.

### Phase A — Battlefield clearing
Purpose:

- Teach movement, auto-attack behavior, and dodging.
- Spawn small garbage anemones.
- Player clears them.

Gameplay:

- Vertical scrolling shooter format.
- 雙帶武士 stays near the lower third of the screen.
- Small garbage anemones enter from upper lanes and side currents.
- 雙帶武士 auto-attacks and auto-aims; player focuses on dodging and positioning.
- 5–8 small enemies appear in waves.
- Some enemies crawl slowly.
- Some release small toxic spots.
- Some enemies drop 海光能量 pickups that raise shared team skill level from LV1 to LV5.

Story beat:

> 雙帶武士在北境戰場橫掃大量垃圾海葵。

### Phase B — Fusion cutscene
Purpose:

- Transition from normal enemies to boss.

Visual:

- Defeated anemone fragments tremble.
- Purple-black current pulls them together.
- Giant Garbage Anemone forms.

Story beat:

> 殘骸沒有消失，反而被黑潮聚合成超大型海葵。

### Phase C — Boss battle
Purpose:

- Main gameplay challenge.

Boss phases:

#### Phase 1: Tentacle sweep
- Simple lane sweeps across the vertical playfield.
- Slow but large range.

#### Phase 2: Toxic pulse + spawn
- Adds area hazards.
- Spawns small anemones.

#### Phase 3: Exposed core
- Boss becomes aggressive.
- Player must dodge and time the shared special when the core is exposed.
- Player special triggers a freeze-frame cut-in before the finishing attack.
- Boss signature attacks can trigger a freeze-frame warning cut-in before execution.

Story beat:

> 雙帶武士以沉穩刀法斬開污染核心。

Special presentation:

- 雙帶武士 cut-in: static heroic art, gold slash energy, skill name 破芯金斬.
- 巨大垃圾海葵 cut-in: static boss art, purple core glow, warning title before 毒潮聚核 or 紫觸橫掃.
- Gameplay freezes during the cut-in, then resumes into the attack result.

### Phase D — Victory / unlock
Purpose:

- Reward player.
- Open next story hook.

Visual:

- Boss cracks and dissolves.
- Purple haze clears.
- A path opens toward a distant stone statue silhouette.

Unlock card:

> 食人鯊戰神石像

## Level art direction

Setting:

- Northern border battlefield
- Broken coral stone walls
- Cold blue water
- Purple pollution cracks
- Trash-anemone clusters
- Ancient path hidden behind corrupted growth

Lighting:

- Cold blue ambient light
- Gold slash effects from雙帶武士
- Purple glow from boss and corruption

Camera / screen feel:

- Mobile 9:16 vertical
- 雷電 / Raiden-like vertical shooter composition
- Player near lower third
- Boss occupying upper/middle screen
- Enemy waves enter from top lanes, side currents, or scrolling background paths
- UI minimal but readable

## UI for combat

Top:

- Boss HP bar
- Stage title

Bottom:

- Player HP
- Team LV and upgrade energy meter
- Special charge
- Mobile buttons

Pickups:

- 海光能量 should glow strongly and remain readable over busy backgrounds.
- On death / respawn tests, about half of current upgrade energy should burst outward as recoverable pickups.

Suggested mobile controls:

```text
[Drag / Move]       [Switch portraits if roster > 1]
[Dodge]             [Shared Special]
```

## Future level ideas

### Stage 2 — 暗流區：神廟入口
Playable characters:

- 黑豹忍者
- 透紅浪人

Mechanics:

- Fixed story team with in-stage character switching
- Shared skill level and shared special meter
- Stealth movement
- Counter timing
- Removing anemone growth from water channels
- Discovering temple seal

Story beat:

> 清除海葵後，兩人進入神廟尋找異變的起始。

### Stage 3 — 冰原途中：冰晶回聲
Playable characters:

- 雪印法師
- 銀背突擊兵

Mechanics:

- Fixed story team with in-stage character switching
- Shared skill level and shared special meter
- Ice shield
- Ranged cover fire
- Protect caster while analyzing frozen corruption

Story beat:

> 冰晶的回聲指向遠方，雪印與銀背前往冰原尋找鯨鯊神諭。

### Stage 4 — 海潮部落：王子救援
Playable characters:

- 鸚哥勇士
- later 公子王子 support

Mechanics:

- Fixed story team with possible support/switch mechanics
- Shared skill level and shared special meter
- Rescue objective
- Spear charge
- Escort wounded prince

Story beat:

> 公子小丑被敵人包圍，鸚哥勇士衝入救援。

### Stage 5 — 深淵高塔：兵器量產線
Playable characters:

- TBD

Enemies:

- 垃圾海葵群
- 病毒紫海膽
- 六齒魨工程師 devices

Mechanics:

- Disable production nodes
- Avoid toxic pulses
- Break black-tide converter

Story beat:

> 黑潮被做成兵器，深淵產線正式啟動。
