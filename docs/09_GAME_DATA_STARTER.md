# 09 Game Data Starter — Suggested TypeScript Content

This file gives Codex concrete starter content for data-driven implementation.

## Character data sketch

```ts
export type CharacterFaction = 'hero' | 'villain' | 'monster' | 'ancient';

export interface CharacterEntry {
  id: string;
  name: string;
  faction: CharacterFaction;
  role: string;
  shortDescription: string;
  status: string;
  assetPath?: string;
}

export interface StageRosterEntry {
  characterId: string;
  switchable: boolean;
  roleInStage: 'player' | 'support' | 'locked';
}

export interface StageTeamState {
  roster: StageRosterEntry[];
  activeCharacterId: string;
  teamSkillLevel: 1 | 2 | 3 | 4 | 5;
  teamUpgradeEnergy: number;
  sharedSpecialMeter: number;
}

export interface UpgradeEnergyConfig {
  pickupId: string;
  displayName: string;
  assetPath?: string;
  levelThresholds: Record<1 | 2 | 3 | 4 | 5, number>;
  deathDropRatio: number;
  magnetRadius: number;
}

export interface CharacterCombatProfile {
  characterId: string;
  autoAttackName: string;
  autoAttackDamage: number;
  autoAttackIntervalMs: number;
  projectileSpeed: number;
  trackingStrength: number;
  rangeStyle: 'direct' | 'spread' | 'pierce' | 'homing' | 'area';
  specialName: string;
  specialCutinPath?: string;
}

export interface BossSpecialProfile {
  bossId: string;
  attackId: string;
  attackName: string;
  cutinPath?: string;
  freezeMs: number;
  warningText: string;
}

export const upgradeEnergyConfig: UpgradeEnergyConfig = {
  pickupId: 'ocean-light-energy',
  displayName: '海光能量',
  assetPath: '/assets/pickups/ocean-light-energy-v01.png',
  levelThresholds: {
    1: 0,
    2: 10,
    3: 25,
    4: 45,
    5: 70,
  },
  deathDropRatio: 0.5,
  magnetRadius: 72,
};

export const characters: CharacterEntry[] = [
  {
    id: 'double-band-samurai',
    name: '雙帶武士',
    faction: 'hero',
    role: '北境武士',
    shortDescription: '鎮守北境的黑金鎧甲武士，沉穩、嚴肅，以刀法守住王國邊界。',
    status: '在異變追跡中清除大量垃圾海葵，並將前往食人鯊戰神石像尋求突破。',
    assetPath: '/assets/characters/heroes/double-band-samurai.jpg',
  },
  {
    id: 'black-panther-ninja',
    name: '黑豹忍者',
    faction: 'hero',
    role: '暗流忍者',
    shortDescription: '黑衣蒙面的敏捷忍者，與透紅浪人在暗流區修行。',
    status: '發現異變後，準備進入神廟尋找起始與啟示。',
    assetPath: '/assets/characters/heroes/black-panther-ninja.jpg',
  },
  {
    id: 'red-ronin',
    name: '透紅浪人',
    faction: 'hero',
    role: '紅衣浪人',
    shortDescription: '沉默嚴肅的紅衣浪人，擅長刀法與正面斬擊。',
    status: '與黑豹忍者一同清除暗流異變，準備進入神廟。',
    assetPath: '/assets/characters/heroes/red-ronin.jpg',
  },
  {
    id: 'snow-seal-mage',
    name: '雪印法師',
    faction: 'hero',
    role: '冰晶法師',
    shortDescription: '持有冰晶法杖的法師，能以冰封法術阻擋強敵。',
    status: '提出前往冰原，尋找鯨鯊神諭。',
    assetPath: '/assets/characters/heroes/snow-seal-mage.jpg',
  },
  {
    id: 'silverback-assault',
    name: '銀背突擊兵',
    faction: 'hero',
    role: '突擊護衛',
    shortDescription: '穿著透明銀色裝甲、手持步槍的小丑魚突擊兵。',
    status: '護衛雪印法師前往冰原方向。',
    assetPath: '/assets/characters/heroes/silverback-assault.jpg',
  },
  {
    id: 'prince-clownfish',
    name: '公子王子',
    faction: 'hero',
    role: '王族旅者',
    shortDescription: '白金王族服飾的小丑魚王子，溫和但勇敢。',
    status: '王女封印後前往部族尋求支援，後續被鸚哥勇士救援。',
    assetPath: '/assets/characters/heroes/prince-clownfish.jpg',
  },
  {
    id: 'pink-dancer',
    name: '粉紅舞孃',
    faction: 'hero',
    role: '珊瑚老街信使',
    shortDescription: '粉紅色舞孃造型角色，柔和、優雅但能在危機中行動。',
    status: '前往珊瑚老街，發現當地受到垃圾海葵異變影響。',
    assetPath: '/assets/characters/heroes/pink-dancer.jpg',
  },
  {
    id: 'red-geisha',
    name: '紅藝伎',
    faction: 'hero',
    role: '珊瑚老街守護者',
    shortDescription: '紅色藝伎造型角色，扇技、幻術與表演性戰鬥的候選角色。',
    status: '在珊瑚老街線中登場。',
    assetPath: '/assets/characters/heroes/red-geisha.png',
  },
  {
    id: 'panda-sumo',
    name: '熊貓相撲',
    faction: 'hero',
    role: '珊瑚老街防衛者',
    shortDescription: '黑白魚紋與相撲造型的厚重防衛型角色。',
    status: '在珊瑚老街線中抵抗異變。',
    assetPath: '/assets/characters/heroes/panda-sumo.jpg',
  },
  {
    id: 'parrotfish-warrior',
    name: '鸚哥勇士',
    faction: 'hero',
    role: '部族戰士',
    shortDescription: '持矛的部族戰士，擅長突擊、救援與橫掃。',
    status: '救援被包圍的公子王子，開啟部族線。',
    assetPath: '/assets/characters/heroes/parrotfish-warrior.jpg',
  },
  {
    id: 'napoleon-wrasse-warrior',
    name: '蘇眉勇士',
    faction: 'hero',
    role: '部族弓手',
    shortDescription: '綠藍色蘇眉魚戰士，適合遠距離弓箭玩法。',
    status: '位於部族線，與鸚哥勇士相關。',
    assetPath: '/assets/characters/heroes/napoleon-wrasse-warrior.png',
  },
  {
    id: 'ribbon-princess',
    name: '緞帶王女',
    faction: 'hero',
    role: '王族核心角色',
    shortDescription: '王女線角色，具備重要劇情地位。',
    status: '待補完整正史定位。',
    assetPath: '/assets/characters/heroes/ribbon-princess.jpg',
  },
  {
    id: 'striped-beakfish-blacksmith',
    name: '石鯛鐵匠',
    faction: 'hero',
    role: '鍛造師',
    shortDescription: '與武器鍛造、刀刃精煉相關的角色。',
    status: '獅子魚武士曾尋求其精煉刀刃。',
    assetPath: '/assets/characters/heroes/striped-beakfish-blacksmith.png',
  },
  {
    id: 'tiger-grouper-emperor',
    name: '龍虎斑帝王',
    faction: 'hero',
    role: '帝王線角色',
    shortDescription: '具有統治者氣質的龍虎斑角色。',
    status: '待補完整正史定位。',
    assetPath: '/assets/characters/heroes/tiger-grouper-emperor.png',
  },
  {
    id: 'moray-strategist',
    name: '鯙鰻軍師',
    faction: 'villain',
    role: '黑潮策士',
    shortDescription: '身披黑暗華麗長袍與金色鎖鏈的鯙鰻策士。',
    status: '操控黑潮，將污染轉化為深淵兵器的種子。',
    assetPath: '/assets/characters/villains/moray-strategist.png',
  },
  {
    id: 'puffer-engineer',
    name: '六齒魨工程師',
    faction: 'villain',
    role: '深淵工程師',
    shortDescription: '黃黑工程師裝的河豚技術官，熱衷黑潮產線化。',
    status: '負責啟動黑潮轉換器，量產垃圾海葵與病毒紫海膽。',
    assetPath: '/assets/characters/villains/puffer-engineer.png',
  },
  {
    id: 'puffer-engineer-spike-mode',
    name: '六齒魨工程師・爆刺版',
    faction: 'villain',
    role: '深淵工程師強化形態',
    shortDescription: '六齒魨工程師的爆刺或過載狀態。',
    status: '可作為 Boss 轉階段或強化演出。',
    assetPath: '/assets/characters/villains/puffer-engineer-spike-mode.png',
  },
  {
    id: 'lionfish-warrior',
    name: '獅子魚武士',
    faction: 'villain',
    role: '復仇武士',
    shortDescription: '獅子魚造型的驕傲武士，具尖刺、刀刃與宿敵感。',
    status: '曾被雪印法師冰封阻擋，後續尋求武器精煉。',
    assetPath: '/assets/characters/villains/lionfish-warrior.png',
  },
  {
    id: 'anglerfish-messenger',
    name: '燈籠魚使者',
    faction: 'villain',
    role: '深海使者',
    shortDescription: '燈籠魚形象的深海使者，適合傳令、伏筆或引路角色。',
    status: '待補完整正史定位。',
    assetPath: '/assets/characters/villains/anglerfish-messenger.jpg',
  },
  {
    id: 'garbage-anemone-group',
    name: '垃圾海葵群',
    faction: 'monster',
    role: '第一階段異變體',
    shortDescription: '由污染與海洋垃圾滋生的海葵群，能蔓延、融合與侵入場景。',
    status: 'MVP 基礎敵人與環境威脅。',
    assetPath: '/assets/monsters/garbage-anemone-group.png',
  },
  {
    id: 'giant-garbage-anemone',
    name: '巨大垃圾海葵・紫色觸手模式',
    faction: 'monster',
    role: '北境首領級異變體',
    shortDescription: '由大量垃圾海葵融合而成的巨大怪物，擁有紫色半透明觸手與污染核心。',
    status: '異變追跡 MVP 第一關 Boss。',
    assetPath: '/assets/monsters/giant-garbage-anemone-purple.png',
  },
  {
    id: 'virus-purple-urchin',
    name: '病毒紫海膽',
    faction: 'monster',
    role: '深淵生化兵器',
    shortDescription: '紫色海膽型生化武器，帶有毒性、尖刺與病毒意象。',
    status: '後續章節敵人或關卡危害。',
    assetPath: '/assets/monsters/virus-purple-urchin.png',
  },
  {
    id: 'mecha-squid',
    name: '機甲烏賊',
    faction: 'monster',
    role: '機械兵器',
    shortDescription: '深淵兵器線的機甲烏賊，可延伸出地面、攻擊與飛行變體。',
    status: '後續深淵兵器關卡素材。',
    assetPath: '/assets/monsters/mecha-squid.png',
  },
  {
    id: 'jellyfish-evil-god',
    name: '水母邪神',
    faction: 'ancient',
    role: '神性反派',
    shortDescription: '具邪神感的水母存在，適合成為長線威脅或高階 Boss。',
    status: '待補完整正史定位。',
    assetPath: '/assets/characters/ancient_gods/jellyfish-evil-god.png',
  },
  {
    id: 'shark-war-god-statue',
    name: '食人鯊戰神石像',
    faction: 'ancient',
    role: '遠古武道象徵',
    shortDescription: '沉默的遠古戰神石像，可能引導雙帶武士突破武功。',
    status: '在擊敗巨大垃圾海葵後解鎖。',
    assetPath: '/assets/characters/ancient_gods/shark-war-god-statue.png',
  },
  {
    id: 'whale-shark-reincarnation-envoy',
    name: '鯨鯊輪迴使',
    faction: 'ancient',
    role: '冰原神諭線',
    shortDescription: '與鯨鯊神諭、輪迴或冰原啟示相關的遠古存在。',
    status: '雪印法師與銀背突擊兵尋找的神諭線索。',
    assetPath: '/assets/characters/ancient_gods/whale-shark-reincarnation-envoy.png',
  },
  {
    id: 'hammerhead-onmyoji',
    name: '阿髻鮫陰陽師',
    faction: 'ancient',
    role: '暗流神廟線',
    shortDescription: '與暗流神廟、起始與啟示相關的陰陽師形象。',
    status: '黑豹忍者與透紅浪人線的關鍵神祕角色。',
    assetPath: '/assets/characters/ancient_gods/hammerhead-onmyoji.jpg',
  },
];
```

## Combat profile data sketch

```ts
export const combatProfiles: CharacterCombatProfile[] = [
  {
    characterId: 'double-band-samurai',
    autoAttackName: '金弧劍波',
    autoAttackDamage: 10,
    autoAttackIntervalMs: 450,
    projectileSpeed: 620,
    trackingStrength: 0.35,
    rangeStyle: 'pierce',
    specialName: '破芯金斬',
    specialCutinPath: '/assets/cutins/heroes/double-band-samurai-core-breaker-v01.png',
  },
  {
    characterId: 'black-panther-ninja',
    autoAttackName: '影刃連投',
    autoAttackDamage: 5,
    autoAttackIntervalMs: 220,
    projectileSpeed: 760,
    trackingStrength: 0.55,
    rangeStyle: 'homing',
    specialName: '暗流瞬殺',
  },
  {
    characterId: 'red-ronin',
    autoAttackName: '赤潮一文字',
    autoAttackDamage: 18,
    autoAttackIntervalMs: 850,
    projectileSpeed: 540,
    trackingStrength: 0.2,
    rangeStyle: 'pierce',
    specialName: '浪人斷潮',
  },
  {
    characterId: 'snow-seal-mage',
    autoAttackName: '冰晶追矢',
    autoAttackDamage: 7,
    autoAttackIntervalMs: 520,
    projectileSpeed: 500,
    trackingStrength: 0.75,
    rangeStyle: 'homing',
    specialName: '冰封結界',
  },
  {
    characterId: 'silverback-assault',
    autoAttackName: '銀背連射',
    autoAttackDamage: 4,
    autoAttackIntervalMs: 140,
    projectileSpeed: 820,
    trackingStrength: 0.25,
    rangeStyle: 'direct',
    specialName: '護衛火網',
  },
];
```

## Boss cut-in data sketch

```ts
export const bossSpecialProfiles: BossSpecialProfile[] = [
  {
    bossId: 'giant-garbage-anemone',
    attackId: 'tentacle-sweep',
    attackName: '紫觸橫掃',
    cutinPath: '/assets/cutins/bosses/giant-garbage-anemone-tentacle-sweep-v01.png',
    freezeMs: 900,
    warningText: '紫觸橫掃',
  },
  {
    bossId: 'giant-garbage-anemone',
    attackId: 'toxic-core',
    attackName: '毒潮聚核',
    cutinPath: '/assets/cutins/bosses/giant-garbage-anemone-toxic-core-v01.png',
    freezeMs: 1000,
    warningText: '毒潮聚核',
  },
];
```

## Episode data sketch

```ts
export interface EpisodeNode {
  id: string;
  order?: number;
  title: string;
  subtitle?: string;
  region: string;
  status: 'locked' | 'available' | 'cleared' | 'coming-soon';
  description: string;
  posterPath?: string;
  videoPath?: string;
}

export interface VideoSegment {
  id: string;
  sourceEpisodeId: string;
  sourceVideoPath: string;
  label: string;
  startTimeSec?: number;
  endTimeSec?: number;
  useEmbeddedAudio?: boolean;
  musicCueId?: string;
  leadsIntoStageId: string;
}

export interface MusicCue {
  id: string;
  title: string;
  source: 'embedded-video' | 'audio-file';
  path: string;
  loop: boolean;
  rightsStatus: 'confirmed' | 'pending';
  notes?: string;
}

export const episodeNodes: EpisodeNode[] = [
  {
    id: 'evil-god-descends',
    order: 1,
    title: '邪神降臨',
    region: '深海神域',
    status: 'coming-soon',
    description: '深海邪神威脅登場，黑潮與污染的神性陰影開始浮現。',
    videoPath: '/assets/videos/01-evil-god-descends.mp4',
  },
  {
    id: 'ice-princess',
    order: 2,
    title: '冰晶王女',
    region: '冰晶王城',
    status: 'coming-soon',
    description: '王女自我冰封，王城陷入沉默。',
    videoPath: '/assets/videos/02-ice-crystal-princess.mp4',
  },
  {
    id: 'ancient-legend',
    order: 3,
    title: '遠古傳說',
    region: '遠古遺跡',
    status: 'coming-soon',
    description: '遠古神蹟與海洋傳說揭開，為後續石像、神諭與神廟線鋪陳。',
    videoPath: '/assets/videos/03-ancient-legend.mp4',
  },
  {
    id: 'parrotfish-warrior-rises',
    order: 4,
    title: '鸚哥勇士的崛起',
    region: '海潮部落',
    status: 'coming-soon',
    description: '鸚哥勇士登場，部族線與後續救援事件開始成形。',
    videoPath: '/assets/videos/04-parrotfish-warrior-rises.mp4',
  },
  {
    id: 'afterglow-rally',
    order: 5,
    title: '殘光集結',
    region: '王城外圍',
    status: 'coming-soon',
    description: '危機尚未被外圍世界理解，王子與舞孃開始分流。',
    videoPath: '/assets/videos/05-afterglow-rally.mp4',
  },
  {
    id: 'mutation-spread',
    order: 6,
    title: '異變蔓延',
    region: '珊瑚老街',
    status: 'coming-soon',
    description: '垃圾海葵開始入侵日常區域，異變比消息更快抵達。',
    videoPath: '/assets/videos/06-mutation-spread.mp4',
  },
  {
    id: 'mutation-tracking-north',
    order: 7,
    title: '異變追跡：北境戰場',
    region: '北境邊防',
    status: 'available',
    description: '雙帶武士清除垃圾海葵，面對融合而成的巨大異變體。',
    posterPath: '/assets/posters/ocean-chronicle-mutation-tracking.png',
  },
  {
    id: 'dark-current-temple',
    title: '暗流神廟',
    region: '暗流區',
    status: 'locked',
    description: '忍者與浪人進入神廟，尋找異變的起始。',
  },
  {
    id: 'ice-revelation',
    title: '冰原神諭',
    region: '冰原方向',
    status: 'locked',
    description: '雪印法師與銀背突擊兵前往冰原，尋找鯨鯊神諭。',
  },
  {
    id: 'abyss-weapons',
    title: '深淵兵器',
    region: '深淵高塔',
    status: 'locked',
    description: '鯙鰻軍師與六齒魨工程師啟動黑潮兵器產線。',
  },
];
```

## Stage team data sketch

```ts
export interface StageEntry {
  id: string;
  title: string;
  episodeId: string;
  leadInVideoSegmentId?: string;
  stageType: 'vertical-shooter';
  roster: StageRosterEntry[];
  defaultTeamSkillLevel: 1 | 2 | 3 | 4 | 5;
  startingSharedSpecialMeter: number;
}

export const stages: StageEntry[] = [
  {
      id: 'north-battlefield-anemone',
      title: '北境戰場：巨大垃圾海葵',
      episodeId: 'mutation-tracking-north',
      leadInVideoSegmentId: 'afterglow-double-band-north',
      stageType: 'vertical-shooter',
    roster: [
      {
        characterId: 'double-band-samurai',
        switchable: true,
        roleInStage: 'player',
      },
    ],
    defaultTeamSkillLevel: 1,
    startingSharedSpecialMeter: 0,
  },
  {
    id: 'dark-current-temple-entrance',
    title: '暗流區：神廟入口',
    episodeId: 'dark-current-temple',
    stageType: 'vertical-shooter',
    roster: [
      {
        characterId: 'black-panther-ninja',
        switchable: true,
        roleInStage: 'player',
      },
      {
        characterId: 'red-ronin',
        switchable: true,
        roleInStage: 'player',
      },
    ],
    defaultTeamSkillLevel: 1,
    startingSharedSpecialMeter: 0,
  },
];
```

## Video segment data sketch

```ts
export const videoSegments: VideoSegment[] = [
  {
    id: 'afterglow-double-band-north',
    sourceEpisodeId: 'afterglow-rally',
    sourceVideoPath: '/assets/videos/05-afterglow-rally.mp4',
    label: '雙帶小丑的北境守護',
    startTimeSec: undefined,
    endTimeSec: undefined,
    useEmbeddedAudio: true,
    musicCueId: 'afterglow-rally-embedded',
    leadsIntoStageId: 'north-battlefield-anemone',
  },
];
```

## Music cue data sketch

```ts
export const musicCues: MusicCue[] = [
  {
    id: 'afterglow-rally-embedded',
    title: '殘光集結主音樂',
    source: 'embedded-video',
    path: '/assets/videos/05-afterglow-rally.mp4',
    loop: false,
    rightsStatus: 'pending',
    notes: 'Used as lead-in audio for 雙帶小丑的北境守護 segment.',
  },
  {
    id: 'north-battlefield-main-loop',
    title: '北境戰場主循環',
    source: 'audio-file',
    path: '/assets/audio/north-battlefield-main-loop.mp3',
    loop: true,
    rightsStatus: 'pending',
    notes: 'Future extracted loop from the provided video music.',
  },
];
```
