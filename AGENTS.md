# AGENTS.md — Ocean Chronicle Game Project Instructions

## Project identity
This repository is for a browser game prototype based on the original fantasy underwater series **《海洋戰紀》**.

Primary working title for the MVP:

> **海洋戰紀：異變追跡**

The game should translate the existing story, character designs, posters, maps, and short-film episodes into a playable mobile game.

## Technical direction
Use a simple, maintainable web stack for the first prototype:

- Vite
- React
- TypeScript
- Mobile-first layout, optimized for 9:16 vertical play
- Formal gameplay direction: vertical mobile shooter inspired by 雷電 / Raiden-style vertical scrolling shooters
- Primary playtest delivery target: Android APK, built with Capacitor as a standalone offline-style mobile game
- Secondary delivery target: PWA / web preview for rapid testing
- No backend unless explicitly requested
- No paid external APIs
- Use files under `public/assets/` for images, videos, icons, and UI references
- For APK/PWA packages, prefer optimized assets under `public/assets/mobile/` and avoid bundling unused source-resolution images or videos.
- Story videos may remain in the repo for later chapters, but do not bundle them into APK playtest builds until explicitly requested.

## Product goal
Build a playable MVP first, not a complete RPG.

The full game should follow the film episodes:

1. Play a vertical story video segment.
2. Transition into the related vertical shooter stage.
3. Resolve the stage with a story card, unlock, or next video hook.

Audio direction:

- Use the main music from the provided story videos as the first source for chapter BGM.
- When a stage is led by a video segment, preserve musical continuity into the stage when possible.
- Mobile browsers often require a user tap before audio playback; start video/audio only after an explicit player action such as 開始遊戲.
- Do not add unlicensed third-party music. If a track from the videos is not owned or cleared for game/web use, mark it as pending rights confirmation.

Characters are story-locked per episode. Do not build a free character-select system for story stages unless explicitly requested. Some stages may have a fixed team of 2 or 3 characters; the player can switch only among the story-present team members.

Shared team state:

- Skill level is shared by the current stage team, such as LV1 to LV5.
- Special / ultimate meter is shared by the team.
- Switching characters changes the active moveset, attack pattern, dodge feel, and special animation, but does not reset skill level or ultimate charge.
- Skill level is raised by collectible stage energy, currently called 海光能量.
- On player death, drop roughly half of the carried upgrade energy into the field so the player can recover it if the stage continues or after respawn.

Mobile combat should minimize buttons:

- Basic attacks are automatic.
- Basic attacks should auto-aim at valid enemies when possible.
- Player focus is movement, bullet dodging, character switching, and choosing when to use the shared ultimate / special.
- Do not require the player to hold or repeatedly tap a normal attack button.

The MVP should include:

1. Title screen
2. Episode / world map screen
3. Character gallery
4. First playable combat stage: **雙帶武士 vs 巨大垃圾海葵・紫色觸手模式**
5. Victory unlock: **食人鯊石像劇情卡**

## Core gameplay loop for first prototype

1. Player controls **雙帶武士**.
2. The boss is **巨大垃圾海葵・紫色觸手模式**.
3. Player moves in a vertical shooter field and dodges enemy patterns while the active character auto-attacks and auto-aims.
4. Boss uses tentacle sweep, toxic pulse, and small-anemone spawn.
5. Player wins by breaking the boss core.
6. On victory, show story card leading to **食人鯊石像**.

## Visual style
Keep the game visually consistent with the existing generated assets:

- Q版 3D 日式動畫風
- Deep-sea fantasy
- Blue / purple / gold high contrast
- Cute proportions but cinematic lighting
- Heroes are chibi but serious and heroic
- Villains are ornate, eerie, and theatrical
- UI should feel like a fantasy underwater map / animated storybook / game menu

## Canon protection rules
Do not casually rename or redesign established characters.

Important heroes:

- 雙帶武士
- 雪印法師
- 銀背突擊兵
- 黑豹忍者
- 透紅浪人
- 公子王子
- 粉紅舞孃
- 紅藝伎
- 熊貓相撲
- 鸚哥勇士
- 蘇眉勇士

Important villains / antagonistic forces:

- 鯙鰻軍師
- 六齒魨工程師
- 獅子魚武士
- 垃圾海葵群
- 巨大垃圾海葵
- 病毒紫海膽
- 水母邪神

Ancient / divine / statue lines:

- 食人鯊戰神石像
- 鯨鯊輪迴使 / 鯨鯊水晶像
- 阿髻鮫陰陽師 / 阿髻鮫木雕

## Story-canon constraints
Current story stage for the MVP:

- 王女已冰封。
- 外圍世界一開始不知道王城危機。
- 《殘光集結》後，角色開始分流。
- 《異變蔓延》讓垃圾海葵正式進入日常世界。
- 《異變追跡》讓各支線開始追查、尋找啟示、尋求突破。
- 神諭尚未完全顯現；目前只是神像、神廟、冰原方向與遠古力量的前置。
- 深淵兵器在片尾開始量產，正式完整篇章可留給下一章《深淵兵器》。 

## Engineering guidelines
- Keep code modular.
- Keep game state simple for the MVP.
- Prefer data-driven definitions for characters, episodes, enemies, and levels.
- Store game content in TypeScript data files or JSON under `src/data/`.
- Avoid hardcoding long story text inside components.
- Run `npm run build` after implementation and fix errors.
- Add comments only where they clarify game logic.

## Do not
- Do not turn the first prototype into a large MMO/RPG.
- Do not introduce unrelated characters.
- Do not replace the established art direction with generic pixel art unless requested.
- Do not remove Chinese titles; the primary language is Traditional Chinese.
- Do not reveal full神諭 too early in the story.
- Do not make 紫海膽 fully mature too early unless the stage is explicitly a later chapter.
