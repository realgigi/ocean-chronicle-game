# 08 Codex Task Prompts

Use these prompts one at a time. Do not ask Codex to build the full final game in one step.

## Task 1 — Initialize project

```text
Read AGENTS.md and all files in docs/.
Initialize a Vite + React + TypeScript project for 《海洋戰紀：異變追跡》.
Create a mobile-first 9:16 layout.
Keep the format as a 雷電 / Raiden-style vertical mobile shooter.
Add npm scripts for dev, build, and preview.
Do not add a backend.
Run npm run build and fix any errors.
```

## Task 2 — Add data model

```text
Create data files under src/data/ for characters, episodes, assets, and stages.
Use the story and character canon from docs/.
Stages should define fixed story rosters. Do not create free character selection for story stages.
Include at least these entries:
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
Keep display names in Traditional Chinese.
Add stage/team fields that can support:
- roster: fixed character ids for that stage
- activeCharacterId
- teamSkillLevel LV1-LV5
- sharedSpecialMeter
```

## Task 3 — Title screen and navigation

```text
Build the title screen for 《海洋戰紀：異變追跡》.
Add navigation buttons:
- 開始遊戲
- 劇情地圖
- 角色圖鑑
- 設定集
Use assets from public/assets/posters if present.
Make it responsive and mobile-first.
```

## Task 4 — Episode map

```text
Build an episode map screen with nodes:
- 冰晶王城
- 珊瑚老街
- 北境邊防
- 暗流區
- 冰原方向
- 海潮部落
- 深淵高塔
Only 北境邊防 should start playable.
Other nodes should show story preview cards or coming-soon state.
```

## Task 5 — Character gallery

```text
Build a character gallery screen.
Use data from src/data/characters.ts.
Add filters for:
- 英雄
- 反派
- 怪物
- 遠古神像
Cards should show name, role, current story status, and image if available.
```

## Task 6 — Combat prototype with placeholders

```text
Create the first playable vertical shooter combat stage using simple shapes first.
Stage: 北境戰場
Player: 雙帶武士
Roster: 雙帶武士 only
Boss: 巨大垃圾海葵・紫色觸手模式
Implement:
- player HP
- boss HP
- drag or move within a 9:16 vertical shooter field
- automatic basic attack
- auto-aim targeting for basic attacks
- dodge
- shared special meter
- team skill level placeholder, LV1-LV5
- upgrade pickup placeholder for 海光能量
- boss tentacle sweep
- boss toxic pulse
- victory state
- defeat state
Keep it simple and playable.
Run npm run build and fix errors.
```

## Task 6C — Auto-attack and auto-aim tuning

```text
Replace manual normal attack with automatic attacks.
The player should not need to hold or repeatedly tap a normal attack button.
Basic attacks should auto-aim at valid enemies.
Target priority:
1. exposed boss core
2. closest dangerous enemy
3. closest enemy in front of the player
4. boss body
Keep manual input for movement, dodge, character switching, and shared special.
Add simple tunable values for fire rate, projectile speed, tracking strength, and damage.
```

## Task 6E — Upgrade energy pickups

```text
Add 海光能量 upgrade pickups.
Rules:
- Enemies can drop upgrade energy.
- Collecting energy fills a shared team upgrade meter.
- Team skill level increases from LV1 to LV5 at defined thresholds.
- Switching characters does not reset team skill level.
- On player death/respawn, eject about half of the carried upgrade energy as recoverable pickups.
- Ejected pickups drift briefly and can be collected again.
Use placeholder glowing orbs first; real art can be added later.
```

## Task 6D — Freeze-frame special cut-ins

```text
Add a freeze-frame cut-in system for player specials and Boss signature attacks.
When the player uses shared special:
- pause gameplay briefly
- show active character special cut-in art or fallback panel
- show skill name and LV
- resume gameplay and apply the special effect

When the Boss uses a signature attack or phase transition:
- pause gameplay briefly
- show Boss cut-in art or fallback warning panel
- resume gameplay
- execute the telegraphed attack with readable warning zones

Use static images only; no animation is required for the MVP.
```

## Task 6B — Fixed roster switching foundation

```text
Add a fixed story roster system for combat stages.
Do not add free character selection.
Support stages with 1, 2, or 3 playable story characters.
Add active character switching for multi-character stages.
Switching should change moveset data but preserve shared team skill level and shared special meter.
For the MVP stage, roster contains only 雙帶武士, so the switch UI can be hidden or disabled.
```

## Task 6A — Episode video lead-in

```text
Add a story video / cutscene screen before the first combat stage.
Use a video segment, not necessarily the full episode video.
For MVP, use:
- source video: /assets/videos/05-afterglow-rally.mp4
- segment label: 雙帶小丑的北境守護
- startTimeSec/endTimeSec: keep configurable and use placeholder values until marked
If no video segment timing is available yet, allow manual skip/continue.
Flow: episode map -> video/cutscene -> vertical shooter stage -> victory card.
Keep the whole flow in the 9:16 mobile layout.
Preserve the video segment audio as the first-pass lead-in music.
Start audio only after a user interaction to avoid mobile browser autoplay blocks.
```

## Task 6A-2 — Music continuity

```text
Add audio handling for video-to-stage continuity.
For the MVP, use the embedded audio from /assets/videos/05-afterglow-rally.mp4 during the lead-in.
After the lead-in, fade into gameplay.
If no extracted loop exists yet, fade out the video audio cleanly and use a temporary ambient/silent state.
Keep hooks for a future BGM file:
/assets/audio/north-battlefield-main-loop.mp3
Do not add third-party music.
```

## Task 7 — Use actual assets

```text
Replace placeholder shapes in the combat stage with assets from public/assets/.
If an expected asset is missing, show a labeled fallback card and do not crash.
Keep hitboxes simple rectangles or circles.
```

## Task 8 — Boss phases

```text
Improve 巨大垃圾海葵 boss behavior.
Add three phases:
- Phase 1: tentacle sweep
- Phase 2: toxic pulse + small anemone spawn
- Phase 3: exposed core and faster attacks
Add clear visual telegraphs before each boss attack.
```

## Task 9 — Victory unlock

```text
After defeating 巨大垃圾海葵, show a victory story card:
Title: 食人鯊戰神石像
Text: 雙帶武士斬開巨葵核心後，通往古老石像的道路終於露出。戰場恢復短暫清明，但真正的突破，才剛開始。
Add a button to return to the episode map.
Mark the 北境邊防 stage as cleared in local state.
```

## Task 10 — Android APK playtest build

```text
Use Capacitor as the primary playtest packaging path.
Build optimized mobile web assets first.
Use dist-pwa as the Capacitor webDir.
Exclude story videos from APK builds unless explicitly requested.
Prefer public/assets/mobile/ optimized WebP assets for APK builds.
Produce a debug APK for direct phone installation.
Keep PWA / browser preview available as a secondary rapid-test path.
Do not introduce a backend.
Run npm run android:apk and verify the APK output path.
```

## Review prompt

```text
Review the current implementation against AGENTS.md and docs/04_GAME_MVP_SPEC.md.
List what is complete, what is missing, and the highest-impact next three tasks.
Do not rewrite the whole project unless necessary.
```
