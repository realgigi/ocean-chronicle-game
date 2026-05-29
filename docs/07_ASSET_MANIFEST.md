# 07 Asset Manifest — Suggested File Organization

This manifest describes recommended asset placement. File names are suggestions. Rename actual files consistently and update data files accordingly.

## Folder structure

```text
public/assets/
  characters/
    heroes/
    villains/
    ancient_gods/
  cutins/
    heroes/
    bosses/
  pickups/
  monsters/
  posters/
  maps/
  videos/
  audio/
  ui/
```

## Required MVP assets

### Player character

```text
public/assets/characters/heroes/double-band-samurai.png
```

Represents:

- 雙帶武士
- Black-gold armor
- Yellow fish body
- Sword

Current imported file:

```text
public/assets/characters/heroes/double-band-samurai.jpg
```

### Boss

```text
public/assets/monsters/giant-garbage-anemone-purple.png
```

Represents:

- 巨大垃圾海葵・紫色觸手模式
- Boss concept image / sprite reference

Current note:

- This is temporarily copied from `垃圾海葵群.png` until dedicated giant boss art is provided.

### Basic enemy

```text
public/assets/monsters/garbage-anemone-small.png
```

Represents:

- 垃圾海葵群
- Smaller enemy / environmental growth

Current note:

- This is temporarily copied from `垃圾海葵群.png`; replace with a smaller enemy crop or separate illustration later.

### Poster / title background

```text
public/assets/posters/ocean-chronicle-mutation-tracking.png
```

Represents:

- 海洋戰紀：異變追跡

### Victory card / ancient statue placeholder

```text
public/assets/characters/ancient_gods/shark-war-god-statue.png
```

Represents:

- 食人鯊戰神石像

If no statue art is available yet, use a silhouette placeholder and label it as locked / coming soon.

Current imported file:

```text
public/assets/characters/ancient_gods/shark-war-god-statue.png
```

## Recommended character assets

```text
public/assets/characters/heroes/black-panther-ninja.png
public/assets/characters/heroes/red-ronin.png
public/assets/characters/heroes/snow-seal-mage.png
public/assets/characters/heroes/silverback-assault.png
public/assets/characters/heroes/prince-clownfish.png
public/assets/characters/heroes/pink-dancer.png
public/assets/characters/heroes/red-geisha.png
public/assets/characters/heroes/panda-sumo.png
public/assets/characters/heroes/parrotfish-warrior.png
public/assets/characters/heroes/napoleon-wrasse-warrior.png
```

Current imported hero assets:

| Display name | Source file | Game asset path | Notes |
| --- | --- | --- | --- |
| 雙帶武士 | 雙帶武士.jpg | public/assets/characters/heroes/double-band-samurai.jpg | MVP player |
| 黑豹忍者 | 黑豹忍者.jpg | public/assets/characters/heroes/black-panther-ninja.jpg |  |
| 透紅浪人 | 透紅浪人.jpg | public/assets/characters/heroes/red-ronin.jpg |  |
| 雪印法師 | 雪印法師.jpg | public/assets/characters/heroes/snow-seal-mage.jpg |  |
| 銀背突擊兵 | 銀背突擊兵.jpg | public/assets/characters/heroes/silverback-assault.jpg |  |
| 公子王子 | 公子王子.jpg | public/assets/characters/heroes/prince-clownfish.jpg |  |
| 粉紅舞孃 | 粉紅舞孃.jpg | public/assets/characters/heroes/pink-dancer.jpg |  |
| 紅藝伎 | 紅藝伎.png | public/assets/characters/heroes/red-geisha.png |  |
| 熊貓相撲 | 熊貓相撲.jpg | public/assets/characters/heroes/panda-sumo.jpg |  |
| 鸚哥勇士 | 鸚哥勇士.jpg | public/assets/characters/heroes/parrotfish-warrior.jpg | Canon name confirmed |
| 蘇眉勇士 | 蘇眉勇士.png | public/assets/characters/heroes/napoleon-wrasse-warrior.png |  |
| 緞帶王女 | 緞帶王女.jpg | public/assets/characters/heroes/ribbon-princess.jpg | Added from imported assets |
| 石鯛鐵匠 | 石鯛鐵匠.png | public/assets/characters/heroes/striped-beakfish-blacksmith.png | Added from imported assets |
| 龍虎斑帝王 | 龍虎斑帝王.png | public/assets/characters/heroes/tiger-grouper-emperor.png | Added from imported assets |

## Recommended villain assets

```text
public/assets/characters/villains/moray-strategist.png
public/assets/characters/villains/puffer-engineer.png
public/assets/characters/villains/lionfish-warrior.png
```

Current imported villain assets:

| Display name | Source file | Game asset path | Notes |
| --- | --- | --- | --- |
| 鯙鰻軍師 | 鯙鰻軍師.png | public/assets/characters/villains/moray-strategist.png |  |
| 六齒魨工程師 | 河豚工程師.png | public/assets/characters/villains/puffer-engineer.png | Source filename uses 河豚工程師 |
| 六齒魨工程師・爆刺版 | 河豚工程師爆刺版.png | public/assets/characters/villains/puffer-engineer-spike-mode.png | Variant |
| 獅子魚武士 | 獅子魚武士.png | public/assets/characters/villains/lionfish-warrior.png |  |
| 燈籠魚使者 | 燈籠魚使者.jpg | public/assets/characters/villains/anglerfish-messenger.jpg | Added from imported assets |

## Recommended monster assets

```text
public/assets/monsters/garbage-anemone-group.png
public/assets/monsters/giant-garbage-anemone-turnaround.png
public/assets/monsters/giant-garbage-anemone-purple.png
public/assets/monsters/virus-purple-urchin.png
```

## Recommended cut-in assets

```text
public/assets/cutins/heroes/double-band-samurai-core-breaker.png
public/assets/cutins/bosses/giant-garbage-anemone-tentacle-sweep.png
public/assets/cutins/bosses/giant-garbage-anemone-toxic-core.png
```

Cut-in assets are static dramatic images used during short gameplay freezes before major player specials or Boss signature attacks.

Current generated cut-in assets:

| Usage | Game asset path | Notes |
| --- | --- | --- |
| 雙帶武士：破芯金斬 | public/assets/cutins/heroes/double-band-samurai-core-breaker-v01.png | First usable cut-in |
| 巨大垃圾海葵：紫觸橫掃 | public/assets/cutins/bosses/giant-garbage-anemone-tentacle-sweep-v01.png | First usable Boss warning cut-in |
| 巨大垃圾海葵：毒潮聚核 | public/assets/cutins/bosses/giant-garbage-anemone-toxic-core-v01.png | First usable Boss warning cut-in |

## Recommended pickup assets

```text
public/assets/pickups/ocean-light-energy.png
public/assets/pickups/ocean-light-energy-burst.png
```

These represent 海光能量, the shared team upgrade pickup used to raise LV1-LV5. Death / respawn can eject about half of the current energy as recoverable pickups.

Current generated pickup assets:

| Usage | Game asset path | Notes |
| --- | --- | --- |
| 海光能量 | public/assets/pickups/ocean-light-energy-v01.png | First usable pickup icon |

Current imported monster assets:

| Display name | Source file | Game asset path | Notes |
| --- | --- | --- | --- |
| 垃圾海葵群 | 垃圾海葵群.png | public/assets/monsters/garbage-anemone-group.png | Source asset |
| 垃圾海葵小型暫代 | 垃圾海葵群.png | public/assets/monsters/garbage-anemone-small.png | Temporary duplicate |
| 巨大垃圾海葵・紫色觸手模式暫代 | 垃圾海葵群.png | public/assets/monsters/giant-garbage-anemone-purple.png | Temporary duplicate |
| 巨大垃圾海葵動作表 v04 | generated from 垃圾海葵群.png direction | public/assets/generated/bosses/giant-garbage-anemone-action-sheet-v04-reference.png | Current preferred action sheet; white transparent cute-ugly style |
| 病毒紫海膽 | 病毒紫海膽.png | public/assets/monsters/virus-purple-urchin.png |  |
| 機甲烏賊 | 機甲烏賊.png | public/assets/monsters/mecha-squid.png |  |
| 機甲烏賊・地面版 | 機甲烏賊地面版.png | public/assets/monsters/mecha-squid-ground-mode.png | Variant |
| 機甲烏賊・攻擊版 | 機甲烏賊攻擊版.png | public/assets/monsters/mecha-squid-attack-mode.png | Variant |
| 機甲烏賊・飛行版 | 機甲烏賊飛行版.png | public/assets/monsters/mecha-squid-flight-mode.png | Variant |

## Current imported ancient / divine assets

| Display name | Source file | Game asset path | Notes |
| --- | --- | --- | --- |
| 食人鯊戰神石像 | 食人鯊戰神.png | public/assets/characters/ancient_gods/shark-war-god-statue.png | Victory unlock |
| 鯨鯊輪迴使 | 鯨鯊輪迴使.png | public/assets/characters/ancient_gods/whale-shark-reincarnation-envoy.png | Ice-region revelation line |
| 阿髻鮫陰陽師 | 阿髻鮫陰陽師.jpg | public/assets/characters/ancient_gods/hammerhead-onmyoji.jpg | Dark-current temple line |
| 水母邪神 | 水母邪神.png | public/assets/characters/ancient_gods/jellyfish-evil-god.png | Major divine antagonist |

## Recommended posters

```text
public/assets/posters/ocean-chronicle-ice-princess.png
public/assets/posters/ocean-chronicle-afterglow-rally.png
public/assets/posters/ocean-chronicle-mutation-spread.png
public/assets/posters/ocean-chronicle-mutation-tracking.png
public/assets/posters/ocean-chronicle-abyss-weapons.png
```

## Recommended maps

```text
public/assets/maps/world-map-afterglow-rally.png
public/assets/maps/episode-map-mutation-tracking.png
```

## Video assets

Video is part of the formal chapter flow: video / cutscene -> vertical shooter stage -> story card or next unlock.

MP4 files are ignored by Git because the imported videos are larger than normal GitHub file limits. Keep local copies under `public/assets/videos/`; use Git LFS, compression, or external hosting later if these need to be versioned.

```text
public/assets/videos/01-evil-god-descends.mp4
public/assets/videos/02-ice-crystal-princess.mp4
public/assets/videos/03-ancient-legend.mp4
public/assets/videos/04-parrotfish-warrior-rises.mp4
public/assets/videos/05-afterglow-rally.mp4
public/assets/videos/06-mutation-spread.mp4
```

Current imported video assets:

| Order | Display title | Source file | Game asset path |
| --- | --- | --- | --- |
| 1 | 邪神降臨 | 第一部_邪神降臨.mp4 | public/assets/videos/01-evil-god-descends.mp4 |
| 2 | 冰晶王女 | 第二部_冰晶王女.mp4 | public/assets/videos/02-ice-crystal-princess.mp4 |
| 3 | 遠古傳說 | 第三部_遠古傳說.mp4 | public/assets/videos/03-ancient-legend.mp4 |
| 4 | 鸚哥勇士的崛起 | 第四部_鸚哥勇士的堀起.mp4 | public/assets/videos/04-parrotfish-warrior-rises.mp4 |
| 5 | 殘光集結 | 第五部_殘光集結.mp4 | public/assets/videos/05-afterglow-rally.mp4 |
| 6 | 異變蔓延 | 第六部_異變蔓延.mp4 | public/assets/videos/06-mutation-spread.mp4 |

## Audio assets

The initial BGM source is the main music already used in the provided videos.

Recommended future files:

```text
public/assets/audio/afterglow-rally-main-loop.mp3
public/assets/audio/north-battlefield-main-loop.mp3
public/assets/audio/boss-warning-stinger.mp3
public/assets/audio/special-cutin-impact.mp3
```

Current audio plan:

| Usage | Source | Game asset path | Status | Rights |
| --- | --- | --- | --- | --- |
| 北境 lead-in music | `/assets/videos/05-afterglow-rally.mp4` audio | embedded in video | usable for prototype | confirm cleared for web game use |
| 北境 gameplay loop | extract / loop from 殘光集結 main music | public/assets/audio/north-battlefield-main-loop.mp3 | not extracted yet | confirm cleared for web game use |

## Data mapping example

In `src/data/assets.ts`:

```ts
export const assetPaths = {
  characters: {
    doubleBandSamurai: '/assets/characters/heroes/double-band-samurai.png',
    snowSealMage: '/assets/characters/heroes/snow-seal-mage.png',
    silverbackAssault: '/assets/characters/heroes/silverback-assault.png',
  },
  monsters: {
    giantGarbageAnemonePurple: '/assets/monsters/giant-garbage-anemone-purple.png',
    garbageAnemoneSmall: '/assets/monsters/garbage-anemone-small.png',
  },
  posters: {
    mutationTracking: '/assets/posters/ocean-chronicle-mutation-tracking.png',
    },
    videos: {
      evilGodDescends: '/assets/videos/01-evil-god-descends.mp4',
      iceCrystalPrincess: '/assets/videos/02-ice-crystal-princess.mp4',
      ancientLegend: '/assets/videos/03-ancient-legend.mp4',
      parrotfishWarriorRises: '/assets/videos/04-parrotfish-warrior-rises.mp4',
      afterglowRally: '/assets/videos/05-afterglow-rally.mp4',
      mutationSpread: '/assets/videos/06-mutation-spread.mp4',
    },
  };
```

## Asset preparation notes

For clean game implementation:

- Prefer PNG for character cards and transparent sprites.
- Use JPG/PNG for posters and maps.
- Use compressed MP4 for gallery videos.
- Keep file names English/kebab-case for code reliability.
- Keep Chinese display names in data files, not file names.
- For gameplay sprites, crop characters with transparent background if possible.
