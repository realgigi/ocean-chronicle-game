# 00 Project Brief — 《海洋戰紀》Web Game

## Project title
**海洋戰紀：異變追跡**

## One-line concept
A mobile-first chibi 3D fantasy underwater action-adventure game where ocean heroes investigate spreading mutations and fight the first major boss: **巨大垃圾海葵・紫色觸手模式**.

## Target platform
- Browser game
- Mobile-first vertical 9:16 layout
- Formal game format: vertical mobile shooter, closer to 雷電 / Raiden-style vertical scrolling shooting than horizontal shooting
- Chapter flow: vertical episode video first, then the related playable stage
- Primary playtest format: standalone Android APK
- Secondary preview format: PWA / browser build
- Web implementation remains the core engine, wrapped into APK with Capacitor for mobile playtests
- First version should be simple, fast, and playable

## Intended feeling
The game should feel like a playable animated storybook / cinematic stage selector based on the existing short-film universe.

Tone:

- Cute but serious
- Underwater fantasy
- Cinematic and mysterious
- Adventure with ecological corruption themes
- Heroes seeking ancient clues while villains industrialize black-tide bioweapons

## Core player fantasy
The player controls heroic ocean characters and defends the sea world from spreading mutations.

For MVP, the player fantasy is:

> Become **雙帶武士**, clear the battlefield, defeat the giant mutated garbage anemone, and open the path toward the ancient shark-war-god statue.

## Character control model

Story stages use fixed episode rosters instead of free character selection.

- Each playable stage follows the characters who appear in that video / story event.
- Some stages have one playable character.
- Some stages have two or three story-present characters and allow in-stage switching.
- Switching characters changes the active moveset and attack style.
- Skill level is shared by the current stage team, such as LV1 to LV5.
- Ultimate / special meter is shared by the current stage team.
- Character gallery is for browsing canon and art, not choosing arbitrary characters for story stages.

## MVP scope
The first build should **not** attempt to include all characters or all story arcs as full playable stages.

MVP screens:

1. Title screen
2. Episode map screen
3. Episode video / cutscene screen
4. Character gallery screen
5. Vertical shooter stage: 雙帶武士 vs 巨大垃圾海葵
6. Story card after victory: 食人鯊石像

## Narrative-to-game flow

正式版建議採用固定節奏：

1. 先播放對應影片片段。
2. 影片段落結束後，進入同一事件的直式射擊關卡。
3. 通關後顯示劇情卡、解鎖圖鑑或接下一段影片。

This keeps the existing vertical video material and the gameplay in one phone-native format.

## Primary chapter for MVP
**異變追跡**

Reason:

- It connects existing episodes.
- It has clear hero action.
- It has investigation and combat.
- It contains a natural first boss: 巨大垃圾海葵.
- It can later branch into 神廟、冰原、深淵兵器、部落救援.

## High-level story premise
After the **冰晶王女** incident, the outside world has not fully understood the crisis. The earlier chapter **殘光集結** showed that different heroes remained in daily life or separate duties while only a few characters carried the王城 crisis outward.

In **異變蔓延**, garbage anemones began invading daily spaces such as the coral old street.

In **異變追跡**, heroes start actively tracing the source of mutation:

- 忍者與浪人 clear anomalies and move toward the temple.
- 雪印法師與銀背突擊兵 decide to seek revelation in the ice region.
- 雙帶武士 clears a battlefield, defeats a giant anemone, then heads toward 食人鯊石像.
- The ending hints at 深淵兵器 mass production.
- 公子王子 is later surrounded and saved by 鸚哥勇士, opening the tribe line.

## Core development principle
Build a small working game first. The story universe is large, but the first prototype should prove:

- navigation works
- assets load correctly
- mobile UI feels good
- combat loop is playable
- story cards can unlock after combat

## Recommended first playable stage
**Stage 1: 北境戰場 — 雙帶武士 vs 巨大垃圾海葵**

Why this stage:

- Strong visual identity
- Clear hero-vs-boss conflict
- Simple action mechanics
- Natural story unlock to 食人鯊石像
- Supports future expansion into ancient power / martial breakthrough line
