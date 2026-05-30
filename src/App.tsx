import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Flag, Gem, Play, RotateCcw, Search, Sparkles, Swords, Zap } from 'lucide-react';
import { startOceanBgm } from './audio';

function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

type Screen = 'title' | 'map' | 'gallery' | 'video' | 'combat' | 'victory' | 'memory' | 'breakout' | 'minefield' | 'snowfield' | 'snake' | 'tower' | 'city';
type Cutin = {
  title: string;
  image: string;
  kind: 'hero' | 'boss';
} | null;

type Bullet = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  kind: 'sweep' | 'core';
};

type Pickup = {
  id: number;
  x: number;
  y: number;
  expiresAt: number;
};

type SlashWave = {
  id: number;
  x: number;
  y: number;
  level: number;
};

type Minion = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
};

type VideoLeadInConfig = {
  eyebrow: string;
  title: string;
  src: string;
  actionLabel: string;
  destination: 'map' | 'combat' | 'memory' | 'breakout' | 'minefield' | 'snowfield' | 'snake' | 'tower' | 'city';
};

type MemoryCardDef = {
  id: string;
  name: string;
  image: string;
};

type MemoryDeckCard = MemoryCardDef & {
  deckId: string;
};

type BrickKind = 'frost' | 'corrupt' | 'core';

type IceBrick = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  kind: BrickKind;
};

type IceBall = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bigHits: number;
};

type BreakoutStatus = 'ready' | 'playing' | 'won' | 'lost';
type MinefieldStatus = 'ready' | 'playing' | 'won' | 'lost';
type MinefieldMode = 'reveal' | 'flag';
type MineCell = {
  id: number;
  row: number;
  col: number;
  hasMine: boolean;
  adjacent: number;
  revealed: boolean;
  flagged: boolean;
};
type SnowUnitSide = 'ally' | 'enemy';
type SnowUnit = {
  id: number;
  side: SnowUnitSide;
  x: number;
  y: number;
  hp: number;
  cooldown: number;
  moveDir: number;
  dragging?: boolean;
};
type Snowball = {
  id: number;
  side: SnowUnitSide;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type SnakeCell = {
  row: number;
  col: number;
};

type SnakeDirection = 'up' | 'down' | 'left' | 'right';

type SnakeObstacle = SnakeCell & {
  id: number;
  expiresAt: number;
};

type SnakePowerup = SnakeCell & {
  id: number;
  expiresAt: number;
};

type SnakeStatus = 'ready' | 'playing' | 'won' | 'lost';

type SnakeWrapEffect = {
  id: number;
  from: SnakeCell;
  to: SnakeCell;
} | null;

type TowerStatus = 'ready' | 'playing' | 'won' | 'lost';
type TowerPlatformKind = 'normal' | 'fragile' | 'moving' | 'poison';

type TowerPlatform = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: TowerPlatformKind;
  dir: number;
  used?: boolean;
};

type TowerPlayer = {
  x: number;
  y: number;
  vy: number;
};

type TowerPowerup = {
  id: number;
  x: number;
  y: number;
};

type TowerMonster = {
  id: number;
  x: number;
  y: number;
  drift: number;
};

type CityDirection = 'up' | 'down' | 'left' | 'right';
type CityTileKind = 'coral' | 'stone' | 'seaweed' | 'current';
type CityTile = {
  id: number;
  kind: CityTileKind;
  x: number;
  y: number;
  size: number;
  hp?: number;
};
type CityUnit = {
  id: number;
  x: number;
  y: number;
  dir: CityDirection;
  hp: number;
  cooldown: number;
  turnTimer: number;
  speed: number;
};
type CityShot = {
  id: number;
  side: 'ally' | 'enemy';
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: CityDirection;
};
type CityPowerupKind = 'speed' | 'shield' | 'armor' | 'fortify';
type CityPowerup = {
  id: number;
  kind: CityPowerupKind;
  x: number;
  y: number;
  expiresAt: number;
};
type CityStatus = 'playing' | 'won' | 'lost';
type BreakoutPowerupKind = 'split2' | 'gun' | 'split5' | 'giant' | 'grow' | 'wide' | 'narrow';

type BreakoutPowerup = {
  id: number;
  kind: BreakoutPowerupKind;
  x: number;
  y: number;
};

type IceShot = {
  id: number;
  x: number;
  y: number;
};

const assets = {
  titleCover: assetUrl('/assets/mobile/ui/game-cover.webp?v=20260528'),
  heroPortrait: assetUrl('/assets/mobile/icons/double-band-samurai-portrait-v01.webp'),
  redGeishaHost: assetUrl('/assets/mobile/hosts/red-geisha-host-v01.png?v=20260528'),
  snowSealHost: assetUrl('/assets/mobile/hosts/snow-seal-mage-setting-cutout-v01.png?v=20260528d'),
  silverbackHost: assetUrl('/assets/mobile/hosts/silverback-assault-setting-cutout-v01.png?v=20260528d'),
  blackPantherHost: assetUrl('/assets/mobile/hosts/black-panther-ninja-setting-cutout-v01.png?v=20260528'),
  tomatoRoninHost: assetUrl('/assets/mobile/hosts/tomato-ronin-setting-cutout-v01.png?v=20260528'),
  whaleSharkHost: assetUrl('/assets/mobile/hosts/whale-shark-reincarnation-cutout-v01.png?v=20260529'),
  parrotfishHost: assetUrl('/assets/mobile/hosts/parrotfish-warrior-setting-cutout-v01.png?v=20260529'),
  napoleonWrasseHost: assetUrl('/assets/mobile/hosts/napoleon-wrasse-warrior-setting-cutout-v01.png?v=20260529'),
  morayHost: assetUrl('/assets/mobile/hosts/moray-strategist-setting-cutout-v01.png?v=20260529'),
  princeIcon: assetUrl('/assets/mobile/icons/prince-clownfish-circle-v01.png?v=20260529'),
  mechaSquid: {
    up: assetUrl('/assets/mobile/enemies/mecha-squid-up-cutout.webp?v=20260530b'),
    down: assetUrl('/assets/mobile/enemies/mecha-squid-down-cutout.webp?v=20260530b'),
    left: assetUrl('/assets/mobile/enemies/mecha-squid-left-cutout.webp?v=20260530b'),
    right: assetUrl('/assets/mobile/enemies/mecha-squid-right-cutout.webp?v=20260530b'),
  } satisfies Record<CityDirection, string>,
  cityUnits: {
    player: {
      up: assetUrl('/assets/mobile/city-units/silverback-tank-up-v01.webp?v=20260531'),
      down: assetUrl('/assets/mobile/city-units/silverback-tank-down-v01.webp?v=20260531'),
      left: assetUrl('/assets/mobile/city-units/silverback-tank-left-v01.webp?v=20260531'),
      right: assetUrl('/assets/mobile/city-units/silverback-tank-right-v01.webp?v=20260531'),
    },
    enemy: {
      up: assetUrl('/assets/mobile/city-units/mecha-squid-tank-up-v01.webp?v=20260531'),
      down: assetUrl('/assets/mobile/city-units/mecha-squid-tank-down-v01.webp?v=20260531'),
      left: assetUrl('/assets/mobile/city-units/mecha-squid-tank-left-v01.webp?v=20260531'),
      right: assetUrl('/assets/mobile/city-units/mecha-squid-tank-right-v01.webp?v=20260531'),
    },
    base: assetUrl('/assets/mobile/city-units/ice-crystal-base-v01.webp?v=20260531'),
  } satisfies { player: Record<CityDirection, string>; enemy: Record<CityDirection, string>; base: string },
  stageBg: assetUrl('/assets/mobile/stages/north-battlefield-bg-v01.webp'),
  bossStates: {
    idle: assetUrl('/assets/mobile/bosses/giant-garbage-anemone-idle-v01.webp'),
    sweep: assetUrl('/assets/mobile/bosses/giant-garbage-anemone-sweep-v01.webp'),
    core: assetUrl('/assets/mobile/bosses/giant-garbage-anemone-core-v01.webp'),
    hit: assetUrl('/assets/mobile/bosses/giant-garbage-anemone-hit-v01.webp'),
  },
  heroCutin: assetUrl('/assets/mobile/cutins/double-band-samurai-core-breaker-v01.webp'),
  bossSweepCutin: assetUrl('/assets/mobile/cutins/giant-garbage-anemone-tentacle-sweep-v01.webp'),
  bossCoreCutin: assetUrl('/assets/mobile/cutins/giant-garbage-anemone-toxic-core-v01.webp'),
  pickup: assetUrl('/assets/mobile/pickups/ocean-light-energy-v01.webp'),
  sharkStatue: assetUrl('/assets/mobile/victory/shark-war-god-statue.webp'),
};

const videoLeadIns = {
  startGame: {
    eyebrow: '海洋戰紀',
    title: '邪神降臨',
    src: assetUrl('/assets/mobile/videos/start-game-intro.mp4?v=20260528'),
    actionLabel: '進入劇情地圖',
    destination: 'map',
  },
  northBorder: {
    eyebrow: '北境邊防片頭',
    title: '雙帶武士的北境守護',
    src: assetUrl('/assets/mobile/videos/north-border-intro.mp4?v=20260528'),
    actionLabel: '進入關卡',
    destination: 'combat',
  },
  coralStreet: {
    eyebrow: '珊瑚老街片頭',
    title: '紅藝伎的記憶牌局',
    src: assetUrl('/assets/mobile/videos/coral-old-street-intro.mp4?v=20260528'),
    actionLabel: '開始翻牌',
    destination: 'memory',
  },
  iceCastle: {
    eyebrow: '冰晶王城片頭',
    title: '雪印法師的冰晶結界',
    src: assetUrl('/assets/mobile/videos/ice-crystal-castle-intro.mp4?v=20260528'),
    actionLabel: '進入結界',
    destination: 'breakout',
  },
  darkCurrent: {
    eyebrow: '暗流原野片頭',
    title: '黑豹忍者與透紅浪人的暗流偵查',
    src: assetUrl('/assets/mobile/videos/dark-current-field-intro.mp4?v=20260528'),
    actionLabel: '進入原野',
    destination: 'minefield',
  },
  snowfieldHighland: {
    eyebrow: '冰雪高原片頭',
    title: '銀背突擊兵的雪杖防線',
    src: assetUrl('/assets/mobile/videos/snowfield-highland-intro.mp4?v=20260529'),
    actionLabel: '開始打雪杖',
    destination: 'snowfield',
  },
  tideTribe: {
    eyebrow: '海潮部落片頭',
    title: '公子王子的海光路線',
    src: assetUrl('/assets/mobile/videos/tide-tribe-intro.mp4?v=20260529'),
    actionLabel: '開始貪食蛇',
    destination: 'snake',
  },
  abyssTower: {
    eyebrow: '深淵高塔片頭',
    title: '王子的深淵下樓試煉',
    src: assetUrl('/assets/mobile/videos/abyss-tower-intro.mp4?v=20260529'),
    actionLabel: '進入高塔',
    destination: 'tower',
  },
  underseaCity: {
    eyebrow: '海底城市片頭',
    title: '銀背突擊兵的主堡防衛戰',
    src: assetUrl('/assets/mobile/videos/undersea-city-intro.mp4?v=20260530'),
    actionLabel: '進入城市',
    destination: 'city',
  },
} satisfies Record<string, VideoLeadInConfig>;

const memoryCards: MemoryCardDef[] = [
  { id: 'double-band-samurai', name: '雙帶武士', image: assetUrl('/assets/mobile/cards/double-band-samurai-picture-card-v01.webp') },
  { id: 'snow-seal-mage', name: '雪印法師', image: assetUrl('/assets/mobile/cards/snow-seal-mage-picture-card-v01.webp') },
  { id: 'black-panther-ninja', name: '黑豹忍者', image: assetUrl('/assets/mobile/cards/black-panther-ninja-picture-card-v01.webp') },
  { id: 'pink-dancer', name: '粉紅舞孃', image: assetUrl('/assets/mobile/cards/pink-dancer-picture-card-v01.webp') },
  { id: 'red-geisha', name: '紅藝伎', image: assetUrl('/assets/mobile/cards/red-geisha-picture-card-v01.webp') },
  { id: 'parrotfish-warrior', name: '鸚哥勇士', image: assetUrl('/assets/mobile/cards/parrotfish-warrior-picture-card-v01.webp') },
  { id: 'moray-strategist', name: '鯙鰻軍師', image: assetUrl('/assets/mobile/cards/moray-strategist-picture-card-v01.webp') },
  { id: 'puffer-engineer', name: '六齒魨工程師', image: assetUrl('/assets/mobile/cards/puffer-engineer-picture-card-v01.webp') },
  { id: 'lionfish-warrior', name: '獅子魚武士', image: assetUrl('/assets/mobile/cards/lionfish-warrior-picture-card-v01.webp') },
  { id: 'garbage-anemone', name: '垃圾海葵群', image: assetUrl('/assets/mobile/cards/garbage-anemone-picture-card-v01.webp') },
  { id: 'virus-purple-urchin', name: '病毒紫海膽', image: assetUrl('/assets/mobile/cards/virus-purple-urchin-picture-card-v01.webp') },
  { id: 'jellyfish-evil-god', name: '水母邪神', image: assetUrl('/assets/mobile/cards/jellyfish-evil-god-picture-card-v01.webp') },
];

const characters = [
  {
    id: 'double-band-samurai',
    name: '雙帶武士',
    role: '北境武士',
    faction: '英雄',
    poster: assetUrl('/assets/mobile/posters/double-band-samurai-poster.webp'),
    status: '鎮守北境，將在異變追跡中面對巨大垃圾海葵。',
  },
  {
    id: 'snow-seal-mage',
    name: '雪印法師',
    role: '冰晶法師',
    faction: '英雄',
    poster: assetUrl('/assets/mobile/posters/snow-seal-mage-poster.webp'),
    status: '前往冰原尋找鯨鯊神諭。',
  },
  {
    id: 'silverback-assault',
    name: '銀背突擊兵',
    role: '重甲突擊兵',
    faction: '英雄',
    poster: assetUrl('/assets/mobile/posters/silverback-assault-poster.webp'),
    status: '以重甲火力突破敵方陣線。',
  },
  {
    id: 'black-panther-ninja',
    name: '黑豹忍者',
    role: '影流忍者',
    faction: '英雄',
    poster: assetUrl('/assets/mobile/posters/black-panther-ninja-poster.webp'),
    status: '潛行於暗流，擅長高速突襲。',
  },
  {
    id: 'tomato-ronin',
    name: '透紅浪人',
    role: '紅刃浪人',
    faction: '英雄',
    poster: assetUrl('/assets/mobile/posters/tomato-ronin-poster.webp'),
    status: '漂泊在外圍世界的孤高劍士。',
  },
  {
    id: 'prince',
    name: '公子王子',
    role: '珊瑚王子',
    faction: '英雄',
    poster: assetUrl('/assets/mobile/posters/prince-clownfish-poster.webp'),
    status: '前往部落尋求支援。',
  },
  {
    id: 'pink-dancer',
    name: '粉紅舞孃',
    role: '王都舞者',
    faction: '英雄',
    poster: assetUrl('/assets/mobile/posters/pink-dancer-poster.webp'),
    status: '前往珊瑚老街追查異變。',
  },
  {
    id: 'red-geisha',
    name: '紅藝伎',
    role: '藝伎侍者',
    faction: '英雄',
    poster: assetUrl('/assets/mobile/posters/red-geisha-poster.webp'),
    status: '以華麗身法守護王城記憶。',
  },
  {
    id: 'panda-sumo',
    name: '熊貓相撲',
    role: '相撲戰士',
    faction: '英雄',
    poster: assetUrl('/assets/mobile/posters/panda-sumo-poster.webp'),
    status: '正面壓制型的近戰隊友。',
  },
  {
    id: 'parrotfish-warrior',
    name: '鸚哥勇士',
    role: '紅紫戰士',
    faction: '英雄',
    poster: assetUrl('/assets/mobile/posters/parrotfish-warrior-poster.webp'),
    status: '以鮮烈色彩和勇氣帶動反擊。',
  },
  {
    id: 'napoleon-wrasse-warrior',
    name: '蘇眉勇士',
    role: '隱勇武士',
    faction: '英雄',
    poster: assetUrl('/assets/mobile/posters/napoleon-wrasse-warrior-poster.webp'),
    status: '沉著鎮守海底古道。',
  },
  {
    id: 'silver-band-prince',
    name: '銀帶公子',
    role: '公子系戰士',
    faction: '英雄',
    poster: assetUrl('/assets/mobile/posters/silver-band-prince-poster.webp'),
    status: '以華麗銀光支援隊伍。',
  },
  {
    id: 'stone-bream-smith',
    name: '石鯛鐵匠',
    role: '鍛造匠',
    faction: '支援',
    poster: assetUrl('/assets/mobile/posters/stone-bream-smith-poster.webp'),
    status: '負責打造抗衡異變的裝備。',
  },
  {
    id: 'lionfish-warrior',
    name: '獅子魚武士',
    role: '毒刃武士',
    faction: '反派',
    poster: assetUrl('/assets/mobile/posters/lionfish-warrior-poster.webp'),
    status: '華麗而危險的敵方武士。',
  },
  {
    id: 'dragon-tiger-grouper-king',
    name: '龍虎斑帝王',
    role: '城堡帝王',
    faction: '反派',
    poster: assetUrl('/assets/mobile/posters/dragon-tiger-grouper-king-poster.webp'),
    status: '盤據深海權力中心的劇場型霸主。',
  },
  {
    id: 'mecha-squid',
    name: '機甲烏賊',
    role: '機動兵器',
    faction: '反派',
    poster: assetUrl('/assets/mobile/posters/mecha-squid-poster.webp'),
    status: '深淵兵器工坊的機械化單位。',
  },
  {
    id: 'virus-purple-urchin',
    name: '病毒紫海膽',
    role: '生化武器',
    faction: '異變',
    poster: assetUrl('/assets/mobile/posters/virus-purple-urchin-poster.webp'),
    status: '尚未完全成熟的危險異變核心。',
  },
  {
    id: 'garbage-anemone-colony',
    name: '垃圾海葵群',
    role: '污染群體',
    faction: '異變',
    poster: assetUrl('/assets/mobile/posters/garbage-anemone-colony-poster.webp'),
    status: '讓異變正式進入日常世界的污染生命。',
  },
  {
    id: 'abyss-jellyfish',
    name: '深淵水母',
    role: '異界眷屬',
    faction: '異變',
    poster: assetUrl('/assets/mobile/posters/abyss-jellyfish-poster.webp'),
    status: '來自更深海域的黑潮信號。',
  },
  {
    id: 'anglerfish-messenger',
    name: '燈籠魚使者',
    role: '深海信使',
    faction: '反派',
    poster: assetUrl('/assets/mobile/posters/anglerfish-messenger-poster.webp'),
    status: '為黑潮陣營傳遞深海密令。',
  },
  {
    id: 'hound-spotted-divine-beast',
    name: '犬斑神獸',
    role: '預言神獸',
    faction: '遠古',
    poster: assetUrl('/assets/mobile/posters/hound-spotted-divine-beast-poster.webp'),
    status: '遠古力量尚未完全顯現前的神秘徵兆。',
  },
  {
    id: 'shark-war-god-statue',
    name: '食人鯊戰神石像',
    role: '遠古神像',
    faction: '遠古',
    poster: assetUrl('/assets/mobile/posters/shark-war-god-statue-poster.webp'),
    status: '第一關勝利後解鎖的劇情卡核心。',
  },
  {
    id: 'hammerhead-onmyoji',
    name: '阿髻鮫陰陽師',
    role: '遠古木雕',
    faction: '遠古',
    poster: assetUrl('/assets/mobile/posters/hammerhead-onmyoji-poster.webp'),
    status: '與古老陰陽術和神廟線索相關。',
  },
  {
    id: 'whale-shark-reincarnation',
    name: '鯨鯊輪迴使',
    role: '遠古神使',
    faction: '遠古',
    poster: assetUrl('/assets/mobile/posters/whale-shark-reincarnation-poster.webp'),
    status: '冰原方向與輪迴神諭的前置象徵。',
  },
];

const levelThresholds = [0, 10, 25, 45, 70];
const bossMaxHp = 1800;

function levelFromEnergy(energy: number) {
  let level = 1;
  for (let i = 0; i < levelThresholds.length; i += 1) {
    if (energy >= levelThresholds[i]) level = i + 1;
  }
  return Math.min(level, 5);
}

function slashLanesForLevel(level: number) {
  if (level <= 1) return [0];
  if (level === 2) return [-0.72, 0, 0.72];
  if (level === 3) return [0];
  if (level === 4) return [-0.42, 0.42];
  return [-0.78, 0, 0.78];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const snakeCols = 12;
const snakeRows = 16;
const snakeTarget = 30;
const snakeStart: SnakeCell[] = [
  { col: 5, row: 11 },
  { col: 5, row: 12 },
  { col: 5, row: 13 },
];
const towerGoalMs = 180000;
const towerDeathPenaltyMs = 15000;
const towerPlayerRadius = 3.6;
const towerPlayerStart: TowerPlayer = { x: 50, y: 48, vy: 0 };
const cityGridSize = 32;
const cityCellSize = 100 / cityGridSize;
const cityViewCols = 15;
const cityViewRows = 20;
const cityViewWidth = cityCellSize * cityViewCols;
const cityViewHeight = cityCellSize * cityViewRows;
const cityUnitSize = cityCellSize * 0.74;
const cityUnitVisualSize = cityCellSize * 0.94;
const cityBase = { x: cityCellCenter(15.5), y: cityCellCenter(29.5), size: cityCellSize * 2 };
const cityPlayerStart = { x: cityCellCenter(15), y: cityCellCenter(26), dir: 'up' as CityDirection };

function sameCell(a: SnakeCell, b: SnakeCell) {
  return a.row === b.row && a.col === b.col;
}

function randomInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function cityDirectionVector(direction: CityDirection) {
  if (direction === 'up') return { x: 0, y: -1 };
  if (direction === 'down') return { x: 0, y: 1 };
  if (direction === 'left') return { x: -1, y: 0 };
  return { x: 1, y: 0 };
}

function cityCellCenter(index: number) {
  return (index + 0.5) * cityCellSize;
}

function citySnapToGrid(value: number) {
  return cityCellCenter(clamp(Math.round(value / cityCellSize - 0.5), 0, cityGridSize - 1));
}

function cityApproach(value: number, target: number, maxDelta: number) {
  if (Math.abs(target - value) <= maxDelta) return target;
  return value + Math.sign(target - value) * maxDelta;
}

function createCityTiles(): CityTile[] {
  const tiles: CityTile[] = [];
  const occupied = new Set<string>();
  const add = (kind: CityTileKind, col: number, row: number) => {
    if (col < 0 || row < 0 || col >= cityGridSize || row >= cityGridSize) return;
    const key = `${col}-${row}`;
    if (occupied.has(key)) return;
    occupied.add(key);
    tiles.push({
      id: tiles.length + 1,
      kind,
      x: col * cityCellSize,
      y: row * cityCellSize,
      size: cityCellSize,
      hp: kind === 'coral' ? 2 : undefined,
    });
  };
  const block = (kind: CityTileKind, col: number, row: number, width: number, height: number) => {
    for (let y = row; y < row + height; y += 1) {
      for (let x = col; x < col + width; x += 1) add(kind, x, y);
    }
  };

  block('coral', 14, 27, 1, 5);
  block('coral', 17, 27, 1, 5);
  block('coral', 15, 27, 2, 1);
  block('coral', 15, 31, 2, 1);

  block('stone', 3, 3, 2, 3);
  block('stone', 27, 3, 2, 3);
  block('coral', 7, 3, 2, 5);
  block('coral', 23, 3, 2, 5);
  block('stone', 13, 5, 6, 1);

  block('coral', 4, 9, 5, 1);
  block('coral', 23, 9, 5, 1);
  block('stone', 11, 9, 2, 4);
  block('stone', 19, 9, 2, 4);
  block('coral', 15, 10, 2, 4);

  block('seaweed', 2, 13, 4, 3);
  block('seaweed', 26, 13, 4, 3);
  block('coral', 8, 15, 4, 2);
  block('coral', 20, 15, 4, 2);
  block('stone', 14, 16, 4, 1);

  block('current', 12, 19, 8, 2);
  block('seaweed', 4, 21, 5, 3);
  block('seaweed', 23, 21, 5, 3);
  block('coral', 10, 23, 3, 3);
  block('coral', 19, 23, 3, 3);
  block('stone', 2, 27, 4, 1);
  block('stone', 26, 27, 4, 1);
  return tiles;
}

function createCityEnemy(id: number): CityUnit {
  const spawns = [
    { x: cityCellCenter(2), y: cityCellCenter(1), dir: 'down' as CityDirection },
    { x: cityCellCenter(15), y: cityCellCenter(1), dir: 'down' as CityDirection },
    { x: cityCellCenter(29), y: cityCellCenter(1), dir: 'down' as CityDirection },
    { x: cityCellCenter(1), y: cityCellCenter(15), dir: 'right' as CityDirection },
    { x: cityCellCenter(30), y: cityCellCenter(15), dir: 'left' as CityDirection },
  ];
  const spawn = spawns[Math.floor(Math.random() * spawns.length)];
  return {
    id,
    x: spawn.x,
    y: spawn.y,
    dir: spawn.dir,
    hp: Math.random() > 0.68 ? 2 : 1,
    cooldown: 850 + Math.random() * 800,
    turnTimer: 500 + Math.random() * 800,
    speed: 0.008 + Math.random() * 0.003,
  };
}

function cityIntersectsRect(x: number, y: number, size: number, rect: { x: number; y: number; size: number }) {
  const half = size / 2;
  return x + half > rect.x && x - half < rect.x + rect.size && y + half > rect.y && y - half < rect.y + rect.size;
}

function cityTileBlocks(tile: CityTile) {
  return tile.kind === 'coral' || tile.kind === 'stone';
}

function cityTileBreaks(tile: CityTile) {
  return tile.kind === 'coral';
}

function cityBlocked(x: number, y: number, size: number, tiles: CityTile[]) {
  if (x < size / 2 || y < size / 2 || x > 100 - size / 2 || y > 100 - size / 2) return true;
  const hitWall = tiles.some((tile) => cityTileBlocks(tile) && cityIntersectsRect(x, y, size, tile));
  const hitBase = cityIntersectsRect(x, y, size, { x: cityBase.x - cityBase.size / 2, y: cityBase.y - cityBase.size / 2, size: cityBase.size });
  return hitWall || hitBase;
}

function cityMoveUnit(unit: Pick<CityUnit, 'x' | 'y' | 'dir'>, dt: number, speed: number, tiles: CityTile[]) {
  const vector = cityDirectionVector(unit.dir);
  const maxDelta = speed * dt;
  const next = { x: unit.x, y: unit.y };
  if (vector.x !== 0) {
    next.y = cityApproach(next.y, citySnapToGrid(next.y), maxDelta * 1.35);
    next.x += vector.x * maxDelta;
  } else {
    next.x = cityApproach(next.x, citySnapToGrid(next.x), maxDelta * 1.35);
    next.y += vector.y * maxDelta;
  }
  if (cityBlocked(next.x, next.y, cityUnitSize, tiles)) return { ...unit, blocked: true };
  return { ...unit, ...next, blocked: false };
}

function citySeaweedCover(x: number, y: number, tiles: CityTile[]) {
  return tiles.some((tile) => tile.kind === 'seaweed' && cityIntersectsRect(x, y, cityUnitSize * 0.85, tile));
}

function cityTerrainSpeed(x: number, y: number, tiles: CityTile[]) {
  const inCurrent = tiles.some((tile) => tile.kind === 'current' && cityIntersectsRect(x, y, cityUnitSize * 0.8, tile));
  return inCurrent ? 0.74 : 1;
}

function isReverseDirection(current: SnakeDirection, next: SnakeDirection) {
  return (
    (current === 'up' && next === 'down') ||
    (current === 'down' && next === 'up') ||
    (current === 'left' && next === 'right') ||
    (current === 'right' && next === 'left')
  );
}

function nextSnakeHead(head: SnakeCell, direction: SnakeDirection): SnakeCell {
  if (direction === 'up') return { row: head.row - 1, col: head.col };
  if (direction === 'down') return { row: head.row + 1, col: head.col };
  if (direction === 'left') return { row: head.row, col: head.col - 1 };
  return { row: head.row, col: head.col + 1 };
}

function wrapSnakeCell(cell: SnakeCell): SnakeCell {
  return {
    row: (cell.row + snakeRows) % snakeRows,
    col: (cell.col + snakeCols) % snakeCols,
  };
}

function placeSnakeFood(snake: SnakeCell[], obstacles: SnakeObstacle[]): SnakeCell {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const candidate = { row: randomInt(1, snakeRows - 2), col: randomInt(1, snakeCols - 2) };
    if (!snake.some((cell) => sameCell(cell, candidate)) && !obstacles.some((cell) => sameCell(cell, candidate))) {
      return candidate;
    }
  }
  return { row: 4, col: 6 };
}

function createSnakeObstacle(snake: SnakeCell[], food: SnakeCell, obstacles: SnakeObstacle[], powerup: SnakePowerup | null): SnakeObstacle | null {
  const head = snake[0];

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const candidate = { row: randomInt(2, snakeRows - 3), col: randomInt(1, snakeCols - 2) };
    const tooCloseToHead = Math.abs(candidate.row - head.row) + Math.abs(candidate.col - head.col) < 4;
    const occupied =
      tooCloseToHead ||
      sameCell(candidate, food) ||
      (powerup ? sameCell(candidate, powerup) : false) ||
      snake.some((cell) => sameCell(cell, candidate)) ||
      obstacles.some((cell) => sameCell(cell, candidate));
    if (!occupied) {
      return { ...candidate, id: Date.now() + attempt, expiresAt: performance.now() + randomInt(3000, 5000) };
    }
  }

  return null;
}

function placeSnakePowerup(snake: SnakeCell[], food: SnakeCell, obstacles: SnakeObstacle[]): SnakePowerup {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const candidate = { row: randomInt(1, snakeRows - 2), col: randomInt(1, snakeCols - 2) };
    const occupied = sameCell(candidate, food) || snake.some((cell) => sameCell(cell, candidate)) || obstacles.some((cell) => sameCell(cell, candidate));
    if (!occupied) {
      return { ...candidate, id: Date.now() + attempt, expiresAt: performance.now() + 7000 };
    }
  }
  return { row: 7, col: 6, id: Date.now(), expiresAt: performance.now() + 7000 };
}

function chooseTowerPlatformKind(progressMs: number): TowerPlatformKind {
  const difficulty = progressMs / towerGoalMs;
  const roll = Math.random();
  if (roll < 0.08 + difficulty * 0.08) return 'fragile';
  if (roll < 0.15 + difficulty * 0.1) return 'moving';
  if (difficulty > 0.25 && roll < 0.22 + difficulty * 0.12) return 'poison';
  return 'normal';
}

function towerPlatformGap(progressMs: number) {
  const difficulty = progressMs / towerGoalMs;
  const base = 7.5 + difficulty * 4.2;
  const swing = 4.5 + difficulty * 4.8;
  return base + Math.random() * swing;
}

function nextTowerPlatformX(lastX: number, progressMs: number) {
  const difficulty = progressMs / towerGoalMs;
  const jump = 16 + Math.random() * (32 + difficulty * 16);
  const direction = Math.random() > 0.5 ? 1 : -1;
  let nextX = lastX + jump * direction;
  if (nextX < 12 || nextX > 88) {
    nextX = lastX - jump * direction * (0.55 + Math.random() * 0.35);
  }
  if (Math.random() < 0.18 + difficulty * 0.16) {
    nextX = 12 + Math.random() * 76;
  }
  return clamp(nextX, 12, 88);
}

function createTowerPlatform(id: number, y: number, x: number, progressMs: number, kind?: TowerPlatformKind): TowerPlatform {
  const difficulty = progressMs / towerGoalMs;
  const widthRoll = Math.random();
  const width = widthRoll < 0.18
    ? 15 + Math.random() * 7
    : widthRoll > 0.82
      ? 29 + Math.random() * 8
      : 20 + Math.random() * (12 - difficulty * 3);
  return {
    id,
    x: clamp(x, 10, 90),
    y,
    width: clamp(width - difficulty * 4.5, 14, 36),
    height: 9 + Math.random() * 8,
    kind: kind ?? chooseTowerPlatformKind(progressMs),
    dir: Math.random() > 0.5 ? 1 : -1,
  };
}

function createTowerPlatforms(progressMs = 0): TowerPlatform[] {
  let lastX = 50;
  const first = createTowerPlatform(1, 58, 50, progressMs, 'normal');
  let nextY = 68 + Math.random() * 6;
  return [
    first,
    ...Array.from({ length: 6 }, (_, index) => {
      lastX = nextTowerPlatformX(lastX, progressMs);
      const platform = createTowerPlatform(index + 2, nextY, lastX, progressMs);
      nextY += towerPlatformGap(progressMs);
      return platform;
    }),
  ];
}

function createMemoryDeck(): MemoryDeckCard[] {
  return memoryCards
    .flatMap((card) => [0, 1].map((copy) => ({ ...card, deckId: `${card.id}-${copy}` })))
    .sort(() => Math.random() - 0.5);
}

function createIceBricks(): IceBrick[] {
  const rows = [
    { y: 10, coreChance: 0 },
    { y: 14, coreChance: 0 },
    { y: 18, coreChance: 0 },
    { y: 22, coreChance: 0.02 },
    { y: 26, coreChance: 0.02 },
    { y: 30, coreChance: 0.04 },
    { y: 34, coreChance: 0.04 },
    { y: 38, coreChance: 0.06 },
    { y: 42, coreChance: 0.06 },
    { y: 46, coreChance: 0.12 },
  ];

  return rows.flatMap((row, rowIndex) =>
    Array.from({ length: 15 }, (_, colIndex) => {
      const roll = Math.random();
      const isCore = roll < row.coreChance || (rowIndex >= 8 && colIndex >= 6 && colIndex <= 8 && Math.random() < 0.42);
      const isCorrupt = !isCore && (roll > 0.72 || (rowIndex > 3 && roll > 0.56));
      const kind: BrickKind = isCore ? 'core' : isCorrupt ? 'corrupt' : 'frost';
      const hp = isCore ? 2 : isCorrupt && Math.random() > 0.62 ? 2 : 1;
      return {
        id: rowIndex * 15 + colIndex,
        x: 4 + colIndex * 6.18,
        y: row.y,
        width: 5.05,
        height: 2.35,
        hp,
        maxHp: hp,
        kind,
      };
    }),
  );
}

function breakoutSpeedLevel(hitCount: number) {
  return Math.min(5, Math.floor(hitCount / 16) + 1);
}

function isNegativeBreakoutPowerup(kind: BreakoutPowerupKind) {
  return kind === 'grow' || kind === 'narrow';
}

const breakoutPowerups: BreakoutPowerupKind[] = ['split2', 'gun', 'split5', 'giant', 'wide', 'grow', 'narrow'];
const breakoutMaxActivePowerups = 4;
const breakoutMaxActiveShots = 5;
const breakoutMaxBalls = 8;
const breakoutDefaultPaddleWidth = 24;
const breakoutShotIntervalMs = 330;
const breakoutPowerupCooldownMs = 560;
const breakoutBallPowerupChance = 0.08;
const breakoutShotPowerupChance = 0.025;
const breakoutMaxGrowLayers = 3;
const mineRows = 10;
const mineCols = 8;
const mineCount = 13;

function createEmptyMineCells(): MineCell[] {
  return Array.from({ length: mineRows * mineCols }, (_, index) => ({
    id: index,
    row: Math.floor(index / mineCols),
    col: index % mineCols,
    hasMine: false,
    adjacent: 0,
    revealed: false,
    flagged: false,
  }));
}

function mineNeighbors(index: number) {
  const row = Math.floor(index / mineCols);
  const col = index % mineCols;
  const neighbors: number[] = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) continue;
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (nextRow >= 0 && nextRow < mineRows && nextCol >= 0 && nextCol < mineCols) {
        neighbors.push(nextRow * mineCols + nextCol);
      }
    }
  }

  return neighbors;
}

function createMineCells(firstRevealIndex: number): MineCell[] {
  const safeIndexes = new Set([firstRevealIndex, ...mineNeighbors(firstRevealIndex)]);
  const candidates = createEmptyMineCells()
    .map((cell) => cell.id)
    .filter((id) => !safeIndexes.has(id))
    .sort(() => Math.random() - 0.5);
  const mines = new Set(candidates.slice(0, mineCount));

  return createEmptyMineCells().map((cell) => ({
    ...cell,
    hasMine: mines.has(cell.id),
    adjacent: mineNeighbors(cell.id).filter((neighbor) => mines.has(neighbor)).length,
  }));
}

function revealMineCells(cells: MineCell[], startIndex: number) {
  const next = cells.map((cell) => ({ ...cell }));
  const queue = [startIndex];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || visited.has(current)) continue;
    visited.add(current);

    const cell = next[current];
    if (!cell || cell.flagged || cell.revealed) continue;
    cell.revealed = true;

    if (cell.adjacent === 0 && !cell.hasMine) {
      mineNeighbors(current).forEach((neighbor) => {
        if (!visited.has(neighbor)) queue.push(neighbor);
      });
    }
  }

  return next;
}

function useVisualViewportFrame() {
  useEffect(() => {
    const updateFrameSize = () => {
      const viewport = window.visualViewport;
      const viewportWidth = Math.floor(Math.min(viewport?.width ?? Infinity, window.innerWidth, document.documentElement.clientWidth, window.screen?.width ?? Infinity));
      const viewportHeight = Math.floor(Math.min(viewport?.height ?? Infinity, window.innerHeight, document.documentElement.clientHeight || Infinity));
      const frameWidth = Math.max(0, Math.min(viewportWidth - 16, (viewportHeight - 16) * (9 / 16), 430));
      const frameHeight = frameWidth * (16 / 9);
      const root = document.documentElement;

      root.style.setProperty('--oc-viewport-width', `${viewportWidth}px`);
      root.style.setProperty('--oc-viewport-height', `${viewportHeight}px`);
      root.style.setProperty('--oc-frame-width', `${frameWidth}px`);
      root.style.setProperty('--oc-frame-height', `${frameHeight}px`);
    };

    updateFrameSize();
    window.visualViewport?.addEventListener('resize', updateFrameSize);
    window.addEventListener('resize', updateFrameSize);
    window.addEventListener('orientationchange', updateFrameSize);
    return () => {
      window.visualViewport?.removeEventListener('resize', updateFrameSize);
      window.removeEventListener('resize', updateFrameSize);
      window.removeEventListener('orientationchange', updateFrameSize);
    };
  }, []);
}

export default function App() {
  useVisualViewportFrame();
  const [screen, setScreen] = useState<Screen>('title');
  const [cleared, setCleared] = useState(false);
  const [videoLeadIn, setVideoLeadIn] = useState<VideoLeadInConfig>(videoLeadIns.startGame);

  const openVideoLeadIn = (leadIn: VideoLeadInConfig) => {
    setVideoLeadIn(leadIn);
    setScreen('video');
  };
  const openLeadInOrCombat = () => {
    openVideoLeadIn(videoLeadIns.northBorder);
  };
  const startGame = () => {
    openVideoLeadIn(videoLeadIns.startGame);
  };
  const startCombat = () => {
    void startOceanBgm();
    setScreen('combat');
  };
  const completeVideoLeadIn = () => {
    if (videoLeadIn.destination === 'map') {
      void startOceanBgm();
      setScreen('map');
      return;
    }
    if (videoLeadIn.destination === 'combat') {
      startCombat();
      return;
    }
    if (videoLeadIn.destination === 'breakout') {
      void startOceanBgm();
      setScreen('breakout');
      return;
    }
    if (videoLeadIn.destination === 'minefield') {
      void startOceanBgm();
      setScreen('minefield');
      return;
    }
    if (videoLeadIn.destination === 'snowfield') {
      void startOceanBgm();
      setScreen('snowfield');
      return;
    }
    if (videoLeadIn.destination === 'snake') {
      void startOceanBgm();
      setScreen('snake');
      return;
    }
    if (videoLeadIn.destination === 'tower') {
      void startOceanBgm();
      setScreen('tower');
      return;
    }
    if (videoLeadIn.destination === 'city') {
      void startOceanBgm();
      setScreen('city');
      return;
    }
    void startOceanBgm();
    setScreen('memory');
  };

  return (
    <main className="app-shell">
      <div className="phone-frame">
        {screen === 'title' && <TitleScreen onStart={startGame} onGallery={() => setScreen('gallery')} />}
        {screen === 'map' && (
          <EpisodeMap
            cleared={cleared}
            onBack={() => setScreen('title')}
            onPlay={openLeadInOrCombat}
            onMemory={() => openVideoLeadIn(videoLeadIns.coralStreet)}
            onBreakout={() => openVideoLeadIn(videoLeadIns.iceCastle)}
            onMinefield={() => openVideoLeadIn(videoLeadIns.darkCurrent)}
            onSnowfield={() => openVideoLeadIn(videoLeadIns.snowfieldHighland)}
            onSnake={() => openVideoLeadIn(videoLeadIns.tideTribe)}
            onTower={() => openVideoLeadIn(videoLeadIns.abyssTower)}
            onCity={() => openVideoLeadIn(videoLeadIns.underseaCity)}
          />
        )}
        {screen === 'gallery' && <CharacterGallery onBack={() => setScreen('title')} />}
        {screen === 'memory' && <MemoryMatchGame onBack={() => setScreen('map')} />}
        {screen === 'breakout' && <IceBreakoutGame onBack={() => setScreen('map')} />}
        {screen === 'minefield' && <MinefieldGame onBack={() => setScreen('map')} />}
        {screen === 'snowfield' && <SnowfieldGame onBack={() => setScreen('map')} />}
        {screen === 'snake' && <TideSnakeGame onBack={() => setScreen('map')} />}
        {screen === 'tower' && <AbyssTowerGame onBack={() => setScreen('map')} />}
        {screen === 'city' && <UnderseaCityGame onBack={() => setScreen('map')} />}
        {screen === 'video' && <VideoLeadIn leadIn={videoLeadIn} onComplete={completeVideoLeadIn} />}
        {screen === 'combat' && (
          <CombatStage
            onVictory={() => {
              setCleared(true);
              setScreen('victory');
            }}
            onExit={() => setScreen('map')}
          />
        )}
        {screen === 'victory' && <VictoryCard onMap={() => setScreen('map')} onReplay={openLeadInOrCombat} />}
      </div>
    </main>
  );
}

function TitleScreen({ onStart, onGallery }: { onStart: () => void; onGallery: () => void }) {
  return (
    <section className="screen title-screen cover-title">
      <img src={assets.titleCover} alt="" className="screen-bg title-cover-art" />
      <nav className="title-actions">
        <button className="primary-action" onClick={onStart}>
          <Play size={18} />
          開始遊戲
        </button>
        <button onClick={onGallery}>
          <BookOpen size={18} />
          角色圖鑑
        </button>
      </nav>
    </section>
  );
}

function EpisodeMap({
  cleared,
  onBack,
  onPlay,
  onMemory,
  onBreakout,
  onMinefield,
  onSnowfield,
  onSnake,
  onTower,
  onCity,
}: {
  cleared: boolean;
  onBack: () => void;
  onPlay: () => void;
  onMemory: () => void;
  onBreakout: () => void;
  onMinefield: () => void;
  onSnowfield: () => void;
  onSnake: () => void;
  onTower: () => void;
  onCity: () => void;
}) {
  const nodes = [
    ['冰晶王城', 'breakout'],
    ['珊瑚老街', 'memory'],
    ['北境邊防', cleared ? 'cleared' : 'shooter'],
    ['暗流原野', 'minefield'],
    ['冰雪高原', 'snowfield'],
    ['海潮部落', 'snake'],
    ['深淵高塔', 'tower'],
    ['海底城市', 'city'],
  ];
  return (
    <section className="screen map-screen">
      <Header title="劇情地圖" onBack={onBack} />
      <div className="map-path">
        {nodes.map(([name, state]) => (
          <button
            key={name}
            className={`map-node ${state}`}
            onClick={
              name === '北境邊防'
                ? onPlay
                : name === '珊瑚老街'
                  ? onMemory
                  : name === '冰晶王城'
                    ? onBreakout
                    : name === '暗流原野'
                      ? onMinefield
                      : name === '冰雪高原'
                        ? onSnowfield
                        : name === '海潮部落'
                          ? onSnake
                          : name === '深淵高塔'
                            ? onTower
                            : name === '海底城市'
                              ? onCity
                        : undefined
            }
          >
            <span>{name}</span>
            <small>
              {state === 'cleared'
                ? '已通關'
                : state === 'shooter'
                  ? '射擊'
                  : state === 'breakout'
                  ? '打磚'
                  : state === 'memory'
                    ? '翻牌'
                    : state === 'minefield'
                      ? '踩雷'
                      : state === 'snowfield'
                        ? '打雪杖'
                        : state === 'snake'
                          ? '貪食蛇'
                          : state === 'tower'
                            ? '下樓'
                            : state === 'city'
                              ? '坦克'
                    : state === 'coming'
                      ? '劇情'
                      : '鎖定'}
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}

function MemoryMatchGame({ onBack }: { onBack: () => void }) {
  const [deck, setDeck] = useState<MemoryDeckCard[]>(() => createMemoryDeck());
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [previewed, setPreviewed] = useState<string[]>([]);
  const [locked, setLocked] = useState(true);
  const [hintUsed, setHintUsed] = useState(false);
  const [moves, setMoves] = useState(0);
  const [dialogue, setDialogue] = useState('你能贏我嗎？先看清楚每一張牌。');

  const matchedSet = useMemo(() => new Set(matched), [matched]);
  const previewedSet = useMemo(() => new Set(previewed), [previewed]);
  const won = matched.length === deck.length;

  const restart = useCallback(() => {
    const nextDeck = createMemoryDeck();
    const preview = nextDeck
      .map((card) => card.deckId)
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);
    setDeck(nextDeck);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setHintUsed(false);
    setDialogue('你能贏我嗎？先看清楚每一張牌。');
    setLocked(true);
    setPreviewed(preview);
    window.setTimeout(() => {
      setPreviewed([]);
      setLocked(false);
    }, 1200);
  }, []);

  useEffect(() => {
    restart();
  }, [restart]);

  useEffect(() => {
    if (flipped.length !== 2) return;
    setLocked(true);
    const [firstId, secondId] = flipped;
    const first = deck.find((card) => card.deckId === firstId);
    const second = deck.find((card) => card.deckId === secondId);
    window.setTimeout(() => {
      if (first && second && first.id === second.id) {
        setMatched((items) => [...items, firstId, secondId]);
        setDialogue('算你厲害，這一對被你看穿了。');
      } else {
        setDialogue('你是不是記憶不行？再想想剛剛在哪裡。');
      }
      setFlipped([]);
      setLocked(false);
    }, first && second && first.id === second.id ? 360 : 720);
  }, [deck, flipped]);

  const flipCard = useCallback(
    (card: MemoryDeckCard) => {
      if (locked || won || matchedSet.has(card.deckId) || flipped.includes(card.deckId) || flipped.length >= 2) return;
      setFlipped((items) => [...items, card.deckId]);
      if (flipped.length === 1) setMoves((value) => value + 1);
    },
    [flipped, locked, matchedSet, won],
  );

  const useHint = useCallback(() => {
    if (hintUsed || locked || won) return;
    const unavailable = new Set([...matched, ...flipped]);
    const hintCards = deck
      .filter((card) => !unavailable.has(card.deckId))
      .map((card) => card.deckId)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.ceil(deck.length / 2));
    setHintUsed(true);
    setLocked(true);
    setPreviewed(hintCards);
    setDialogue('只提示一次。兩秒內，記住紅藝伎翻出的暗牌。');
    window.setTimeout(() => {
      setPreviewed([]);
      setLocked(false);
      setDialogue('提示結束，現在看你的記憶。');
    }, 2000);
  }, [deck, flipped, hintUsed, locked, matched, won]);

  return (
    <section className="screen memory-screen">
      <Header
        title="珊瑚老街"
        onBack={onBack}
        action={
          <div className="header-action-row">
            <button className="icon-button" onClick={useHint} aria-label="提示" disabled={hintUsed || locked || won}>
              <Sparkles size={18} />
            </button>
            <button className="icon-button" onClick={restart} aria-label="重新開始">
              <RotateCcw size={18} />
            </button>
          </div>
        }
      />
      <div className="memory-host-panel">
        <div className="memory-dialogue">
          <p>{won ? '你竟然全都記住了。今晚，珊瑚老街算你贏。' : dialogue}</p>
        </div>
        <div className="memory-host-art" aria-hidden="true">
          <img src={assets.redGeishaHost} alt="" />
        </div>
      </div>
      <div className="memory-stats">
        <div>
          <span>步數 {moves}</span>
          <span>配對 {matched.length / 2}/12</span>
        </div>
      </div>
      <div className="memory-grid">
        {deck.map((card) => {
          const isMatched = matchedSet.has(card.deckId);
          const isFaceUp = isMatched || flipped.includes(card.deckId) || previewedSet.has(card.deckId);
          return (
            <button
              className={`memory-card ${isFaceUp ? 'face-up' : ''} ${isMatched ? 'matched' : ''}`}
              key={card.deckId}
              onClick={() => flipCard(card)}
              aria-label={isFaceUp ? card.name : '未翻開的牌'}
              disabled={locked && !previewedSet.has(card.deckId)}
            >
              <span className="memory-card-inner">
                <span className="memory-card-back" />
                <img className="memory-card-front" src={card.image} alt="" />
              </span>
            </button>
          );
        })}
      </div>
      {won && (
        <div className="memory-complete">
          <h2>牌局完成</h2>
          <p>紅藝伎收起扇子，珊瑚老街的記憶碎片重新對上了。</p>
          <div className="row-actions">
            <button onClick={restart}>
              <RotateCcw size={18} />
              再玩一次
            </button>
            <button className="primary-action" onClick={onBack}>
              <Gem size={18} />
              返回地圖
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function IceBreakoutGame({ onBack }: { onBack: () => void }) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const nextId = useRef(1);
  const rafRef = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  const shotTimer = useRef(0);
  const growLayerRef = useRef(0);
  const lastPowerupSpawnTime = useRef(-Infinity);
  const paddleRef = useRef(50);
  const paddleWidthRef = useRef(breakoutDefaultPaddleWidth);
  const ballsRef = useRef<IceBall[]>([{ id: 0, x: 50, y: 80, vx: 0.012, vy: -0.024, bigHits: 0 }]);
  const powerupsRef = useRef<BreakoutPowerup[]>([]);
  const shotsRef = useRef<IceShot[]>([]);
  const ammoRef = useRef(0);
  const shieldRef = useRef(3);
  const bricksRef = useRef<IceBrick[]>(createIceBricks());
  const statusRef = useRef<BreakoutStatus>('ready');
  const hitCountRef = useRef(0);
  const [paddle, setPaddle] = useState(50);
  const [paddleWidth, setPaddleWidth] = useState(breakoutDefaultPaddleWidth);
  const [balls, setBalls] = useState<IceBall[]>(() => [{ id: 0, x: 50, y: 80, vx: 0.012, vy: -0.024, bigHits: 0 }]);
  const [powerups, setPowerups] = useState<BreakoutPowerup[]>([]);
  const [shots, setShots] = useState<IceShot[]>([]);
  const [ammo, setAmmo] = useState(0);
  const [bricks, setBricks] = useState<IceBrick[]>(() => createIceBricks());
  const [shield, setShield] = useState(3);
  const [score, setScore] = useState(0);
  const [hitCount, setHitCount] = useState(0);
  const [status, setStatus] = useState<BreakoutStatus>('ready');
  const [dialogue, setDialogue] = useState('結界要靠你的節奏撐住。');

  const resetBall = useCallback((nextPaddle = paddleRef.current) => {
    const direction = Math.random() > 0.5 ? 1 : -1;
    const next = [{ id: nextId.current++, x: nextPaddle, y: 80, vx: direction * 0.012, vy: -0.024, bigHits: 0 }];
    ballsRef.current = next;
    setBalls(next);
  }, []);

  const restart = useCallback(() => {
    const nextBricks = createIceBricks();
    const nextBall = [{ id: 0, x: 50, y: 80, vx: 0.012, vy: -0.024, bigHits: 0 }];
    nextId.current = 1;
    bricksRef.current = nextBricks;
    ballsRef.current = nextBall;
    powerupsRef.current = [];
    shotsRef.current = [];
    ammoRef.current = 0;
    shieldRef.current = 3;
    paddleRef.current = 50;
    paddleWidthRef.current = breakoutDefaultPaddleWidth;
    statusRef.current = 'ready';
    hitCountRef.current = 0;
    growLayerRef.current = 0;
    shotTimer.current = 0;
    lastPowerupSpawnTime.current = -Infinity;
    lastTime.current = null;
    setBricks(nextBricks);
    setBalls(nextBall);
    setPowerups([]);
    setShots([]);
    setAmmo(0);
    setPaddle(50);
    setPaddleWidth(breakoutDefaultPaddleWidth);
    setShield(3);
    setScore(0);
    setHitCount(0);
    setStatus('ready');
    setDialogue('結界要靠你的節奏撐住。');
  }, []);

  const startRound = useCallback(() => {
    if (statusRef.current !== 'ready') return;
    statusRef.current = 'playing';
    lastTime.current = null;
    setStatus('playing');
    setDialogue('讓冰晶球穿透污染冰牆。');
  }, []);

  const movePaddle = useCallback((clientX: number) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const halfPaddle = paddleWidthRef.current / 2;
    const next = clamp(((clientX - rect.left) / rect.width) * 100, halfPaddle, 100 - halfPaddle);
    paddleRef.current = next;
    setPaddle(next);
    if (statusRef.current === 'ready') startRound();
    if (statusRef.current !== 'playing' && statusRef.current !== 'ready') return;
  }, [startRound]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    bricksRef.current = bricks;
  }, [bricks]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (statusRef.current !== 'playing') return;
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        const halfPaddle = paddleWidthRef.current / 2;
        const next = clamp(paddleRef.current - 5.2, halfPaddle, 100 - halfPaddle);
        paddleRef.current = next;
        setPaddle(next);
        event.preventDefault();
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        const halfPaddle = paddleWidthRef.current / 2;
        const next = clamp(paddleRef.current + 5.2, halfPaddle, 100 - halfPaddle);
        paddleRef.current = next;
        setPaddle(next);
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const tick = (time: number) => {
      const last = lastTime.current ?? time;
      const dt = Math.min(34, time - last);
      lastTime.current = time;

      if (statusRef.current === 'playing') {
        const radius = 1.08;
        const bigRadius = 2.1;
        const paddleWidth = paddleWidthRef.current;
        const paddleY = 91;
        const speedFactor = 1 + (breakoutSpeedLevel(hitCountRef.current) - 1) * 0.16;
        let nextBricks = bricksRef.current;
        let nextPowerups = powerupsRef.current;
        let nextShots = shotsRef.current;
        let nextAmmo = ammoRef.current;
        let scoreGain = 0;
        let hitGain = 0;
        let lastPoints = 0;

        const spawnPowerup = (x: number, y: number, chance: number) => {
          if (nextPowerups.length >= breakoutMaxActivePowerups) return;
          if (time - lastPowerupSpawnTime.current < breakoutPowerupCooldownMs) return;
          if (Math.random() > chance) return;
          lastPowerupSpawnTime.current = time;
          nextPowerups = [
            ...nextPowerups.slice(-(breakoutMaxActivePowerups - 1)),
            {
              id: nextId.current++,
              kind: breakoutPowerups[Math.floor(Math.random() * breakoutPowerups.length)],
              x,
              y,
            },
          ];
        };

        const damageBrick = (brick: IceBrick, source: 'ball' | 'shot') => {
          const points = brick.kind === 'core' ? 80 : brick.kind === 'corrupt' ? 42 : 28;
          lastPoints = points;
          scoreGain += points;
          hitGain += 1;
          spawnPowerup(
            brick.x + brick.width / 2,
            brick.y + brick.height / 2,
            source === 'shot' ? breakoutShotPowerupChance : breakoutBallPowerupChance,
          );
          nextBricks = nextBricks.map((item) => (item.id === brick.id ? { ...item, hp: item.hp - 1 } : item));
        };

        if (nextAmmo > 0) {
          shotTimer.current += dt;
          if (shotTimer.current >= breakoutShotIntervalMs && nextShots.length < breakoutMaxActiveShots) {
            shotTimer.current = 0;
            nextAmmo -= 1;
            nextShots = [...nextShots, { id: nextId.current++, x: paddleRef.current, y: paddleY - 4 }];
          }
        }

        nextShots = nextShots
          .map((shot) => ({ ...shot, y: shot.y - 0.072 * dt }))
          .filter((shot) => {
            const target = nextBricks.find(
              (brick) =>
                brick.hp > 0 &&
                shot.x >= brick.x &&
                shot.x <= brick.x + brick.width &&
                shot.y >= brick.y &&
                shot.y <= brick.y + brick.height,
            );
            if (target) {
              damageBrick(target, 'shot');
              return false;
            }
            return shot.y > 6;
          });

        const nextBalls = ballsRef.current
          .map((ball) => {
            const currentRadius = ball.bigHits > 0 ? bigRadius : radius;
            const nextBall = {
              ...ball,
              x: ball.x + ball.vx * dt * speedFactor,
              y: ball.y + ball.vy * dt * speedFactor,
            };

            if (nextBall.x < 6 || nextBall.x > 94) {
              nextBall.x = clamp(nextBall.x, 6, 94);
              nextBall.vx *= -1;
            }
            if (nextBall.y < 8) {
              nextBall.y = 8;
              nextBall.vy = Math.abs(nextBall.vy);
            }

            if (
              nextBall.vy > 0 &&
              nextBall.y + currentRadius >= paddleY - 1.4 &&
              nextBall.y - currentRadius <= paddleY + 2.6 &&
              Math.abs(nextBall.x - paddleRef.current) <= paddleWidth / 2
            ) {
              const offset = (nextBall.x - paddleRef.current) / (paddleWidth / 2);
              nextBall.y = paddleY - currentRadius - 1.4;
              nextBall.vx = clamp(offset * 0.03 + nextBall.vx * 0.28, -0.04, 0.04);
              nextBall.vy = -0.028 - Math.min(0.008, Math.abs(offset) * 0.005);
            }

            const collisions = nextBricks
              .filter(
                (brick) =>
                  brick.hp > 0 &&
                  nextBall.x + currentRadius >= brick.x &&
                  nextBall.x - currentRadius <= brick.x + brick.width &&
                  nextBall.y + currentRadius >= brick.y &&
                  nextBall.y - currentRadius <= brick.y + brick.height,
              )
              .slice(0, nextBall.bigHits > 0 ? 3 : 1);

            if (collisions.length > 0) {
              collisions.forEach((brick) => damageBrick(brick, 'ball'));
              if (nextBall.bigHits > 0) {
                nextBall.bigHits = Math.max(0, nextBall.bigHits - collisions.length);
              } else {
                nextBall.vy *= -1;
              }
            }

            return nextBall;
          })
          .filter((ball) => ball.y <= 98);

        if (nextBalls.length === 0) {
          const nextShield = shieldRef.current - 1;
          shieldRef.current = nextShield;
          nextAmmo = 0;
          nextShots = [];
          nextPowerups = [];
          hitCountRef.current = 0;
          setShield(Math.max(0, nextShield));
          setHitCount(0);
          setAmmo(0);
          setShots([]);
          setPowerups([]);

          if (nextShield <= 0) {
            statusRef.current = 'lost';
            setStatus('lost');
            ballsRef.current = [];
            setBalls([]);
            setDialogue('污染冰牆還沒清完，再凝聚一次。');
          } else {
            statusRef.current = 'ready';
            setStatus('ready');
            resetBall();
            setDialogue('冰晶球散了，球速回到 LV1。');
          }

          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        nextPowerups = nextPowerups
          .map((powerup) => ({ ...powerup, y: powerup.y + 0.036 * dt }))
          .filter((powerup) => {
            const caught = powerup.y >= paddleY - 2 && powerup.y <= paddleY + 4 && Math.abs(powerup.x - paddleRef.current) <= paddleWidth / 2 + 3;
            if (caught) {
              if (powerup.kind === 'split2') {
                const source = nextBalls[0] ?? { id: nextId.current++, x: paddleRef.current, y: 80, vx: 0.012, vy: -0.024, bigHits: 0 };
                if (nextBalls.length < breakoutMaxBalls) {
                  nextBalls.push({ ...source, id: nextId.current++, vx: -source.vx || 0.018, vy: -Math.abs(source.vy || 0.024) });
                  setDialogue('冰晶球分裂成兩顆。');
                } else {
                  setDialogue('冰晶球已經滿場飛舞，力量轉成分數。');
                  scoreGain += 120;
                }
              }
              if (powerup.kind === 'split5') {
                const source = nextBalls[0] ?? { id: nextId.current++, x: paddleRef.current, y: 80, vx: 0.012, vy: -0.024, bigHits: 0 };
                [-0.034, -0.018, 0.018, 0.034].slice(0, Math.max(0, breakoutMaxBalls - nextBalls.length)).forEach((vx) => {
                  nextBalls.push({ ...source, id: nextId.current++, vx, vy: -Math.abs(source.vy || 0.024) });
                });
                setDialogue(nextBalls.length >= breakoutMaxBalls ? '五重冰晶球展開，場上力量已達上限。' : '五重冰晶球展開。');
              }
              if (powerup.kind === 'gun') {
                nextAmmo += 20;
                setDialogue('法陣展開冰晶射擊，20 發。');
              }
              if (powerup.kind === 'giant') {
                nextBalls.forEach((ball) => {
                  ball.bigHits += 10;
                });
                setDialogue('冰晶球巨大化，可以連續貫穿。');
              }
              if (powerup.kind === 'wide') {
                const nextWidth = Math.min(38, paddleWidthRef.current + 7);
                paddleWidthRef.current = nextWidth;
                paddleRef.current = clamp(paddleRef.current, nextWidth / 2, 100 - nextWidth / 2);
                setPaddle(paddleRef.current);
                setPaddleWidth(nextWidth);
                setDialogue('反彈板延展，接球範圍變長。');
              }
              if (powerup.kind === 'narrow') {
                const nextWidth = Math.max(15, paddleWidthRef.current - 7);
                paddleWidthRef.current = nextWidth;
                paddleRef.current = clamp(paddleRef.current, nextWidth / 2, 100 - nextWidth / 2);
                setPaddle(paddleRef.current);
                setPaddleWidth(nextWidth);
                setDialogue('污染壓縮法陣，反彈板變短了。');
              }
              if (powerup.kind === 'grow') {
                if (growLayerRef.current >= breakoutMaxGrowLayers) {
                  setDialogue('污染反噬被結界壓住，沒有再增生。');
                  return false;
                }
                const layer = growLayerRef.current;
                growLayerRef.current += 1;
                const y = 50 + (layer % 4) * 3.1;
                nextBricks = [
                  ...nextBricks,
                  ...Array.from({ length: 15 }, (_, index) => ({
                    id: nextId.current++,
                    x: 4 + index * 6.18,
                    y,
                    width: 5.05,
                    height: 2.35,
                    hp: 1,
                    maxHp: 1,
                    kind: 'corrupt' as const,
                  })),
                ];
                setDialogue('污染反噬，冰牆又長出一層。');
              }
              return false;
            }
            return powerup.y < 99;
          });

        if (hitGain > 0) {
          hitCountRef.current += hitGain;
          setHitCount(hitCountRef.current);
          setScore((value) => value + scoreGain);
          const nextSpeedLevel = breakoutSpeedLevel(hitCountRef.current);
          setDialogue(lastPoints >= 80 ? `核心鬆動了，球速升到 LV${nextSpeedLevel}。` : `打得好，球速 LV${nextSpeedLevel}。`);
        }

        const remaining = nextBricks.filter((brick) => brick.hp > 0);
        if (remaining.length === 0) {
          statusRef.current = 'won';
          setStatus('won');
          setDialogue('結界修復完成，王城外牆暫時穩住了。');
        }

        ballsRef.current = nextBalls.slice(0, breakoutMaxBalls);
        bricksRef.current = nextBricks;
        powerupsRef.current = nextPowerups;
        shotsRef.current = nextShots;
        ammoRef.current = nextAmmo;
        setBalls(ballsRef.current);
        setBricks(nextBricks);
        setPowerups(nextPowerups);
        setShots(nextShots);
        setAmmo(nextAmmo);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [resetBall]);

  const remaining = bricks.filter((brick) => brick.hp > 0).length;
  const totalBricks = bricks.length;
  const speedLevel = breakoutSpeedLevel(hitCount);

  return (
    <section className="screen breakout-screen">
      <Header
        title="冰晶王城"
        onBack={onBack}
        action={
          <button className="icon-button" onClick={restart} aria-label="重新開始">
            <RotateCcw size={18} />
          </button>
        }
      />
      <div className="breakout-cast-panel">
        <img className="breakout-cast snow" src={assets.snowSealHost} alt="" aria-hidden="true" />
        <div className="breakout-dialogue">
          <p>{dialogue}</p>
        </div>
        <img className="breakout-cast silver" src={assets.silverbackHost} alt="" aria-hidden="true" />
      </div>
      <div
        className="breakout-field"
        ref={fieldRef}
        onPointerDown={(event) => movePaddle(event.clientX)}
        onPointerMove={(event) => {
          if (event.buttons > 0 || event.pointerType === 'touch') movePaddle(event.clientX);
        }}
      >
        <div className="breakout-hud">
          <span>結界 {shield}/3</span>
          <span>淨化 {totalBricks - remaining}/{totalBricks}</span>
          <span>球速 LV{speedLevel}</span>
          <span>{score}</span>
        </div>

        <div className="breakout-bricks" aria-hidden="true">
          {bricks.map((brick) => (
            <span
              className={`ice-brick ${brick.kind} hp-${brick.hp}`}
              key={brick.id}
              style={{
                left: `${brick.x}%`,
                top: `${brick.y}%`,
                width: `${brick.width}%`,
                height: `${brick.height}%`,
                opacity: brick.hp <= 0 ? 0 : 1,
              }}
            />
          ))}
        </div>

        {shots.map((shot) => (
          <span className="ice-shot" key={shot.id} style={{ left: `${shot.x}%`, top: `${shot.y}%` }} />
        ))}
        {powerups.map((powerup) => (
          <img
            className={`breakout-powerup ${powerup.kind} ${isNegativeBreakoutPowerup(powerup.kind) ? 'negative' : 'positive'}`}
            src={assets.pickup}
            alt=""
            key={powerup.id}
            style={{ left: `${powerup.x}%`, top: `${powerup.y}%` }}
          />
        ))}
        {balls.map((ball) => (
          <span className={`ice-ball ${ball.bigHits > 0 ? 'big' : ''}`} key={ball.id} style={{ left: `${ball.x}%`, top: `${ball.y}%` }} />
        ))}
        <div className="ice-paddle" style={{ left: `${paddle}%`, width: `${paddleWidth * 1.25}%` }}>
          <span />
          {ammo > 0 && <em>{ammo}</em>}
        </div>

        {status === 'ready' && (
          <div className="breakout-start-gate">
            <strong>冰晶法陣待命</strong>
            <button className="primary-action" onClick={startRound}>
              <Play size={18} />
              開始
            </button>
          </div>
        )}

        {status !== 'playing' && status !== 'ready' && (
          <div className="result-panel breakout-result">
            <h2>{status === 'won' ? '結界修復' : '結界破裂'}</h2>
            <p>{status === 'won' ? '雪印法師穩住冰晶法陣，銀背突擊兵守住最後防線。' : '污染冰牆尚未清除，重新凝聚冰晶球再試一次。'}</p>
            <div className="row-actions">
              <button onClick={restart}>
                <RotateCcw size={18} />
                再玩一次
              </button>
              <button className="primary-action" onClick={onBack}>
                <Gem size={18} />
                返回地圖
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MinefieldGame({ onBack }: { onBack: () => void }) {
  const longPressTimer = useRef<number | null>(null);
  const longPressedCell = useRef<number | null>(null);
  const [cells, setCells] = useState<MineCell[]>(() => createEmptyMineCells());
  const [status, setStatus] = useState<MinefieldStatus>('ready');
  const [mode, setMode] = useState<MinefieldMode>('reveal');
  const [dialogue, setDialogue] = useState('暗流下面埋著黑潮陷阱。短按探查，長按標記。');

  const revealedCount = cells.filter((cell) => cell.revealed && !cell.hasMine).length;
  const flaggedCount = cells.filter((cell) => cell.flagged).length;
  const safeCount = mineRows * mineCols - mineCount;

  const restart = useCallback(() => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    longPressedCell.current = null;
    setCells(createEmptyMineCells());
    setStatus('ready');
    setMode('reveal');
    setDialogue('暗流下面埋著黑潮陷阱。短按探查，長按標記。');
  }, []);

  const toggleFlag = useCallback(
    (cell: MineCell) => {
      if (status === 'won' || status === 'lost' || cell.revealed) return;
      const nextFlagged = !cell.flagged;
      setCells((current) => current.map((item) => (item.id === cell.id ? { ...item, flagged: nextFlagged } : item)));
      setDialogue(nextFlagged ? '長按標記完成。短按仍然可以直接探查。' : '標記取消，暗流繼續觀察。');
    },
    [status],
  );

  const revealCell = useCallback(
    (cell: MineCell) => {
      if (status === 'won' || status === 'lost' || cell.revealed) return;

      if (mode === 'flag') {
        toggleFlag(cell);
        return;
      }

      if (cell.flagged) return;

      const seededCells = status === 'ready' ? createMineCells(cell.id).map((item) => ({ ...item, flagged: cells[item.id]?.flagged ?? false })) : cells;
      const currentCell = seededCells[cell.id];
      let nextCells = seededCells;

      if (currentCell.hasMine) {
        nextCells = seededCells.map((item) => (item.hasMine ? { ...item, revealed: true } : item));
        setCells(nextCells);
        setStatus('lost');
        setDialogue('踩中黑潮陷阱，這段暗流要重走。');
        return;
      }

      nextCells = revealMineCells(seededCells, cell.id);
      const nextRevealed = nextCells.filter((item) => item.revealed && !item.hasMine).length;
      setCells(nextCells);
      setStatus(nextRevealed >= safeCount ? 'won' : 'playing');
      setDialogue(nextRevealed >= safeCount ? '路線清出來了，暗流原野暫時安全。' : currentCell.adjacent === 0 ? '黑豹忍者找到一片乾淨水路。' : `周圍有 ${currentCell.adjacent} 個暗雷。`);
    },
    [cells, mode, safeCount, status, toggleFlag],
  );

  const startMineLongPress = useCallback(
    (cell: MineCell) => {
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
      longPressedCell.current = null;
      longPressTimer.current = window.setTimeout(() => {
        longPressedCell.current = cell.id;
        toggleFlag(cell);
      }, 430);
    },
    [toggleFlag],
  );

  const clearMineLongPress = useCallback(() => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }, []);

  useEffect(
    () => () => {
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    },
    [],
  );

  return (
    <section className="screen minefield-screen">
      <Header
        title="暗流原野"
        onBack={onBack}
        action={
          <button onClick={restart} aria-label="重新開始">
            <RotateCcw size={20} />
          </button>
        }
      />
      <div className="minefield-cast-panel">
        <img className="minefield-cast panther" src={assets.blackPantherHost} alt="" aria-hidden="true" />
        <div className="minefield-dialogue">
          <p>{dialogue}</p>
        </div>
        <img className="minefield-cast ronin" src={assets.tomatoRoninHost} alt="" aria-hidden="true" />
      </div>
      <div className="minefield-panel">
        <div className="minefield-hud">
          <span>
            清路 <strong>{revealedCount}/{safeCount}</strong>
          </span>
          <span>
            標記 <strong>{flaggedCount}/{mineCount}</strong>
          </span>
          <div className="minefield-modes" aria-label="探查模式">
            <button className={mode === 'reveal' ? 'active' : ''} onClick={() => setMode('reveal')}>
              <Search size={15} />
              探查
            </button>
            <button className={mode === 'flag' ? 'active' : ''} onClick={() => setMode('flag')}>
              <Flag size={15} />
              標記
            </button>
          </div>
        </div>
        <div className="minefield-grid" style={{ '--mine-cols': mineCols } as CSSProperties}>
          {cells.map((cell) => (
            <button
              className={`mine-cell ${cell.revealed ? 'revealed' : ''} ${cell.flagged ? 'flagged' : ''} ${cell.hasMine && cell.revealed ? 'mine' : ''} tone-${cell.adjacent}`}
              key={cell.id}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                startMineLongPress(cell);
              }}
              onPointerUp={clearMineLongPress}
              onPointerCancel={clearMineLongPress}
              onPointerLeave={clearMineLongPress}
              onContextMenu={(event) => event.preventDefault()}
              onClick={() => {
                if (longPressedCell.current === cell.id) {
                  longPressedCell.current = null;
                  return;
                }
                revealCell(cell);
              }}
              aria-label={`第 ${cell.row + 1} 排第 ${cell.col + 1} 格`}
            >
              {cell.revealed && cell.hasMine ? '雷' : cell.revealed && cell.adjacent > 0 ? cell.adjacent : cell.flagged ? <Flag size={16} /> : ''}
            </button>
          ))}
        </div>
        {(status === 'won' || status === 'lost') && (
          <div className="minefield-result">
            <strong>{status === 'won' ? '暗流偵查完成' : '偵查失敗'}</strong>
            <button onClick={restart}>{status === 'won' ? '再探一次' : '重新挑戰'}</button>
          </div>
        )}
      </div>
    </section>
  );
}

function createSnowUnits(): SnowUnit[] {
  return [
    { id: 101, side: 'enemy', x: 23, y: 22, hp: 100, cooldown: 980, moveDir: 1 },
    { id: 102, side: 'enemy', x: 50, y: 18, hp: 100, cooldown: 1160, moveDir: -1 },
    { id: 103, side: 'enemy', x: 77, y: 22, hp: 100, cooldown: 1070, moveDir: 1 },
    { id: 1, side: 'ally', x: 23, y: 76, hp: 100, cooldown: 820, moveDir: 0 },
    { id: 2, side: 'ally', x: 50, y: 82, hp: 100, cooldown: 965, moveDir: 0 },
    { id: 3, side: 'ally', x: 77, y: 76, hp: 100, cooldown: 890, moveDir: 0 },
  ];
}

function SnowfieldGame({ onBack }: { onBack: () => void }) {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  const nextSnowballId = useRef(1);
  const unitsRef = useRef<SnowUnit[]>(createSnowUnits());
  const snowballsRef = useRef<Snowball[]>([]);
  const draggingRef = useRef<number | null>(null);
  const [units, setUnits] = useState<SnowUnit[]>(() => createSnowUnits());
  const [snowballs, setSnowballs] = useState<Snowball[]>([]);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [dialogue, setDialogue] = useState('雪杖會自己聚雪。站定才能穩穩丟出去。');

  const restart = useCallback(() => {
    const next = createSnowUnits();
    unitsRef.current = next;
    snowballsRef.current = [];
    draggingRef.current = null;
    nextSnowballId.current = 1;
    lastTime.current = null;
    setUnits(next);
    setSnowballs([]);
    setStatus('playing');
    setDialogue('雪杖會自己聚雪。站定才能穩穩丟出去。');
  }, []);

  const moveDraggedUnit = useCallback((clientX: number, clientY: number) => {
    const id = draggingRef.current;
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!id || !rect) return;
    const x = clamp(((clientX - rect.left) / rect.width) * 100, 12, 88);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 58, 88);
    unitsRef.current = unitsRef.current.map((unit) => (unit.id === id ? { ...unit, x, y, dragging: true, cooldown: Math.max(unit.cooldown, 180) } : unit));
    setUnits(unitsRef.current);
  }, []);

  const startDrag = useCallback(
    (unitId: number, clientX: number, clientY: number) => {
      if (status !== 'playing') return;
      draggingRef.current = unitId;
      setDialogue('移動時會停手，放開後再繼續丟雪杖。');
      moveDraggedUnit(clientX, clientY);
    },
    [moveDraggedUnit, status],
  );

  const stopDrag = useCallback(() => {
    const id = draggingRef.current;
    draggingRef.current = null;
    if (!id) return;
    unitsRef.current = unitsRef.current.map((unit) => (unit.id === id ? { ...unit, dragging: false } : unit));
    setUnits(unitsRef.current);
  }, []);

  useEffect(() => {
    const tick = (time: number) => {
      const last = lastTime.current ?? time;
      const dt = Math.min(34, time - last);
      lastTime.current = time;

      if (status === 'playing') {
        const nextUnits = unitsRef.current.map((unit) => ({ ...unit }));
        const nextSnowballs: Snowball[] = [];
        const spawned: Snowball[] = [];

        nextUnits.forEach((unit) => {
          if (unit.hp <= 0) return;
          if (unit.side === 'enemy') {
            unit.x += unit.moveDir * dt * 0.014;
            unit.y += Math.sin(time * 0.0011 + unit.id) * 0.018 * dt;
            if (unit.x < 14 || unit.x > 86) {
              unit.x = clamp(unit.x, 14, 86);
              unit.moveDir *= -1;
            }
            unit.y = clamp(unit.y, 14, 35);
          }

          unit.cooldown -= dt;
          if (unit.cooldown > 0 || unit.dragging) return;

          const targets = nextUnits.filter((target) => target.side !== unit.side && target.hp > 0);
          if (targets.length === 0) return;
          const target = targets.reduce((best, current) => {
            const bestDistance = Math.hypot(best.x - unit.x, best.y - unit.y);
            const currentDistance = Math.hypot(current.x - unit.x, current.y - unit.y);
            return currentDistance < bestDistance ? current : best;
          });
          const dx = target.x - unit.x;
          const dy = target.y - unit.y;
          const length = Math.hypot(dx, dy) || 1;
          const speed = 0.047;
          spawned.push({
            id: nextSnowballId.current++,
            side: unit.side,
            x: unit.x,
            y: unit.y + (unit.side === 'ally' ? -3 : 3),
            vx: (dx / length) * speed,
            vy: (dy / length) * speed,
          });
          unit.cooldown = unit.side === 'ally' ? 1040 + Math.random() * 250 : 1250 + Math.random() * 300;
        });

        [...snowballsRef.current, ...spawned].forEach((ball) => {
          const moved = {
            ...ball,
            x: ball.x + ball.vx * dt,
            y: ball.y + ball.vy * dt,
          };
          const target = nextUnits.find((unit) => unit.side !== ball.side && unit.hp > 0 && Math.hypot(unit.x - moved.x, unit.y - moved.y) < 5.2);
          if (target) {
            target.hp = Math.max(0, target.hp - 10);
            return;
          }
          if (moved.x > -5 && moved.x < 105 && moved.y > -5 && moved.y < 105) {
            nextSnowballs.push(moved);
          }
        });

        const alliesAlive = nextUnits.some((unit) => unit.side === 'ally' && unit.hp > 0);
        const enemiesAlive = nextUnits.some((unit) => unit.side === 'enemy' && unit.hp > 0);
        if (!enemiesAlive) {
          setStatus('won');
          setDialogue('冰雪高原的雪線被守住了。');
        } else if (!alliesAlive) {
          setStatus('lost');
          setDialogue('雪杖陣形被打散了，再調整站位。');
        }

        unitsRef.current = nextUnits;
        snowballsRef.current = nextSnowballs.slice(-24);
        setUnits(unitsRef.current);
        setSnowballs(snowballsRef.current);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [status]);

  const enemiesLeft = units.filter((unit) => unit.side === 'enemy' && unit.hp > 0).length;
  const alliesLeft = units.filter((unit) => unit.side === 'ally' && unit.hp > 0).length;

  return (
    <section className="screen snowfield-screen">
      <Header
        title="冰雪高原"
        onBack={onBack}
        action={
          <button onClick={restart} aria-label="重新開始">
            <RotateCcw size={20} />
          </button>
        }
      />
      <div className="snowfield-cast-panel">
        <img className="snowfield-host" src={assets.whaleSharkHost} alt="" aria-hidden="true" />
        <div className="snowfield-dialogue">
          <p>{dialogue}</p>
        </div>
      </div>
      <div
        className="snowfield-arena"
        ref={arenaRef}
        onPointerMove={(event) => moveDraggedUnit(event.clientX, event.clientY)}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onPointerLeave={stopDrag}
      >
        <div className="snowfield-hud">
          <span>
            我方 <strong>{alliesLeft}/3</strong>
          </span>
          <span>
            敵方 <strong>{enemiesLeft}/3</strong>
          </span>
        </div>
        <div className="snow-lane enemy-lane" />
        <div className="snow-lane ally-lane" />
        {units.map((unit) => (
          <button
            className={`snow-unit ${unit.side} ${unit.hp <= 0 ? 'down' : ''} ${unit.dragging ? 'dragging' : ''}`}
            key={unit.id}
            style={{ left: `${unit.x}%`, top: `${unit.y}%` }}
            onPointerDown={(event) => {
              if (unit.side !== 'ally' || unit.hp <= 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              startDrag(unit.id, event.clientX, event.clientY);
            }}
            aria-label={unit.side === 'ally' ? '我方鯨鯊雪杖手' : '敵方雪影'}
          >
            <img src={unit.side === 'ally' ? assets.silverbackHost : assets.bossStates.idle} alt="" />
            <i style={{ width: `${Math.min(100, unit.hp)}%` }} />
          </button>
        ))}
        {snowballs.map((ball) => (
          <span className={`snowball ${ball.side}`} key={ball.id} style={{ left: `${ball.x}%`, top: `${ball.y}%` }} />
        ))}
        {(status === 'won' || status === 'lost') && (
          <div className="snowfield-result">
            <strong>{status === 'won' ? '雪線守住' : '雪杖失守'}</strong>
            <button onClick={restart}>{status === 'won' ? '再打一場' : '重新布陣'}</button>
          </div>
        )}
      </div>
    </section>
  );
}

function TideSnakeGame({ onBack }: { onBack: () => void }) {
  const snakeBoardRef = useRef<HTMLDivElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const directionRef = useRef<SnakeDirection>('up');
  const snakeRef = useRef<SnakeCell[]>(snakeStart);
  const foodRef = useRef<SnakeCell>(placeSnakeFood(snakeStart, []));
  const obstaclesRef = useRef<SnakeObstacle[]>([]);
  const powerupRef = useRef<SnakePowerup | null>(null);
  const invincibleUntilRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const statusRef = useRef<SnakeStatus>('ready');
  const nextWrapEffectId = useRef(1);
  const wrapEffectTimer = useRef<number | null>(null);
  const [direction, setDirection] = useState<SnakeDirection>('up');
  const [snake, setSnake] = useState<SnakeCell[]>(snakeStart);
  const [food, setFood] = useState<SnakeCell>(() => placeSnakeFood(snakeStart, []));
  const [obstacles, setObstacles] = useState<SnakeObstacle[]>([]);
  const [powerup, setPowerup] = useState<SnakePowerup | null>(null);
  const [invincibleUntil, setInvincibleUntil] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [status, setStatus] = useState<SnakeStatus>('ready');
  const [dialogue, setDialogue] = useState('海光會引路。邊框可以穿越，無敵時海葵會變素材。');
  const [snakeBoardSize, setSnakeBoardSize] = useState({ width: 0, height: 0 });
  const [wrapEffect, setWrapEffect] = useState<SnakeWrapEffect>(null);
  const [skipSnakeTransition, setSkipSnakeTransition] = useState(false);
  const snakeStepMs = Math.max(118, 205 - Math.floor(score / 5) * 14);
  const snakePositionStyle = useCallback(
    (cell: SnakeCell, extra?: CSSProperties) =>
      ({
        '--snake-x': `${((cell.col + 0.5) / snakeCols) * snakeBoardSize.width}px`,
        '--snake-y': `${((cell.row + 0.5) / snakeRows) * snakeBoardSize.height}px`,
        ...extra,
      }) as CSSProperties,
    [snakeBoardSize.height, snakeBoardSize.width],
  );

  useEffect(() => {
    const board = snakeBoardRef.current;
    if (!board) return;
    const updateSize = () => {
      const rect = board.getBoundingClientRect();
      setSnakeBoardSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  useEffect(() => {
    obstaclesRef.current = obstacles;
  }, [obstacles]);

  useEffect(() => {
    powerupRef.current = powerup;
  }, [powerup]);

  useEffect(() => {
    invincibleUntilRef.current = invincibleUntil;
  }, [invincibleUntil]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const changeDirection = useCallback((next: SnakeDirection) => {
    if (statusRef.current !== 'playing' && statusRef.current !== 'ready') return;
    if (statusRef.current === 'playing' && isReverseDirection(directionRef.current, next)) return;
    if (statusRef.current === 'ready') {
      statusRef.current = 'playing';
      setStatus('playing');
      setDialogue('海光路線開始了，注意短暫冒出的垃圾海葵。');
    }
    directionRef.current = next;
    setDirection(next);
  }, []);

  const resetRound = useCallback((nextLives: number) => {
    if (wrapEffectTimer.current) window.clearTimeout(wrapEffectTimer.current);
    wrapEffectTimer.current = null;
    directionRef.current = 'up';
    obstaclesRef.current = [];
    powerupRef.current = null;
    invincibleUntilRef.current = 0;
    snakeRef.current = snakeStart;
    const nextFood = placeSnakeFood(snakeStart, []);
    foodRef.current = nextFood;
    setDirection('up');
    setSnake(snakeStart);
    setFood(nextFood);
    setObstacles([]);
    setPowerup(null);
    setInvincibleUntil(0);
    setWrapEffect(null);
    setSkipSnakeTransition(false);
    setLives(nextLives);
  }, []);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = 3;
    statusRef.current = 'ready';
    setScore(0);
    setStatus('ready');
    setDialogue('海光會引路。邊框可以穿越，無敵時海葵會變素材。');
    resetRound(3);
  }, [resetRound]);

  const loseLife = useCallback(() => {
    const nextLives = livesRef.current - 1;
    livesRef.current = nextLives;
    if (nextLives <= 0) {
      statusRef.current = 'lost';
      setLives(0);
      setStatus('lost');
      setDialogue('海潮被垃圾海葵堵住了，重新整隊再來。');
      return;
    }
    statusRef.current = 'ready';
    setStatus('ready');
    setDialogue('小心！海葵只停一下，等它散開再衝。');
    resetRound(nextLives);
  }, [resetRound]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (statusRef.current !== 'playing') return;
      const now = performance.now();
      const activeObstacles = obstaclesRef.current.filter((obstacle) => obstacle.expiresAt > now);
      if (activeObstacles.length !== obstaclesRef.current.length) {
        obstaclesRef.current = activeObstacles;
        setObstacles(activeObstacles);
      }
      if (powerupRef.current && powerupRef.current.expiresAt <= now) {
        powerupRef.current = null;
        setPowerup(null);
      }
      if (invincibleUntilRef.current > 0 && invincibleUntilRef.current <= now) {
        invincibleUntilRef.current = 0;
        setInvincibleUntil(0);
        setDialogue('無敵光退了，接下來要小心海葵。');
      }

      const currentSnake = snakeRef.current;
      const rawHead = nextSnakeHead(currentSnake[0], directionRef.current);
      const head = wrapSnakeCell(rawHead);
      const didWrap = rawHead.row !== head.row || rawHead.col !== head.col;
      if (didWrap) {
        if (wrapEffectTimer.current) window.clearTimeout(wrapEffectTimer.current);
        setSkipSnakeTransition(true);
        setWrapEffect({ id: nextWrapEffectId.current++, from: currentSnake[0], to: head });
        wrapEffectTimer.current = window.setTimeout(() => {
          setSkipSnakeTransition(false);
          setWrapEffect(null);
          wrapEffectTimer.current = null;
        }, 170);
      }
      const hitSelf = currentSnake.slice(1).some((cell) => sameCell(cell, head));
      const hitObstacle = activeObstacles.some((obstacle) => sameCell(obstacle, head));
      const isInvincible = invincibleUntilRef.current > now;
      if (hitSelf || (hitObstacle && !isInvincible)) {
        loseLife();
        return;
      }
      const materialBonus = hitObstacle && isInvincible ? 2 : 0;
      if (materialBonus > 0) {
        const clearedObstacles = activeObstacles.filter((obstacle) => !sameCell(obstacle, head));
        obstaclesRef.current = clearedObstacles;
        setObstacles(clearedObstacles);
        setDialogue('無敵海光把海葵轉成素材，海光加倍成長。');
      }

      const ateFood = sameCell(head, foodRef.current);
      const atePowerup = powerupRef.current ? sameCell(head, powerupRef.current) : false;
      const growBy = (ateFood ? 1 : 0) + materialBonus;
      const baseSnake = growBy > 0 ? [head, ...currentSnake] : [head, ...currentSnake.slice(0, -1)];
      const tail = currentSnake[currentSnake.length - 1];
      const nextSnake = growBy > 1 ? [...baseSnake, ...Array.from({ length: growBy - 1 }, () => ({ ...tail }))] : baseSnake;
      snakeRef.current = nextSnake;
      setSnake(nextSnake);

      if (atePowerup) {
        const nextInvincibleUntil = now + 5000;
        powerupRef.current = null;
        invincibleUntilRef.current = nextInvincibleUntil;
        setPowerup(null);
        setInvincibleUntil(nextInvincibleUntil);
        setDialogue('無敵海光啟動，5秒內海葵會變成加倍素材。');
      }

      if (ateFood || materialBonus > 0) {
        const nextScore = scoreRef.current + (ateFood ? 1 : 0) + materialBonus;
        scoreRef.current = nextScore;
        setScore(nextScore);
        if (materialBonus === 0) {
          setDialogue(nextScore >= snakeTarget ? '王子的海光路線完成了。' : nextScore % 5 === 0 ? '節奏很好，再收幾顆海光。' : '吃到了，尾光會跟上王子。');
        }
        if (nextScore >= snakeTarget) {
          statusRef.current = 'won';
          setStatus('won');
          return;
        }
        if (ateFood) {
          const nextObstaclesForFood = obstaclesRef.current.filter((obstacle) => obstacle.expiresAt > now);
          const nextFood = placeSnakeFood(nextSnake, nextObstaclesForFood);
          foodRef.current = nextFood;
          setFood(nextFood);
        }
      }
    }, snakeStepMs);
    return () => window.clearInterval(timer);
  }, [loseLife, snakeStepMs]);

  useEffect(
    () => () => {
      if (wrapEffectTimer.current) window.clearTimeout(wrapEffectTimer.current);
    },
    [],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (statusRef.current !== 'playing') return;
      const now = performance.now();
      const activeObstacles = obstaclesRef.current.filter((obstacle) => obstacle.expiresAt > now);
      const shouldSpawn = activeObstacles.length < 3 || (activeObstacles.length < 5 && Math.random() > 0.45);
      const spawned = shouldSpawn ? createSnakeObstacle(snakeRef.current, foodRef.current, activeObstacles, powerupRef.current) : null;
      const nextObstacles = spawned ? [...activeObstacles, spawned] : activeObstacles;
      obstaclesRef.current = nextObstacles;
      setObstacles(nextObstacles);
    }, 950);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (statusRef.current !== 'playing' || powerupRef.current) return;
      const nextPowerup = placeSnakePowerup(snakeRef.current, foodRef.current, obstaclesRef.current);
      powerupRef.current = nextPowerup;
      setPowerup(nextPowerup);
      setDialogue('無敵海光出現了，吃到後5秒不怕海葵，撞上海葵會轉成素材。');
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') changeDirection('up');
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') changeDirection('down');
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') changeDirection('left');
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') changeDirection('right');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [changeDirection]);

  const handleSwipeEnd = (clientX: number, clientY: number) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = clientX - start.x;
    const dy = clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      changeDirection(dx > 0 ? 'right' : 'left');
    } else {
      changeDirection(dy > 0 ? 'down' : 'up');
    }
  };

  return (
    <section className="screen tide-screen">
      <Header
        title="海潮部落"
        onBack={onBack}
        action={
          <button onClick={restart} aria-label="重新開始">
            <RotateCcw size={20} />
          </button>
        }
      />
      <div className="tide-cast-panel">
        <img className="tide-cast parrot" src={assets.parrotfishHost} alt="" aria-hidden="true" />
        <div className="tide-dialogue">
          <p>{dialogue}</p>
        </div>
        <img className="tide-cast wrasse" src={assets.napoleonWrasseHost} alt="" aria-hidden="true" />
      </div>
      <div className="snake-panel">
        <div className="snake-hud">
          <span>
            海光 <strong>{score}/{snakeTarget}</strong>
          </span>
          <span>
            命 <strong>{lives}/3</strong>
          </span>
          {invincibleUntil > performance.now() && (
            <span className="snake-invincible">
              <Sparkles size={13} />
              無敵
            </span>
          )}
        </div>
        <div
          className={`snake-board ${skipSnakeTransition ? 'no-snake-transition' : ''}`}
          ref={snakeBoardRef}
          style={{ '--snake-cols': snakeCols, '--snake-rows': snakeRows, '--snake-step-ms': `${snakeStepMs}ms` } as CSSProperties}
          onPointerDown={(event) => {
            touchStart.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => handleSwipeEnd(event.clientX, event.clientY)}
          onPointerCancel={() => {
            touchStart.current = null;
          }}
        >
          <span className="snake-food" style={{ left: `${((food.col + 0.5) / snakeCols) * 100}%`, top: `${((food.row + 0.5) / snakeRows) * 100}%` }} />
          {snake.map((cell, index) =>
            index === 0 ? (
              <img
                className={`snake-head face-${direction} ${invincibleUntil > performance.now() ? 'invincible' : ''}`}
                key="snake-head"
                src={assets.princeIcon}
                alt=""
                style={snakePositionStyle(cell)}
              />
            ) : (
              <span
                className="snake-segment"
                key={`snake-segment-${index}`}
                style={snakePositionStyle(cell, { opacity: clamp(1 - index * 0.025, 0.4, 0.92) })}
              />
            ),
          )}
          {obstacles.map((obstacle) => (
            <img
              className="snake-obstacle"
              key={obstacle.id}
              src={assets.bossStates.idle}
              alt=""
              style={{ left: `${((obstacle.col + 0.5) / snakeCols) * 100}%`, top: `${((obstacle.row + 0.5) / snakeRows) * 100}%` }}
            />
          ))}
          {powerup && (
            <img
              className="snake-powerup"
              src={assets.pickup}
              alt=""
              style={{ left: `${((powerup.col + 0.5) / snakeCols) * 100}%`, top: `${((powerup.row + 0.5) / snakeRows) * 100}%` }}
            />
          )}
          {wrapEffect && (
            <>
              <span className="snake-portal exit" key={`portal-exit-${wrapEffect.id}`} style={snakePositionStyle(wrapEffect.from)} />
              <span className="snake-portal entry" key={`portal-entry-${wrapEffect.id}`} style={snakePositionStyle(wrapEffect.to)} />
            </>
          )}
          <div className="snake-controls" aria-label="方向控制">
            <button className={direction === 'up' ? 'active' : ''} onClick={() => changeDirection('up')} aria-label="向上">
              <ChevronUp size={20} />
            </button>
            <button className={direction === 'left' ? 'active' : ''} onClick={() => changeDirection('left')} aria-label="向左">
              <ChevronLeft size={20} />
            </button>
            <button className={direction === 'right' ? 'active' : ''} onClick={() => changeDirection('right')} aria-label="向右">
              <ChevronRight size={20} />
            </button>
            <button className={direction === 'down' ? 'active' : ''} onClick={() => changeDirection('down')} aria-label="向下">
              <ChevronDown size={20} />
            </button>
          </div>
          {(status === 'won' || status === 'lost') && (
            <div className="snake-result">
              <strong>{status === 'won' ? '海潮路線完成' : '海潮迷失'}</strong>
              <button onClick={restart}>{status === 'won' ? '再跑一次' : '重新挑戰'}</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AbyssTowerGame({ onBack }: { onBack: () => void }) {
  const initialPlatforms = useMemo(() => createTowerPlatforms(), []);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  const nextPlatformId = useRef(20);
  const supportedPlatformId = useRef<number | null>(1);
  const draggingRef = useRef(false);
  const keysRef = useRef({ left: false, right: false });
  const targetXRef = useRef(towerPlayerStart.x);
  const playerRef = useRef<TowerPlayer>({ ...towerPlayerStart });
  const platformsRef = useRef<TowerPlatform[]>(initialPlatforms);
  const progressRef = useRef(0);
  const livesRef = useRef(3);
  const statusRef = useRef<TowerStatus>('ready');
  const hoverUntilRef = useRef(0);
  const invincibleUntilRef = useRef(0);
  const nextPowerupAt = useRef(12000);
  const nextMonsterAt = useRef(7000);
  const powerupRef = useRef<TowerPowerup | null>(null);
  const monstersRef = useRef<TowerMonster[]>([]);
  const [player, setPlayer] = useState<TowerPlayer>({ ...towerPlayerStart });
  const [platforms, setPlatforms] = useState<TowerPlatform[]>(() => initialPlatforms);
  const [powerup, setPowerup] = useState<TowerPowerup | null>(null);
  const [monsters, setMonsters] = useState<TowerMonster[]>([]);
  const [progress, setProgress] = useState(0);
  const [lives, setLives] = useState(3);
  const [status, setStatus] = useState<TowerStatus>('ready');
  const [hoverUntil, setHoverUntil] = useState(0);
  const [invincibleUntil, setInvincibleUntil] = useState(0);
  const [dialogue, setDialogue] = useState('王子啊，深淵不會等你準備好。');

  const syncRound = useCallback((nextProgress: number, nextLives: number, nextStatus: TowerStatus = 'ready') => {
    const nextPlatforms = createTowerPlatforms(nextProgress);
    const nextPlayer = { ...towerPlayerStart };
    platformsRef.current = nextPlatforms;
    playerRef.current = nextPlayer;
    targetXRef.current = nextPlayer.x;
    draggingRef.current = false;
    keysRef.current = { left: false, right: false };
    progressRef.current = nextProgress;
    livesRef.current = nextLives;
    statusRef.current = nextStatus;
    supportedPlatformId.current = 1;
    powerupRef.current = null;
    monstersRef.current = [];
    hoverUntilRef.current = 0;
    invincibleUntilRef.current = 0;
    nextPowerupAt.current = nextProgress + 12000;
    nextMonsterAt.current = nextProgress + 6500;
    lastTime.current = null;
    setPlatforms(nextPlatforms);
    setPlayer(nextPlayer);
    setProgress(nextProgress);
    setLives(nextLives);
    setStatus(nextStatus);
    setPowerup(null);
    setMonsters([]);
    setHoverUntil(0);
    setInvincibleUntil(0);
  }, []);

  const restart = useCallback(() => {
    syncRound(0, 3, 'ready');
    setDialogue('王子啊，深淵不會等你準備好。');
  }, [syncRound]);

  const startPlaying = useCallback(() => {
    if (statusRef.current !== 'ready') return;
    statusRef.current = 'playing';
    setStatus('playing');
    setDialogue('往下，別被塔頂尖刺追上。');
  }, []);

  const loseLife = useCallback(
    (reason: 'spike' | 'fall' | 'monster') => {
      if (statusRef.current !== 'playing') return;
      const nextLives = livesRef.current - 1;
      const nextProgress = Math.max(0, progressRef.current - towerDeathPenaltyMs);
      if (nextLives <= 0) {
        livesRef.current = 0;
        statusRef.current = 'lost';
        setLives(0);
        setStatus('lost');
        setDialogue(
          reason === 'spike' ? '塔頂尖刺合上了，王子被逼回深淵。' : reason === 'monster' ? '垃圾海葵堵住階梯，王子被拖進暗流。' : '沒有踏上平台，深淵吞掉了路線。',
        );
        return;
      }
      syncRound(nextProgress, nextLives, 'ready');
      setDialogue(reason === 'spike' ? '太慢了。重新找下一層，時間倒退15秒。' : reason === 'monster' ? '撞上海葵了。時間倒退15秒，等護盾再硬闖。' : '踩空了。時間倒退15秒，再下去一次。');
    },
    [syncRound],
  );

  const movePlayerTo = useCallback((clientX: number) => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;
    startPlaying();
    const requestedX = clamp(((clientX - rect.left) / rect.width) * 100, 6, 94);
    const currentX = playerRef.current.x;
    targetXRef.current = clamp(requestedX, currentX - 45, currentX + 45);
  }, [startPlaying]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        keysRef.current.left = true;
        startPlaying();
        event.preventDefault();
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        keysRef.current.right = true;
        startPlaying();
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keysRef.current.left = false;
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keysRef.current.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [startPlaying]);

  useEffect(() => {
    const tick = (time: number) => {
      const last = lastTime.current ?? time;
      const dt = Math.min(34, time - last);
      lastTime.current = time;

      if (statusRef.current === 'playing') {
        let nextProgressMs = Math.min(towerGoalMs, progressRef.current + dt);
        const difficulty = nextProgressMs / towerGoalMs;
        const scrollSpeed = 0.0084 + difficulty * 0.0056;
        const movingSpeed = 0.018 + difficulty * 0.012;
        let nextPlatforms = platformsRef.current
          .map((platform) => {
            const moved = { ...platform, y: platform.y - scrollSpeed * dt };
            if (moved.kind === 'moving') {
              moved.x += moved.dir * movingSpeed * dt;
              if (moved.x < 15 || moved.x > 85) {
                moved.x = clamp(moved.x, 15, 85);
                moved.dir *= -1;
              }
            }
            return moved;
          })
          .filter((platform) => platform.y > -8 && !platform.used);

        let bottomMost = nextPlatforms.reduce((max, platform) => Math.max(max, platform.y), 0);
        let lastX = nextPlatforms.reduce((lowest, platform) => (platform.y > lowest.y ? platform : lowest), nextPlatforms[0] ?? createTowerPlatform(0, 80, 50, nextProgressMs)).x;
        while (bottomMost < 116) {
          bottomMost += towerPlatformGap(nextProgressMs);
          lastX = nextTowerPlatformX(lastX, nextProgressMs);
          nextPlatforms.push(createTowerPlatform(nextPlatformId.current++, bottomMost, lastX, nextProgressMs));
        }

        let nextPlayer = { ...playerRef.current };
        const keyMove = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
        if (keyMove !== 0) {
          targetXRef.current = clamp(targetXRef.current + keyMove * dt * 0.058, 6, 94);
        }
        const maxPlayerMove = dt * 0.056;
        nextPlayer.x = clamp(nextPlayer.x + clamp(targetXRef.current - nextPlayer.x, -maxPlayerMove, maxPlayerMove), 6, 94);

        const supported = supportedPlatformId.current ? nextPlatforms.find((platform) => platform.id === supportedPlatformId.current) : null;
        const stillSupported = supported && Math.abs(nextPlayer.x - supported.x) <= supported.width / 2 + 5;
        if (stillSupported) {
          nextPlayer.y = supported.y - towerPlayerRadius;
          nextPlayer.vy = 0;
        } else {
          supportedPlatformId.current = null;
          const hovering = hoverUntilRef.current > time;
          nextPlayer.vy = Math.min(hovering ? 0.014 : 0.054, nextPlayer.vy + (hovering ? 0.000012 : 0.000052) * dt);
          const previousY = nextPlayer.y;
          nextPlayer.y += nextPlayer.vy * dt;
          const landed = nextPlatforms.find((platform) => {
            if (nextPlayer.vy < 0) return false;
            const previousFoot = previousY + towerPlayerRadius;
            const nextFoot = nextPlayer.y + towerPlayerRadius;
            const crossedTop = previousFoot <= platform.y + 2.2 && nextFoot >= platform.y - 2.8;
            const nearSurface = Math.abs(nextFoot - platform.y) <= 4.2;
            const insideWidth = Math.abs(nextPlayer.x - platform.x) <= platform.width / 2 + 5;
            return insideWidth && (crossedTop || nearSurface);
          });
          if (landed) {
            supportedPlatformId.current = landed.id;
            nextPlayer.y = landed.y - towerPlayerRadius;
            nextPlayer.vy = 0;
            if (landed.kind === 'fragile') {
              landed.used = true;
              setDialogue('裂縫平台碎了，別回頭。');
            } else if (landed.kind === 'poison') {
              nextProgressMs = Math.max(0, nextProgressMs - 4000);
              setDialogue('紫毒平台拖慢了時間。');
            }
          }
        }

        let nextPowerup = powerupRef.current ? { ...powerupRef.current, y: powerupRef.current.y - scrollSpeed * dt } : null;
        if (nextProgressMs >= nextPowerupAt.current && !nextPowerup) {
          nextPowerup = { id: nextPlatformId.current++, x: 18 + Math.random() * 64, y: 106 };
          nextPowerupAt.current = nextProgressMs + 15000 + Math.random() * 5000;
          setDialogue('懸浮泡泡出現了，吃到能短暫浮起，也能防海葵。');
        }
        if (nextPowerup && nextPowerup.y < -8) nextPowerup = null;
        if (nextPowerup && Math.hypot(nextPlayer.x - nextPowerup.x, nextPlayer.y - nextPowerup.y) < 7) {
          hoverUntilRef.current = time + 5000;
          invincibleUntilRef.current = time + 5000;
          setHoverUntil(hoverUntilRef.current);
          setInvincibleUntil(invincibleUntilRef.current);
          nextPowerup = null;
          setDialogue('懸浮泡泡啟動，5秒內下墜變慢，也能撞開海葵。');
        }
        if (hoverUntilRef.current && hoverUntilRef.current <= time) {
          hoverUntilRef.current = 0;
          setHoverUntil(0);
        }
        if (invincibleUntilRef.current && invincibleUntilRef.current <= time) {
          invincibleUntilRef.current = 0;
          setInvincibleUntil(0);
        }

        let nextMonsters = monstersRef.current
          .map((monster) => ({
            ...monster,
            x: clamp(monster.x + monster.drift * dt, 8, 92),
            y: monster.y - scrollSpeed * dt,
          }))
          .filter((monster) => monster.y > -8);
        if (nextProgressMs >= nextMonsterAt.current) {
          nextMonsters = [
            ...nextMonsters,
            {
              id: nextPlatformId.current++,
              x: 12 + Math.random() * 76,
              y: 106,
              drift: (Math.random() - 0.5) * 0.026,
            },
          ].slice(-4);
          nextMonsterAt.current = nextProgressMs + 5200 + Math.random() * 4600;
          setDialogue('垃圾海葵爬上階梯了，沒有護盾就別撞上。');
        }
        const hitMonster = nextMonsters.find((monster) => Math.hypot(nextPlayer.x - monster.x, nextPlayer.y - monster.y) < 6.7);
        if (hitMonster) {
          if (invincibleUntilRef.current > time) {
            nextMonsters = nextMonsters.filter((monster) => monster.id !== hitMonster.id);
            setDialogue('護盾光把海葵彈開了，繼續往下。');
          } else {
            monstersRef.current = nextMonsters;
            setMonsters(nextMonsters);
            loseLife('monster');
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
        }

        progressRef.current = nextProgressMs;
        playerRef.current = nextPlayer;
        platformsRef.current = nextPlatforms;
        powerupRef.current = nextPowerup;
        monstersRef.current = nextMonsters;
        setPlayer(nextPlayer);
        setPlatforms(nextPlatforms);
        setPowerup(nextPowerup);
        setMonsters(nextMonsters);
        setProgress(progressRef.current);

        if (progressRef.current >= towerGoalMs) {
          statusRef.current = 'won';
          setStatus('won');
          setDialogue('竟然真的下去了……有意思。');
        } else if (nextPlayer.y < 8.5) {
          loseLife('spike');
        } else if (nextPlayer.y > 104) {
          loseLife('fall');
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loseLife]);

  const seconds = Math.floor(progress / 1000);
  const hovering = hoverUntil > performance.now();
  const protectedByBubble = invincibleUntil > performance.now();

  return (
    <section className="screen tower-screen">
      <Header
        title="深淵高塔"
        onBack={onBack}
        action={
          <button onClick={restart} aria-label="重新開始">
            <RotateCcw size={20} />
          </button>
        }
      />
      <div className="tower-cast-panel">
        <img className="tower-host" src={assets.morayHost} alt="" aria-hidden="true" />
        <div className="tower-dialogue">
          <p>{dialogue}</p>
        </div>
      </div>
      <div
        className="tower-arena"
        ref={arenaRef}
        onPointerDown={(event) => {
          draggingRef.current = true;
          movePlayerTo(event.clientX);
        }}
        onPointerMove={(event) => {
          if (draggingRef.current) movePlayerTo(event.clientX);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
        onPointerLeave={() => {
          draggingRef.current = false;
        }}
      >
        <div className="tower-spikes" />
        <div className="tower-hud">
          <span>
            樓層 <strong>{seconds}/180</strong>
          </span>
          <span>
            命 <strong>{lives}/3</strong>
          </span>
          {(hovering || protectedByBubble) && (
            <span className="tower-hover">
              <Sparkles size={13} />
              懸浮護盾
            </span>
          )}
        </div>
        {platforms.map((platform) => (
          <span
            className={`tower-platform ${platform.kind}`}
            key={platform.id}
            style={{
              left: `${platform.x}%`,
              top: `${platform.y}%`,
              width: `${platform.width}%`,
              height: `${platform.height}px`,
            }}
          />
        ))}
        {powerup && <img className="tower-powerup" src={assets.pickup} alt="" style={{ left: `${powerup.x}%`, top: `${powerup.y}%` }} />}
        {monsters.map((monster) => (
          <img className="tower-monster" key={monster.id} src={assets.bossStates.idle} alt="" style={{ left: `${monster.x}%`, top: `${monster.y}%` }} />
        ))}
        <img className={`tower-player ${hovering ? 'hovering' : ''} ${protectedByBubble ? 'protected' : ''}`} src={assets.princeIcon} alt="" style={{ left: `${player.x}%`, top: `${player.y}%` }} />
        {status === 'ready' && (
          <div className="tower-ready">
            <strong>左右拖曳開始下樓</strong>
            <span>撐過180秒</span>
          </div>
        )}
        {(status === 'won' || status === 'lost') && (
          <div className="tower-result">
            <strong>{status === 'won' ? '逃出高塔' : '墜入深淵'}</strong>
            <button onClick={restart}>{status === 'won' ? '再下一次' : '重新挑戰'}</button>
          </div>
        )}
      </div>
    </section>
  );
}

function UnderseaCityGame({ onBack }: { onBack: () => void }) {
  const startingTiles = useMemo(() => createCityTiles(), []);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  const nextId = useRef(1);
  const spawnTimer = useRef(0);
  const playerRef = useRef({ ...cityPlayerStart, cooldown: 0 });
  const tilesRef = useRef<CityTile[]>(startingTiles);
  const enemiesRef = useRef<CityUnit[]>([]);
  const shotsRef = useRef<CityShot[]>([]);
  const powerupsRef = useRef<CityPowerup[]>([]);
  const keysRef = useRef({ up: false, down: false, left: false, right: false, fire: false });
  const [arenaSize, setArenaSize] = useState({ width: 0, height: 0 });
  const [tiles, setTiles] = useState<CityTile[]>(startingTiles);
  const [player, setPlayer] = useState({ ...cityPlayerStart });
  const [enemies, setEnemies] = useState<CityUnit[]>([]);
  const [shots, setShots] = useState<CityShot[]>([]);
  const [powerups, setPowerups] = useState<CityPowerup[]>([]);
  const [baseHp, setBaseHp] = useState(3);
  const [armor, setArmor] = useState(3);
  const [kills, setKills] = useState(0);
  const [status, setStatus] = useState<CityStatus>('playing');
  const [rapidUntil, setRapidUntil] = useState(0);
  const [shieldUntil, setShieldUntil] = useState(0);
  const [dialogue, setDialogue] = useState('左手移動，右手開炮。守住冰晶主堡，不要先把防線打穿。');
  const baseHpRef = useRef(3);
  const armorRef = useRef(3);
  const killsRef = useRef(0);
  const statusRef = useRef<CityStatus>('playing');
  const rapidUntilRef = useRef(0);
  const shieldUntilRef = useRef(0);

  const restart = useCallback(() => {
    const nextTiles = createCityTiles();
    playerRef.current = { ...cityPlayerStart, cooldown: 0 };
    tilesRef.current = nextTiles;
    enemiesRef.current = [];
    shotsRef.current = [];
    powerupsRef.current = [];
    keysRef.current = { up: false, down: false, left: false, right: false, fire: false };
    spawnTimer.current = 0;
    nextId.current = 1;
    lastTime.current = null;
    baseHpRef.current = 3;
    armorRef.current = 3;
    killsRef.current = 0;
    statusRef.current = 'playing';
    rapidUntilRef.current = 0;
    shieldUntilRef.current = 0;
    setTiles(nextTiles);
    setPlayer({ ...cityPlayerStart });
    setEnemies([]);
    setShots([]);
    setPowerups([]);
    setBaseHp(3);
    setArmor(3);
    setKills(0);
    setStatus('playing');
    setRapidUntil(0);
    setShieldUntil(0);
    setDialogue('左手移動，右手開炮。守住冰晶主堡，不要先把防線打穿。');
  }, []);

  useEffect(() => {
    const arena = arenaRef.current;
    if (!arena) return;
    const updateSize = () => {
      const rect = arena.getBoundingClientRect();
      setArenaSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(arena);
    return () => observer.disconnect();
  }, []);

  const setDirectionPressed = useCallback((direction: CityDirection, pressed: boolean) => {
    keysRef.current[direction] = pressed;
    if (pressed) {
      playerRef.current.dir = direction;
      setPlayer((current) => ({ ...current, dir: direction }));
    }
  }, []);

  const setFirePressed = useCallback((pressed: boolean) => {
    keysRef.current.fire = pressed;
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') setDirectionPressed('up', true);
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') setDirectionPressed('down', true);
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') setDirectionPressed('left', true);
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') setDirectionPressed('right', true);
      if (event.key === ' ' || event.key.toLowerCase() === 'j' || event.key.toLowerCase() === 'k') {
        setFirePressed(true);
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') setDirectionPressed('up', false);
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') setDirectionPressed('down', false);
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') setDirectionPressed('left', false);
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') setDirectionPressed('right', false);
      if (event.key === ' ' || event.key.toLowerCase() === 'j' || event.key.toLowerCase() === 'k') {
        setFirePressed(false);
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [setDirectionPressed, setFirePressed]);

  useEffect(() => {
    const tick = (time: number) => {
      const last = lastTime.current ?? time;
      const dt = Math.min(34, time - last);
      lastTime.current = time;

      if (statusRef.current === 'playing') {
        const currentTiles = tilesRef.current;
        const currentPlayer = { ...playerRef.current };
        const keyDir = keysRef.current.up ? 'up' : keysRef.current.down ? 'down' : keysRef.current.left ? 'left' : keysRef.current.right ? 'right' : null;
        if (keyDir) {
          currentPlayer.dir = keyDir;
          const moved = cityMoveUnit(currentPlayer, dt, 0.013 * cityTerrainSpeed(currentPlayer.x, currentPlayer.y, currentTiles), currentTiles);
          currentPlayer.x = moved.x;
          currentPlayer.y = moved.y;
        }
        currentPlayer.cooldown -= dt;
        const rapid = rapidUntilRef.current > time;
        if (keysRef.current.fire && currentPlayer.cooldown <= 0) {
          const vector = cityDirectionVector(currentPlayer.dir);
          const allyShot: CityShot = {
            id: nextId.current++,
            side: 'ally',
            x: currentPlayer.x + vector.x * cityCellSize * 0.62,
            y: currentPlayer.y + vector.y * cityCellSize * 0.62,
            vx: vector.x * 0.064,
            vy: vector.y * 0.064,
            dir: currentPlayer.dir,
          };
          shotsRef.current = [
            ...shotsRef.current,
            allyShot,
          ].slice(-20);
          currentPlayer.cooldown = rapid ? 280 : 520;
        }

        spawnTimer.current += dt;
        let nextEnemies = enemiesRef.current.map((enemy) => ({ ...enemy }));
        if (spawnTimer.current >= 1550 && nextEnemies.length < 7 && killsRef.current + nextEnemies.length < 20) {
          spawnTimer.current = 0;
          nextEnemies.push(createCityEnemy(nextId.current++));
          setDialogue('機甲烏賊從城市邊緣潛入。利用牆面擋線，海草可以藏身。');
        }

        const enemyShots: CityShot[] = [];
        nextEnemies = nextEnemies.map((enemy) => {
          const nextEnemy = { ...enemy };
          nextEnemy.turnTimer -= dt;
          const toBaseX = cityBase.x - nextEnemy.x;
          const toBaseY = cityBase.y - nextEnemy.y;
          if (nextEnemy.turnTimer <= 0) {
            nextEnemy.turnTimer = 420 + Math.random() * 900;
            if (Math.random() < 0.7) {
              nextEnemy.dir = Math.abs(toBaseX) > Math.abs(toBaseY) ? (toBaseX > 0 ? 'right' : 'left') : toBaseY > 0 ? 'down' : 'up';
            } else {
              nextEnemy.dir = (['up', 'down', 'left', 'right'] as CityDirection[])[Math.floor(Math.random() * 4)];
            }
          }
          const moved = cityMoveUnit(nextEnemy, dt, nextEnemy.speed * cityTerrainSpeed(nextEnemy.x, nextEnemy.y, currentTiles), currentTiles);
          if (moved.blocked) {
            nextEnemy.dir = Math.abs(toBaseX) > Math.abs(toBaseY) ? (toBaseY > 0 ? 'down' : 'up') : toBaseX > 0 ? 'right' : 'left';
          } else {
            nextEnemy.x = moved.x;
            nextEnemy.y = moved.y;
          }
          nextEnemy.cooldown -= dt;
          if (nextEnemy.cooldown <= 0) {
            const aimAtBase = Math.random() < 0.62;
            if (aimAtBase) {
              nextEnemy.dir = Math.abs(toBaseX) > Math.abs(toBaseY) ? (toBaseX > 0 ? 'right' : 'left') : toBaseY > 0 ? 'down' : 'up';
            }
            const vector = cityDirectionVector(nextEnemy.dir);
            enemyShots.push({
              id: nextId.current++,
              side: 'enemy',
              x: nextEnemy.x + vector.x * cityCellSize * 0.62,
              y: nextEnemy.y + vector.y * cityCellSize * 0.62,
              vx: vector.x * 0.045,
              vy: vector.y * 0.045,
              dir: nextEnemy.dir,
            });
            nextEnemy.cooldown = 1050 + Math.random() * 700;
          }
          return nextEnemy;
        });

        let nextArmor = armorRef.current;
        let nextBaseHp = baseHpRef.current;
        let nextKills = killsRef.current;
        let nextPowerups = powerupsRef.current.filter((powerup) => powerup.expiresAt > time);
        let nextTiles = currentTiles;
        let tilesChanged = false;
        const nextShots: CityShot[] = [];
        [...shotsRef.current, ...enemyShots].forEach((shot) => {
          const moved = { ...shot, x: shot.x + shot.vx * dt, y: shot.y + shot.vy * dt };
          if (moved.x < 0 || moved.x > 100 || moved.y < 0 || moved.y > 100) return;
          const wallHitIndex = nextTiles.findIndex((tile) => cityTileBlocks(tile) && cityIntersectsRect(moved.x, moved.y, cityCellSize * 0.38, tile));
          if (wallHitIndex >= 0) {
            const tile = nextTiles[wallHitIndex];
            if (cityTileBreaks(tile)) {
              if (!tilesChanged) nextTiles = [...nextTiles];
              const nextHp = (tile.hp ?? 1) - 1;
              if (nextHp <= 0) {
                nextTiles.splice(wallHitIndex, 1);
              } else {
                nextTiles[wallHitIndex] = { ...tile, hp: nextHp };
              }
              tilesChanged = true;
            }
            return;
          }

          if (moved.side === 'ally') {
            const target = nextEnemies.find((enemy) => Math.hypot(enemy.x - moved.x, enemy.y - moved.y) < cityUnitSize * 0.62);
            if (target) {
              target.hp -= 1;
              if (target.hp <= 0) {
                nextKills += 1;
                if (Math.random() < 0.28) {
                  const kinds: CityPowerupKind[] = ['speed', 'shield', 'armor', 'fortify'];
                  nextPowerups = [
                    ...nextPowerups,
                    {
                      id: nextId.current++,
                      kind: kinds[Math.floor(Math.random() * kinds.length)],
                      x: target.x,
                      y: target.y,
                      expiresAt: time + 9000,
                    },
                  ].slice(-4);
                }
              }
              return;
            }
          } else {
            const protectedPlayer = shieldUntilRef.current > time;
            if (Math.hypot(currentPlayer.x - moved.x, currentPlayer.y - moved.y) < cityUnitSize * 0.62) {
              if (!protectedPlayer) {
                nextArmor -= 1;
                shieldUntilRef.current = time + 900;
                setShieldUntil(time + 900);
                setDialogue('銀背突擊兵中彈，裝甲下降。');
              }
              return;
            }
            if (cityIntersectsRect(moved.x, moved.y, cityCellSize * 0.45, { x: cityBase.x - cityBase.size / 2, y: cityBase.y - cityBase.size / 2, size: cityBase.size })) {
              nextBaseHp -= 1;
              setDialogue('冰晶主陣地被擊中，快回防。');
              return;
            }
          }
          nextShots.push(moved);
        });

        nextEnemies = nextEnemies.filter((enemy) => enemy.hp > 0);
        nextPowerups = nextPowerups.filter((powerup) => {
          if (Math.hypot(currentPlayer.x - powerup.x, currentPlayer.y - powerup.y) >= cityCellSize * 1.08) return true;
          if (powerup.kind === 'speed') {
            rapidUntilRef.current = time + 7000;
            setRapidUntil(time + 7000);
            setDialogue('攻速核心啟動，短時間火力提升。');
          }
          if (powerup.kind === 'shield') {
            shieldUntilRef.current = time + 6000;
            setShieldUntil(time + 6000);
            setDialogue('海光護盾展開，短時間無敵。');
          }
          if (powerup.kind === 'armor') {
            nextArmor = Math.min(5, nextArmor + 1);
            setDialogue('裝甲補強，銀背突擊兵撐住了。');
          }
          if (powerup.kind === 'fortify') {
            nextBaseHp = Math.min(5, nextBaseHp + 1);
            setDialogue('冰晶主堡加固，防線多撐一層。');
          }
          return false;
        });

        playerRef.current = currentPlayer;
        enemiesRef.current = nextEnemies;
        shotsRef.current = nextShots.slice(-36);
        powerupsRef.current = nextPowerups;
        armorRef.current = nextArmor;
        baseHpRef.current = nextBaseHp;
        killsRef.current = nextKills;
        if (tilesChanged) {
          tilesRef.current = nextTiles;
          setTiles(nextTiles);
        }
        setPlayer({ x: currentPlayer.x, y: currentPlayer.y, dir: currentPlayer.dir });
        setEnemies(nextEnemies);
        setShots(shotsRef.current);
        setPowerups(nextPowerups);
        setArmor(nextArmor);
        setBaseHp(nextBaseHp);
        setKills(nextKills);

        if (nextBaseHp <= 0 || nextArmor <= 0) {
          statusRef.current = 'lost';
          setStatus('lost');
          setDialogue(nextBaseHp <= 0 ? '冰晶主陣地失守，海底城市防線崩開。' : '銀背突擊兵裝甲破裂，防衛失敗。');
        } else if (nextKills >= 20) {
          statusRef.current = 'won';
          setStatus('won');
          setDialogue('機甲烏賊部隊撤退，海底城市暫時守住了。');
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const cityCellPx = Math.max(18, Math.floor(Math.min((arenaSize.width || 360) / cityViewCols, (arenaSize.height || 520) / cityViewRows)));
  const cityViewportWidthPx = cityCellPx * cityViewCols;
  const cityViewportHeightPx = cityCellPx * cityViewRows;
  const cityWorldPx = cityCellPx * cityGridSize;
  const camera = {
    x: clamp(player.x - cityViewWidth / 2, 0, 100 - cityViewWidth),
    y: clamp(player.y - cityViewHeight / 2, 0, 100 - cityViewHeight),
  };
  const viewportStyle: CSSProperties = {
    width: `${cityViewportWidthPx}px`,
    height: `${cityViewportHeightPx}px`,
    ['--city-cell-px' as string]: `${cityCellPx}px`,
  };
  const worldTransform: CSSProperties = {
    width: `${cityWorldPx}px`,
    height: `${cityWorldPx}px`,
    transform: `translate(${-(camera.x / cityCellSize) * cityCellPx}px, ${-(camera.y / cityCellSize) * cityCellPx}px)`,
    ['--city-unit-size' as string]: `${cityUnitVisualSize}%`,
    ['--city-shot-size' as string]: `${cityCellSize * 0.34}%`,
    ['--city-powerup-size' as string]: `${cityCellSize * 0.76}%`,
  };
  const playerHidden = citySeaweedCover(player.x, player.y, tiles);
  const shielded = shieldUntil > performance.now();
  const rapid = rapidUntil > performance.now();

  return (
    <section className="screen city-screen">
      <Header
        title="海底城市"
        onBack={onBack}
        action={
          <button onClick={restart} aria-label="重新開始">
            <RotateCcw size={20} />
          </button>
        }
      />
      <div className="city-dialogue">
        <p>{dialogue}</p>
      </div>
      <div className="city-arena" ref={arenaRef}>
        <div className="city-viewport" style={viewportStyle}>
          <div className="city-world" style={worldTransform}>
            {tiles.map((tile) => (
              <span
                className={`city-tile ${tile.kind} hp-${tile.hp ?? 0}`}
                key={tile.id}
                style={{ left: `${tile.x}%`, top: `${tile.y}%`, width: `${tile.size}%`, height: `${tile.size}%` }}
              />
            ))}
            <div className="city-base" style={{ left: `${cityBase.x}%`, top: `${cityBase.y}%`, width: `${cityBase.size}%`, height: `${cityBase.size}%`, ['--base-hp' as string]: baseHp }}>
              <img src={assets.cityUnits.base} alt="" />
            </div>
            {powerups.map((powerup) => (
              <img className={`city-powerup ${powerup.kind}`} src={assets.pickup} alt="" key={powerup.id} style={{ left: `${powerup.x}%`, top: `${powerup.y}%` }} />
            ))}
            {enemies.map((enemy) => (
              <div className={`city-unit enemy dir-${enemy.dir} ${citySeaweedCover(enemy.x, enemy.y, tiles) ? 'hidden' : ''}`} key={enemy.id} style={{ left: `${enemy.x}%`, top: `${enemy.y}%` }}>
                <img src={assets.cityUnits.enemy[enemy.dir]} alt="" />
                <i style={{ width: `${enemy.hp * 50}%` }} />
              </div>
            ))}
            <div className={`city-unit player dir-${player.dir} ${playerHidden ? 'hidden' : ''} ${shielded ? 'shielded' : ''} ${rapid ? 'rapid' : ''}`} style={{ left: `${player.x}%`, top: `${player.y}%` }}>
              <img src={assets.cityUnits.player[player.dir]} alt="" />
            </div>
            {shots.map((shot) => (
              <span className={`city-shot ${shot.side} dir-${shot.dir}`} key={shot.id} style={{ left: `${shot.x}%`, top: `${shot.y}%` }} />
            ))}
            {tiles.filter((tile) => tile.kind === 'seaweed').map((tile) => (
              <span className="city-seaweed-cover" key={`cover-${tile.id}`} style={{ left: `${tile.x}%`, top: `${tile.y}%`, width: `${tile.size}%`, height: `${tile.size}%` }} />
            ))}
          </div>
          <div className="city-hud">
            <span>主堡 {baseHp}/5</span>
            <span>裝甲 {armor}/5</span>
            <span>擊破 {kills}/20</span>
          </div>
          <div className="city-minimap">
            <span className="view" style={{ left: `${camera.x}%`, top: `${camera.y}%`, width: `${cityViewWidth}%`, height: `${cityViewHeight}%` }} />
            <span className="base" style={{ left: `${cityBase.x}%`, top: `${cityBase.y}%` }} />
            <span className="player" style={{ left: `${player.x}%`, top: `${player.y}%` }} />
            {enemies.map((enemy) => (
              <span className="enemy" key={`mini-${enemy.id}`} style={{ left: `${enemy.x}%`, top: `${enemy.y}%` }} />
            ))}
          </div>
          <div className="city-controls" aria-label="方向控制">
            <button onPointerDown={() => setDirectionPressed('up', true)} onPointerUp={() => setDirectionPressed('up', false)} onPointerCancel={() => setDirectionPressed('up', false)} onPointerLeave={() => setDirectionPressed('up', false)} aria-label="向上">
              <ChevronUp size={20} />
            </button>
            <button onPointerDown={() => setDirectionPressed('left', true)} onPointerUp={() => setDirectionPressed('left', false)} onPointerCancel={() => setDirectionPressed('left', false)} onPointerLeave={() => setDirectionPressed('left', false)} aria-label="向左">
              <ChevronLeft size={20} />
            </button>
            <button onPointerDown={() => setDirectionPressed('right', true)} onPointerUp={() => setDirectionPressed('right', false)} onPointerCancel={() => setDirectionPressed('right', false)} onPointerLeave={() => setDirectionPressed('right', false)} aria-label="向右">
              <ChevronRight size={20} />
            </button>
            <button onPointerDown={() => setDirectionPressed('down', true)} onPointerUp={() => setDirectionPressed('down', false)} onPointerCancel={() => setDirectionPressed('down', false)} onPointerLeave={() => setDirectionPressed('down', false)} aria-label="向下">
              <ChevronDown size={20} />
            </button>
          </div>
          <button
            className="city-fire-control"
            onPointerDown={() => setFirePressed(true)}
            onPointerUp={() => setFirePressed(false)}
            onPointerCancel={() => setFirePressed(false)}
            onPointerLeave={() => setFirePressed(false)}
            aria-label="攻擊"
          >
            <Swords size={24} />
          </button>
          {status !== 'playing' && (
            <div className="city-result">
              <strong>{status === 'won' ? '城市守住' : '防線失守'}</strong>
              <button onClick={restart}>{status === 'won' ? '再守一次' : '重新布防'}</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CharacterGallery({ onBack }: { onBack: () => void }) {
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToCharacter = useCallback((nextIndex: number) => {
    const index = clamp(nextIndex, 0, characters.length - 1);
    setActiveIndex(index);
    const card = galleryRef.current?.children.item(index);
    if (card instanceof HTMLElement) {
      card.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, []);

  const handleGalleryScroll = useCallback(() => {
    const list = galleryRef.current;
    if (!list) return;
    const index = Math.round(list.scrollTop / Math.max(1, list.clientHeight));
    setActiveIndex(clamp(index, 0, characters.length - 1));
  }, []);

  return (
    <section className="screen gallery-screen">
      <Header title="角色圖鑑" onBack={onBack} />
      <div className="gallery-list" ref={galleryRef} onScroll={handleGalleryScroll}>
        {characters.map((character) => (
          <article className="character-card" key={character.id} aria-label={`${character.name}，${character.role}`}>
            <img src={character.poster} alt={`${character.name}角色海報`} />
          </article>
        ))}
      </div>
      <div className="gallery-controls">
        <button className="gallery-step" onClick={() => scrollToCharacter(activeIndex - 1)} disabled={activeIndex === 0} aria-label="上一位角色">
          <ChevronUp size={20} />
        </button>
        <span className="gallery-count">
          {activeIndex + 1}/{characters.length}
        </span>
        <button
          className="gallery-step"
          onClick={() => scrollToCharacter(activeIndex + 1)}
          disabled={activeIndex === characters.length - 1}
          aria-label="下一位角色"
        >
          <ChevronDown size={20} />
        </button>
      </div>
    </section>
  );
}

function VideoLeadIn({ leadIn, onComplete }: { leadIn: VideoLeadInConfig; onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }, [leadIn.src]);

  return (
    <section className="screen video-screen">
      <div className="video-copy">
        <span>{leadIn.eyebrow}</span>
        <h2>{leadIn.title}</h2>
      </div>
      <video
        ref={videoRef}
        src={leadIn.src}
        className="lead-video"
        playsInline
        controls
        preload="metadata"
        onEnded={onComplete}
      />
      <div className="video-actions">
        <button onClick={() => videoRef.current?.play()}>
          <Play size={18} />
          看影片
        </button>
        <button className="primary-action" onClick={onComplete}>
          {leadIn.actionLabel}
        </button>
      </div>
    </section>
  );
}

function CombatStage({ onVictory, onExit }: { onVictory: () => void; onExit: () => void }) {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const nextId = useRef(1);
  const attackTimer = useRef(0);
  const bossTimer = useRef(0);
  const pickupTimer = useRef(1200);
  const minionTimer = useRef(900);
  const cutinTimer = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  const hitFlashTimer = useRef<number | null>(null);
  const playerRef = useRef({ x: 50, y: 78 });
  const bossPosRef = useRef({ x: 50, y: 15 });
  const minionsRef = useRef<Minion[]>([]);
  const keysRef = useRef({ left: false, right: false, up: false, down: false });
  const facingRef = useRef(1);

  const [player, setPlayer] = useState({ x: 50, y: 78 });
  const [bossPos, setBossPos] = useState({ x: 50, y: 15 });
  const [bossHp, setBossHp] = useState(bossMaxHp);
  const [playerHp, setPlayerHp] = useState(100);
  const [special, setSpecial] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [cutin, setCutin] = useState<Cutin>(null);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [slashes, setSlashes] = useState<SlashWave[]>([]);
  const [minions, setMinions] = useState<Minion[]>([]);
  const [bossState, setBossState] = useState<'idle' | 'sweep' | 'core' | 'hit'>('idle');
  const [hitFlash, setHitFlash] = useState(false);
  const [defeated, setDefeated] = useState(false);

  const level = useMemo(() => levelFromEnergy(energy), [energy]);

  const spawnPickup = useCallback((time = performance.now()) => {
    setPickups((items) => [
      ...items.slice(-4),
      {
        id: nextId.current++,
        x: 16 + Math.random() * 68,
        y: 58 + Math.random() * 18,
        expiresAt: time + 6500,
      },
    ]);
  }, []);

  const spawnMinion = useCallback(() => {
    setMinions((items) => {
              if (items.length >= 6) return items;
      return [
        ...items,
        {
          id: nextId.current++,
          x: 12 + Math.random() * 76,
          y: 25 + Math.random() * 6,
          vx: (Math.random() - 0.5) * 0.34,
          vy: 0.58 + Math.random() * 0.28,
          spin: Math.random() > 0.5 ? 1 : -1,
        },
      ];
    });
  }, []);

  const triggerBossCutin = useCallback((type: 'sweep' | 'core') => {
    setCutin({
      title: type === 'sweep' ? '紫觸橫掃' : '毒潮聚核',
      image: type === 'sweep' ? assets.bossSweepCutin : assets.bossCoreCutin,
      kind: 'boss',
    });
    setBossState(type);
    cutinTimer.current = type === 'sweep' ? 850 : 1000;
  }, []);

  const runSpecial = useCallback(() => {
    if (special < 100 || cutin || defeated) return;
    setSpecial(0);
    setCutin({ title: `破芯金斬 LV${level}`, image: assets.heroCutin, kind: 'hero' });
    cutinTimer.current = 850;
    window.setTimeout(() => {
      setBossHp((hp) => Math.max(0, hp - (48 + level * 12)));
      setMinions([]);
      setBossState('hit');
      window.setTimeout(() => setBossState('idle'), 320);
    }, 850);
  }, [cutin, defeated, level, special]);

  const handlePointer = useCallback((clientX: number, clientY: number) => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect || cutin || defeated) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    const next = { x: clamp(x, 8, 92), y: clamp(y, 56, 84) };
    playerRef.current = next;
    setPlayer(next);
  }, [cutin, defeated]);

  const flashBossHit = useCallback(() => {
    setHitFlash(true);
    if (hitFlashTimer.current) window.clearTimeout(hitFlashTimer.current);
    hitFlashTimer.current = window.setTimeout(() => {
      setHitFlash(false);
      hitFlashTimer.current = null;
    }, 130);
  }, []);

  const dodge = useCallback(() => {
    const next = { ...playerRef.current, x: clamp(playerRef.current.x + 12 * facingRef.current, 8, 92) };
    playerRef.current = next;
    setPlayer(next);
  }, []);

  const respawn = useCallback(() => {
    const dropped = Math.floor(energy * 0.5);
    setEnergy((value) => Math.ceil(value * 0.5));
    for (let i = 0; i < Math.min(6, Math.ceil(dropped / 8)); i += 1) {
      spawnPickup();
    }
    setPlayerHp(60);
    setDefeated(false);
  }, [energy, spawnPickup]);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    minionsRef.current = minions;
  }, [minions]);

  useEffect(() => {
    return () => {
      if (hitFlashTimer.current) window.clearTimeout(hitFlashTimer.current);
    };
  }, []);

  useEffect(() => {
    const setKey = (event: KeyboardEvent, pressed: boolean) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        keysRef.current.left = pressed;
        if (pressed) facingRef.current = -1;
        event.preventDefault();
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        keysRef.current.right = pressed;
        if (pressed) facingRef.current = 1;
        event.preventDefault();
      }
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        keysRef.current.up = pressed;
        event.preventDefault();
      }
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        keysRef.current.down = pressed;
        event.preventDefault();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      setKey(event, true);
      if (event.key.toLowerCase() === 'k') dodge();
      if (event.key.toLowerCase() === 'l') runSpecial();
    };

    const onKeyUp = (event: KeyboardEvent) => setKey(event, false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [dodge, runSpecial]);

  useEffect(() => {
    if (bossHp <= 0) {
      window.setTimeout(onVictory, 650);
    }
  }, [bossHp, onVictory]);

  useEffect(() => {
    const tick = (time: number) => {
      const last = lastTime.current ?? time;
      const dt = Math.min(48, time - last);
      lastTime.current = time;

      if (!defeated && bossHp > 0) {
        const nextBossPos = {
          x: 50 + Math.sin(time * 0.00072) * 19 + Math.sin(time * 0.00135) * 5,
          y: 14 + Math.sin(time * 0.00092 + 1.6) * 4,
        };
        bossPosRef.current = nextBossPos;
        setBossPos(nextBossPos);

        if (cutinTimer.current > 0) {
          cutinTimer.current -= dt;
          if (cutinTimer.current <= 0) {
            setCutin(null);
            if (bossState === 'sweep') {
              const origin = bossPosRef.current;
              setBullets((items) => [
                ...items,
                ...Array.from({ length: 9 }, (_, index) => ({
                  id: nextId.current++,
                  x: origin.x - 30 + index * 7.5,
                  y: origin.y + 20,
                  vx: (index - 4) * 0.06,
                  vy: 0.4 + Math.abs(index - 4) * 0.015,
                  size: 1.45,
                  kind: 'sweep' as const,
                })),
              ]);
            }
            if (bossState === 'core') {
              const origin = bossPosRef.current;
              setBullets((items) => [
                ...items,
                ...Array.from({ length: 22 }, (_, index) => {
                  const ring = index % 2 === 0 ? 1 : 0.62;
                  const angle = (Math.PI * 2 * index) / 22;
                  return {
                    id: nextId.current++,
                    x: origin.x,
                    y: origin.y + 18,
                    vx: Math.cos(angle) * 0.48 * ring,
                    vy: Math.sin(angle) * 0.26 * ring + 0.35,
                    size: index % 2 === 0 ? 1.45 : 0.92,
                    kind: 'core' as const,
                  };
                }),
              ]);
            }
            setBossState('idle');
          }
        } else {
          attackTimer.current += dt;
          bossTimer.current += dt;
          pickupTimer.current += dt;
          minionTimer.current += dt;

          const keys = keysRef.current;
          const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
          const dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
          if (dx !== 0 || dy !== 0) {
            const length = Math.hypot(dx, dy) || 1;
            const speed = 0.028 * dt;
            const next = {
              x: clamp(playerRef.current.x + (dx / length) * speed, 8, 92),
              y: clamp(playerRef.current.y + (dy / length) * speed, 56, 84),
            };
            playerRef.current = next;
            setPlayer(next);
          }

          if (attackTimer.current >= Math.max(160, 520 - level * 55)) {
            attackTimer.current = 0;
            setSlashes((items) => [
              ...items.slice(-4),
              {
                id: nextId.current++,
                x: playerRef.current.x,
                y: playerRef.current.y - 5.5,
                level,
              },
            ]);
            const targetableMinions = minionsRef.current.filter((minion) => Math.abs(minion.x - playerRef.current.x) < 13);
            if (targetableMinions.length > 0) {
              setMinions((items) => {
                let targetId = targetableMinions[0].id;
                let targetScore = Number.POSITIVE_INFINITY;
                targetableMinions.forEach((minion) => {
                  const score = Math.abs(minion.x - playerRef.current.x) * 1.4 + Math.abs(minion.y - 49);
                  if (score < targetScore) {
                    targetScore = score;
                    targetId = minion.id;
                  }
                });
                return items.filter((minion) => minion.id !== targetId);
              });
            } else {
              setBossHp((hp) => Math.max(0, hp - (7 + level * 2)));
            }
            flashBossHit();
            setSpecial((value) => clamp(value + 4 + level, 0, 100));
          }

          if (pickupTimer.current >= 2600) {
            pickupTimer.current = 0;
            setPickups((items) => {
              if (items.length >= 3) return items;
              return [
                ...items,
                {
                  id: nextId.current++,
                  x: 16 + Math.random() * 68,
                  y: 58 + Math.random() * 18,
                  expiresAt: time + 6500,
                },
              ];
            });
          }

          if (minionTimer.current >= 1250) {
            minionTimer.current = 0;
            spawnMinion();
          }

          if (bossTimer.current > 10500) {
            bossTimer.current = 0;
            triggerBossCutin(Math.random() > 0.5 ? 'sweep' : 'core');
          }
        }

        setBullets((items) => {
          const playerPos = playerRef.current;
          let hit = false;
          const next = items
            .map((bullet) => ({
              ...bullet,
              x: bullet.x + bullet.vx * dt * 0.055,
              y: bullet.y + bullet.vy * dt * 0.055,
            }))
            .filter((bullet) => {
              const dx = bullet.x - playerPos.x;
              const dy = bullet.y - playerPos.y;
              const collided = Math.hypot(dx, dy) < bullet.size + 2.25;
              if (collided) hit = true;
              return !collided && bullet.y < 87 && bullet.x > -8 && bullet.x < 108;
            });
          if (hit) {
            setPlayerHp((hp) => {
              const value = Math.max(0, hp - 12);
              if (value <= 0) setDefeated(true);
              return value;
            });
          }
          return next;
        });

        setMinions((items) => {
          const playerPos = playerRef.current;
          let hit = false;
          const next = items
            .map((minion) => ({
              ...minion,
              x: minion.x + Math.sin(time * 0.004 + minion.id) * 0.035 * dt + minion.vx * dt * 0.045,
              y: minion.y + minion.vy * dt * 0.045,
            }))
            .filter((minion) => {
              const collided = Math.hypot(minion.x - playerPos.x, minion.y - playerPos.y) < 6.2;
              if (collided) hit = true;
              return !collided && minion.y < 90 && minion.x > -8 && minion.x < 108;
            });
          if (hit) {
            setPlayerHp((hp) => {
              const value = Math.max(0, hp - 16);
              if (value <= 0) setDefeated(true);
              return value;
            });
          }
          return next;
        });

        setPickups((items) => {
          const playerPos = playerRef.current;
          let gained = 0;
          const next = items.filter((pickup) => {
            const dist = Math.hypot(pickup.x - playerPos.x, pickup.y - playerPos.y);
            if (dist < 7) {
              gained += 4;
              setSpecial((value) => clamp(value + 3, 0, 100));
              return false;
            }
            return time < pickup.expiresAt;
          });
          if (gained) setEnergy((value) => clamp(value + gained, 0, 90));
          return next;
        });

        setSlashes((items) => items.slice(-5));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [bossHp, bossState, defeated, flashBossHit, level, onVictory, spawnMinion, spawnPickup, triggerBossCutin]);

  const bossPercent = (bossHp / bossMaxHp) * 100;

  return (
    <section className="screen combat-screen">
      <div
        className="arena"
        ref={arenaRef}
        onPointerDown={(event) => handlePointer(event.clientX, event.clientY)}
        onPointerMove={(event) => {
          if (event.buttons > 0) handlePointer(event.clientX, event.clientY);
        }}
      >
        <img src={assets.stageBg} alt="" className="arena-bg" />
        <div className="combat-hud top">
          <button className="icon-button" onClick={onExit} aria-label="返回">
            <ChevronLeft size={20} />
          </button>
          <div className="boss-hp">
            <span>巨大垃圾海葵</span>
            <div>
              <i style={{ width: `${bossPercent}%` }} />
            </div>
          </div>
        </div>

        <img
          className={`boss-sprite ${bossState} ${hitFlash ? 'hit-flash' : ''}`}
          src={assets.bossStates[bossState]}
          alt="巨大垃圾海葵"
          style={{ left: `${bossPos.x}%`, top: `${bossPos.y}%` }}
        />

        {slashes.map((slash) => (
          slashLanesForLevel(slash.level).map((lane) => (
            <span
              className={`slash-wave level-${slash.level} ${lane < 0 ? 'lane-left' : lane > 0 ? 'lane-right' : 'lane-center'}`}
              key={`${slash.id}-${lane}`}
              style={{
                left: `${slash.x + lane * (2.1 + slash.level * 0.28)}%`,
                top: `${slash.y}%`,
                ['--slash-level' as string]: slash.level,
                ['--slash-end-x' as string]: `${bossPos.x + lane * 3.2}%`,
                ['--slash-end-y' as string]: `${bossPos.y + 22}%`,
              }}
            />
          ))
        ))}

        {minions.map((minion) => (
          <img
            className="minion"
            src={assets.bossStates.idle}
            alt=""
            key={minion.id}
            style={{
              left: `${minion.x}%`,
              top: `${minion.y}%`,
              ['--minion-spin' as string]: minion.spin,
            }}
          />
        ))}

        {bullets.map((bullet) => (
          <span
            className={`enemy-bullet ${bullet.kind}`}
            key={bullet.id}
            style={{ left: `${bullet.x}%`, top: `${bullet.y}%`, width: `${bullet.size * 2}%`, height: `${bullet.size * 2}%` }}
          />
        ))}
        {pickups.map((pickup) => (
          <img className="pickup" src={assets.pickup} alt="" key={pickup.id} style={{ left: `${pickup.x}%`, top: `${pickup.y}%` }} />
        ))}

        <div className="player-token" style={{ left: `${player.x}%`, top: `${player.y}%` }}>
          <img src={assets.heroPortrait} alt="雙帶武士" />
        </div>

        <div className="combat-hud bottom">
          <div className="stat-card">
            <span>HP</span>
            <div className="mini-bar hp">
              <i style={{ width: `${playerHp}%` }} />
            </div>
          </div>
          <div className="stat-card">
            <span>LV{level}</span>
            <div className="mini-bar energy">
              <i style={{ width: `${Math.min(100, (energy / 70) * 100)}%` }} />
            </div>
          </div>
          <button className="round-control" onClick={dodge} disabled={!!cutin || defeated}>
            <Zap size={20} />
          </button>
          <button className="special-control" onClick={runSpecial} disabled={special < 100 || !!cutin || defeated}>
            <Sparkles size={18} />
            {Math.round(special)}
          </button>
        </div>

        {cutin && (
          <div className={`cutin ${cutin.kind}`}>
            <img src={cutin.image} alt="" />
            <div className="cutin-label">
              <span>{cutin.kind === 'hero' ? 'SPECIAL' : 'WARNING'}</span>
              <strong>{cutin.title}</strong>
            </div>
          </div>
        )}

        {defeated && (
          <div className="result-panel">
            <h2>戰線崩解</h2>
            <p>海光能量散落了一半，立刻收回來還有機會。</p>
            <button className="primary-action" onClick={respawn}>
              <RotateCcw size={18} />
              復歸戰場
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function VictoryCard({ onMap, onReplay }: { onMap: () => void; onReplay: () => void }) {
  return (
    <section className="screen victory-screen">
      <img src={assets.sharkStatue} alt="" className="victory-art" />
      <div className="victory-panel">
        <span>劇情卡解鎖</span>
        <h2>食人鯊戰神石像</h2>
        <p>雙帶武士斬開巨葵核心後，通往古老石像的道路終於露出。戰場恢復短暫清明，但真正的突破，才剛開始。</p>
        <div className="row-actions">
          <button onClick={onReplay}>
            <Swords size={18} />
            再戰一次
          </button>
          <button className="primary-action" onClick={onMap}>
            <Gem size={18} />
            返回地圖
          </button>
        </div>
      </div>
    </section>
  );
}

function Header({
  title,
  onBack,
  eyebrow,
  subtitle,
  action,
}: {
  title: string;
  onBack: () => void;
  eyebrow?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="screen-header">
      <button className="icon-button" onClick={onBack} aria-label="返回">
        <ChevronLeft size={20} />
      </button>
      <div className="screen-title-block">
        <h1>{title}</h1>
        {eyebrow && <span>{eyebrow}</span>}
        {subtitle && <strong>{subtitle}</strong>}
      </div>
      {action && <div className="screen-header-action">{action}</div>}
    </header>
  );
}

