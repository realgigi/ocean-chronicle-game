import { type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Flag, Gem, Home, Play, RotateCcw, Search, Settings, Sparkles, Swords, Trash2, Volume2, VolumeX, Zap } from 'lucide-react';
import { playGameSfx, setOceanBgmIntensity, setOceanMasterVolume, setOceanMuted, startOceanBgm, stopOceanBgm } from './audio';

function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

type Screen = 'title' | 'map' | 'gallery' | 'video' | 'combat' | 'victory' | 'memory' | 'breakout' | 'minefield' | 'snowfield' | 'snake' | 'tower' | 'city' | 'breakthrough' | 'lightbomb' | 'revelation';
type PlayableScene = Exclude<Screen, 'title' | 'map' | 'gallery' | 'video' | 'victory'>;
type VideoBackTarget = 'title' | 'map';
type GameProgressEntry = {
  cleared: boolean;
  best: number;
  plays: number;
  updatedAt: number;
};
type GameProgress = Partial<Record<PlayableScene, GameProgressEntry>>;
type GameCompleteHandler = (score?: number) => void;
type CompletionNotice = {
  id: number;
  sceneName: string;
  score: number;
  best: number;
  status: 'first' | 'record' | 'saved';
};
type GameSettings = {
  volume: number;
  muted: boolean;
  debugGrid: boolean;
};

const progressStorageKey = 'ocean-chronicle-progress-v1';
const settingsStorageKey = 'ocean-chronicle-settings-v1';
const defaultGameSettings: GameSettings = {
  volume: 0.72,
  muted: false,
  debugGrid: false,
};
const sceneDisplayNames: Record<PlayableScene, string> = {
  combat: '北境邊防',
  memory: '珊瑚老街',
  breakout: '冰晶王城',
  minefield: '暗流原野',
  snowfield: '冰雪高原',
  snake: '海潮部落',
  tower: '深淵高塔',
  city: '海底城市',
  breakthrough: '海底突圍',
  lightbomb: '海光迷宮',
  revelation: '王國冰晶',
};
const sceneShortHints: Record<PlayableScene, string> = {
  combat: '射擊',
  memory: '翻牌',
  breakout: '打磚塊',
  minefield: '掃雷',
  snowfield: '打雪杖',
  snake: '貪食蛇',
  tower: '下樓梯',
  city: '坦克大戰',
  breakthrough: '突圍射擊',
  lightbomb: '炸彈人',
  revelation: '天蠶變',
};
const sceneVersions: Record<PlayableScene, string> = {
  combat: 'v1.5',
  memory: 'v1.3',
  breakout: 'v1.7',
  minefield: 'v1.3',
  snowfield: 'v1.6',
  snake: 'v2.2',
  tower: 'v1.4',
  city: 'v2.5',
  breakthrough: 'v1.7',
  lightbomb: 'v2.2',
  revelation: 'v1.7',
};
const sceneStarThresholds: Record<PlayableScene, [number, number, number]> = {
  combat: [900, 1300, 1500],
  memory: [700, 1100, 1450],
  breakout: [1200, 1750, 2250],
  minefield: [800, 1300, 1750],
  snowfield: [950, 1350, 1750],
  snake: [1600, 2400, 3150],
  tower: [900, 1500, 2200],
  city: [2600, 3300, 4100],
  breakthrough: [2400, 3300, 4300],
  lightbomb: [3200, 3900, 4700],
  revelation: [1600, 2300, 3000],
};

function loadGameProgress(): GameProgress {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(progressStorageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, Partial<GameProgressEntry>>)
        .filter(([, value]) => value && typeof value === 'object')
        .map(([key, value]) => [
          key,
          {
            cleared: Boolean(value.cleared),
            best: Number.isFinite(value.best) ? Math.max(0, Math.round(value.best ?? 0)) : 0,
            plays: Number.isFinite(value.plays) ? Math.max(0, Math.round(value.plays ?? 0)) : 0,
            updatedAt: Number.isFinite(value.updatedAt) ? Math.max(0, Math.round(value.updatedAt ?? 0)) : 0,
          },
        ]),
    ) as GameProgress;
  } catch {
    return {};
  }
}

function saveGameProgress(progress: GameProgress) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(progressStorageKey, JSON.stringify(progress));
}

function loadGameSettings(): GameSettings {
  if (typeof window === 'undefined') return defaultGameSettings;
  try {
    const raw = window.localStorage.getItem(settingsStorageKey);
    if (!raw) return defaultGameSettings;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      volume: Number.isFinite(parsed.volume) ? clamp(parsed.volume ?? defaultGameSettings.volume, 0, 1) : defaultGameSettings.volume,
      muted: Boolean(parsed.muted),
      debugGrid: Boolean(parsed.debugGrid),
    };
  } catch {
    return defaultGameSettings;
  }
}

function saveGameSettings(settings: GameSettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
}

function formatBestScore(score: number) {
  if (score <= 0) return '';
  if (score >= 10000) return `${(score / 10000).toFixed(1)}萬`;
  return `${Math.round(score)}`;
}

function progressStars(scene: PlayableScene, entry?: GameProgressEntry) {
  if (!entry?.cleared) return 0;
  const thresholds = sceneStarThresholds[scene];
  return Math.max(1, thresholds.filter((threshold) => entry.best >= threshold).length);
}

function formatStars(count: number) {
  return `${'★'.repeat(count)}${'☆'.repeat(3 - count)}`;
}

function totalProgressStars(progress: GameProgress) {
  return (Object.keys(sceneDisplayNames) as PlayableScene[]).reduce((sum, scene) => sum + progressStars(scene, progress[scene]), 0);
}

function isPlayableScreen(screen: Screen): screen is PlayableScene {
  return !['title', 'map', 'gallery', 'video', 'victory'].includes(screen);
}

const globalPauseEventName = 'ocean-chronicle-pause';
const globalControlsResetEventName = 'ocean-chronicle-controls-reset';
let globalGamePaused = false;

function setGlobalGamePaused(paused: boolean) {
  globalGamePaused = paused;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(globalPauseEventName, { detail: paused }));
  }
}

function resetGlobalGameControls(reason = 'manual') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(globalControlsResetEventName, { detail: reason }));
  }
}

function useGamePausedRef() {
  const pausedRef = useRef(globalGamePaused);
  useEffect(() => {
    const syncPaused = (event: Event) => {
      pausedRef.current = Boolean((event as CustomEvent<boolean>).detail);
    };
    window.addEventListener(globalPauseEventName, syncPaused);
    return () => window.removeEventListener(globalPauseEventName, syncPaused);
  }, []);
  return pausedRef;
}

function useGlobalControlReset(callback: () => void) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  useEffect(() => {
    const handleReset = () => callbackRef.current();
    window.addEventListener(globalControlsResetEventName, handleReset);
    return () => window.removeEventListener(globalControlsResetEventName, handleReset);
  }, []);
}

function completionStatusLabel(status: CompletionNotice['status']) {
  if (status === 'first') return '首次通關';
  if (status === 'record') return '新紀錄';
  return '已記錄';
}

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
  destination: 'map' | 'combat' | 'memory' | 'breakout' | 'minefield' | 'snowfield' | 'snake' | 'tower' | 'city' | 'lightbomb' | 'revelation';
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
type SnowBarrier = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  expiresAt: number;
};

type SnakeCell = {
  row: number;
  col: number;
};

type SnakeDirection = 'up' | 'down' | 'left' | 'right';

type SnakeDecorKind = 'reef' | 'ruin' | 'kelp' | 'vent' | 'shell' | 'current' | 'glow';
type SnakeDecoration = {
  id: number;
  kind: SnakeDecorKind;
  row: number;
  col: number;
  width: number;
  height: number;
  rotate?: number;
};

type SnakeObstacle = SnakeCell & {
  id: number;
  expiresAt: number;
};

type SnakeFood = SnakeCell & {
  id: number;
  value: number;
  dropped?: boolean;
};

type SnakePowerupKind = 'shield' | 'boost' | 'magnet' | 'freeze' | 'burst' | 'feast';

type SnakePowerup = SnakeCell & {
  id: number;
  kind: SnakePowerupKind;
  expiresAt: number;
};

type SnakeRival = {
  id: number;
  name: string;
  cells: SnakeCell[];
  dir: SnakeDirection;
  color: 'urchin' | 'squid' | 'anemone';
  score: number;
  alive: boolean;
  respawnAt: number;
};

type SnakeStatus = 'ready' | 'playing' | 'won' | 'lost';

type SnakeReadyNotice = {
  title: string;
  detail: string;
};

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
type CityTileKind = 'coral' | 'stone' | 'seaweed' | 'current' | 'vent' | 'crystal' | 'trench' | 'rubble';
type CityChargeStage = 0 | 1 | 2;
type CityEnemyKind = 'tank' | 'anemone' | 'urchin';
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
  kind: CityEnemyKind;
  x: number;
  y: number;
  dir: CityDirection;
  hp: number;
  maxHp: number;
  cooldown: number;
  turnTimer: number;
  moveTimer: number;
  stepDelay: number;
  poisonTimer?: number;
};
type CityShot = {
  id: number;
  side: 'ally' | 'enemy';
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: CityDirection;
  piercing?: boolean;
  spread?: boolean;
  double?: boolean;
  chargeStage?: CityChargeStage;
  damage?: number;
};
type CityPowerupKind = 'speed' | 'shield' | 'armor' | 'fortify' | 'freeze' | 'blast' | 'pierce' | 'repair' | 'spread' | 'double' | 'magnet' | 'dash' | 'jam';
type CityPowerup = {
  id: number;
  kind: CityPowerupKind;
  x: number;
  y: number;
  expiresAt: number;
};
type CityPoisonCloud = {
  id: number;
  x: number;
  y: number;
  expiresAt: number;
};
type CityStatus = 'playing' | 'won' | 'lost';
type CityNoticeKind = CityPowerupKind | 'damage' | 'base' | 'spawn';
type CityNotice = {
  id: number;
  kind: CityNoticeKind;
  text: string;
};
type CityTimedAbility = 'rapid' | 'shield' | 'freeze' | 'pierce' | 'spread' | 'double' | 'magnet' | 'dash' | 'jam';
type CityAbilityDurations = Record<CityTimedAbility, number>;
type CityWeaponKind = 'rapid' | 'pierce' | 'spread' | 'double';
type CityWeaponState = Record<CityWeaponKind, boolean>;
type CityLevelConfig = {
  level: number;
  title: string;
  targetKills: number;
  enemyCap: number;
  urchinTarget: number;
  spawnMs: number;
  enemyMoveDelayScale: number;
  enemyShotDelayScale: number;
  enemyShotSpeed: number;
  eliteChance: number;
  dropChance: number;
};

type LightBombTileKind = 'solid' | 'soft' | 'rubble' | 'current' | 'kelp' | 'vent' | 'shell';
type LightBombTile = {
  id: number;
  kind: LightBombTileKind;
  row: number;
  col: number;
};
type LightBombPowerupKind = 'flame' | 'bomb' | 'speed' | 'kick' | 'remote' | 'shield';
type LightBombPowerup = {
  id: number;
  kind: LightBombPowerupKind;
  row: number;
  col: number;
};
type LightBombEnemyKind = 'squid' | 'urchin' | 'anemone';
type LightBombCharacterId = 'prince' | 'panther' | 'doubleBand' | 'panda';
type LightBombCharacterDef = {
  id: LightBombCharacterId;
  name: string;
  ability: string;
  image: string;
  start: Pick<LightBombPlayer, 'range' | 'maxBombs' | 'moveMs' | 'kick' | 'pierceBombs'>;
};
type LightBombEnemy = {
  id: number;
  kind: LightBombEnemyKind;
  row: number;
  col: number;
  x: number;
  y: number;
  dir: CityDirection;
  moveAt: number;
};
type LightBombPlayer = {
  character: LightBombCharacterId;
  row: number;
  col: number;
  x: number;
  y: number;
  dir: CityDirection;
  range: number;
  maxBombs: number;
  moveMs: number;
  kick: boolean;
  pierceBombs: boolean;
  shieldUntil: number;
  remoteUntil: number;
};
type LightBombBomb = {
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  range: number;
  explodeAt: number;
  remote: boolean;
  piercing: boolean;
  kickedDir?: CityDirection;
  moveAt: number;
};
type LightBombExplosion = {
  id: number;
  row: number;
  col: number;
  expiresAt: number;
};
type LightBombExit = {
  row: number;
  col: number;
};
type LightBombLevel = {
  tiles: LightBombTile[];
  hiddenPowerups: LightBombPowerup[];
  enemies: LightBombEnemy[];
  exit: LightBombExit;
};
type LightBombLevelConfig = {
  stage: number;
  title: string;
  enemyCount: number;
  enemyDelayScale: number;
  powerupCount: number;
  musicIntensity: number;
};
type LightBombStatus = 'select' | 'playing' | 'won' | 'lost';
type LightBombNotice = {
  id: number;
  kind: LightBombPowerupKind | 'door' | 'hit';
  text: string;
} | null;
type BreakthroughStatus = 'select' | 'playing' | 'won' | 'lost';
type BreakthroughObstacleKind = 'coral' | 'stone' | 'crystal' | 'rubble';
type BreakthroughObstacle = {
  id: number;
  row: number;
  col: number;
  kind: BreakthroughObstacleKind;
  hp: number;
};
type BreakthroughEnemy = {
  id: number;
  kind: CityEnemyKind | 'boss';
  row: number;
  col: number;
  x: number;
  y: number;
  dir: CityDirection;
  hp: number;
  maxHp: number;
  cooldown: number;
  moveAt: number;
  poisonAt?: number;
};
type BreakthroughShot = {
  id: number;
  side: 'ally' | 'enemy';
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: CityDirection;
  damage: number;
  rangeLeft: number;
  piercing?: boolean;
  big?: boolean;
  chargeStage?: CityChargeStage;
  spread?: boolean;
  double?: boolean;
  overcharged?: boolean;
};
type BreakthroughPowerup = {
  id: number;
  kind: CityPowerupKind;
  row: number;
  col: number;
  x: number;
  y: number;
  expiresAt: number;
};
type BreakthroughUpgradeKind = CityWeaponKind | 'power' | 'charge' | 'speed';
type BreakthroughUpgradeState = Record<BreakthroughUpgradeKind, number>;
type BreakthroughPoisonCloud = {
  id: number;
  row: number;
  col: number;
  expiresAt: number;
};
type BreakthroughPlayer = {
  character: LightBombCharacterId;
  row: number;
  col: number;
  x: number;
  y: number;
  dir: CityDirection;
  hp: number;
  maxHp: number;
  cooldown: number;
};
type BreakthroughCharacterStats = {
  hp: number;
  moveMs: number;
  cooldownMs: number;
  shotSpeed: number;
  damage: number;
  piercing?: boolean;
  spread?: boolean;
  double?: boolean;
  big?: boolean;
};
type BreakthroughNotice = {
  id: number;
  kind: CityNoticeKind | 'win';
  text: string;
} | null;
type BreakthroughLevelConfig = {
  stage: number;
  title: string;
  enemyStepRows: number;
  extraEnemyChance: number;
  dropChance: number;
  enemyMoveScale: number;
  enemyShotScale: number;
  enemyShotSpeedScale: number;
  bossHp: number;
  obstacleDensity: number;
  musicIntensity: number;
};
type RevelationCell = {
  row: number;
  col: number;
};
type RevelationStatus = 'ready' | 'playing' | 'won' | 'lost';
type RevelationEnemyKind = 'jellyfish' | 'squid' | 'urchin' | 'anemone';
type RevelationPowerKind = 'speed' | 'freeze' | 'reveal' | 'shield' | 'slow' | 'life';
type RevelationEnemy = {
  id: number;
  kind: RevelationEnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  attackAt?: number;
};
type RevelationShot = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  expiresAt: number;
};
type RevelationPowerup = RevelationCell & {
  id: number;
  kind: RevelationPowerKind;
};
type RevelationPlayer = {
  x: number;
  y: number;
  safeX: number;
  safeY: number;
  dir: CityDirection;
  drawing: boolean;
  retracting: boolean;
  shieldUntil: number;
  speedUntil: number;
  slowUntil: number;
  freezeUntil: number;
  orbitCharges: number;
};
type RevelationNoticeKind = RevelationPowerKind | 'hit' | 'seal';
type RevelationNotice = {
  id: number;
  text: string;
  kind: RevelationNoticeKind;
} | null;
type DirectionPadIntent = {
  primary: CityDirection;
  secondary?: CityDirection;
} | null;
type DirectionPadVector = {
  x: number;
  y: number;
};
type DirectionPadInput = {
  intent: DirectionPadIntent;
  vector: DirectionPadVector;
};
type GridMoveTiming = {
  stepMs: number;
  retryMs: number;
  turnBufferMs: number;
};
type GridDebugItem = {
  label: string;
  value: string | number | boolean;
};
type LightBombPadIntent = DirectionPadIntent;
type LightBombPadVector = DirectionPadVector;
type LightBombPadInput = DirectionPadInput;
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
  revelation: {
    frozen: assetUrl('/assets/mobile/revelation/ice-princess-seal-v01.webp?v=20260601'),
    released: assetUrl('/assets/mobile/revelation/ice-princess-released-v01.webp?v=20260601'),
    jellyfish: assetUrl('/assets/mobile/revelation/jellyfish-god-cutout-v01.png?v=20260601'),
  },
  lightBombHeads: {
    prince: assetUrl('/assets/mobile/lightbomb/prince-head-v01.png?v=20260601'),
    panther: assetUrl('/assets/mobile/lightbomb/black-panther-ninja-upper-v01.png?v=20260601c'),
    doubleBand: assetUrl('/assets/mobile/lightbomb/double-band-clown-upper-v01.png?v=20260601c'),
    panda: assetUrl('/assets/mobile/lightbomb/panda-sumo-upper-v01.png?v=20260601c'),
    squid: assetUrl('/assets/mobile/lightbomb/squid-head-v01.png?v=20260601'),
    urchin: assetUrl('/assets/mobile/lightbomb/urchin-head-v01.png?v=20260601'),
    anemone: assetUrl('/assets/mobile/lightbomb/anemone-head-v01.png?v=20260601'),
  } satisfies Record<LightBombCharacterId | LightBombEnemyKind, string>,
  breakthroughHeroes: {
    prince: {
      up: assetUrl('/assets/mobile/breakthrough-heroes/prince-up-v01.png?v=20260606'),
      down: assetUrl('/assets/mobile/breakthrough-heroes/prince-down-v01.png?v=20260606'),
      left: assetUrl('/assets/mobile/breakthrough-heroes/prince-left-v01.png?v=20260606'),
      right: assetUrl('/assets/mobile/breakthrough-heroes/prince-right-v01.png?v=20260606'),
    },
    panther: {
      up: assetUrl('/assets/mobile/breakthrough-heroes/panther-up-v01.png?v=20260606'),
      down: assetUrl('/assets/mobile/breakthrough-heroes/panther-down-v01.png?v=20260606'),
      left: assetUrl('/assets/mobile/breakthrough-heroes/panther-left-v01.png?v=20260606'),
      right: assetUrl('/assets/mobile/breakthrough-heroes/panther-right-v01.png?v=20260606'),
    },
    doubleBand: {
      up: assetUrl('/assets/mobile/breakthrough-heroes/doubleBand-up-v01.png?v=20260606'),
      down: assetUrl('/assets/mobile/breakthrough-heroes/doubleBand-down-v01.png?v=20260606'),
      left: assetUrl('/assets/mobile/breakthrough-heroes/doubleBand-left-v01.png?v=20260606'),
      right: assetUrl('/assets/mobile/breakthrough-heroes/doubleBand-right-v01.png?v=20260606'),
    },
    panda: {
      up: assetUrl('/assets/mobile/breakthrough-heroes/panda-up-v01.png?v=20260606'),
      down: assetUrl('/assets/mobile/breakthrough-heroes/panda-down-v01.png?v=20260606'),
      left: assetUrl('/assets/mobile/breakthrough-heroes/panda-left-v01.png?v=20260606'),
      right: assetUrl('/assets/mobile/breakthrough-heroes/panda-right-v01.png?v=20260606'),
    },
  } satisfies Record<LightBombCharacterId, Record<CityDirection, string>>,
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
    urchin: {
      up: assetUrl('/assets/mobile/city-units/virus-urchin-up-v01.png?v=20260605'),
      down: assetUrl('/assets/mobile/city-units/virus-urchin-down-v01.png?v=20260605'),
      left: assetUrl('/assets/mobile/city-units/virus-urchin-left-v01.png?v=20260605'),
      right: assetUrl('/assets/mobile/city-units/virus-urchin-right-v01.png?v=20260605'),
    },
    anemone: assetUrl('/assets/mobile/city-units/garbage-anemone-turret-v01.png?v=20260605'),
    base: assetUrl('/assets/mobile/city-units/ice-crystal-base-v01.webp?v=20260531'),
  } satisfies { player: Record<CityDirection, string>; enemy: Record<CityDirection, string>; urchin: Record<CityDirection, string>; anemone: string; base: string },
  stageBg: assetUrl('/assets/mobile/stages/north-battlefield-bg-v01.webp'),
  bossStates: {
    idle: assetUrl('/assets/mobile/bosses/giant-garbage-anemone-idle-v01.webp'),
    sweep: assetUrl('/assets/mobile/bosses/giant-garbage-anemone-sweep-v01.webp'),
    core: assetUrl('/assets/mobile/bosses/giant-garbage-anemone-core-v01.webp'),
    hit: assetUrl('/assets/mobile/bosses/giant-garbage-anemone-hit-v01.webp'),
  },
  virusUrchin: assetUrl('/assets/mobile/cards/virus-purple-urchin-picture-card-v01.webp'),
  garbageAnemone: assetUrl('/assets/mobile/cards/garbage-anemone-picture-card-v01.webp'),
  heroCutin: assetUrl('/assets/mobile/cutins/double-band-samurai-core-breaker-v01.webp'),
  bossSweepCutin: assetUrl('/assets/mobile/cutins/giant-garbage-anemone-tentacle-sweep-v01.webp'),
  bossCoreCutin: assetUrl('/assets/mobile/cutins/giant-garbage-anemone-toxic-core-v01.webp'),
  pickup: assetUrl('/assets/mobile/pickups/ocean-light-energy-v01.webp'),
  sharkStatue: assetUrl('/assets/mobile/victory/shark-war-god-statue.webp'),
};

const lightBombCharacters: LightBombCharacterDef[] = [
  {
    id: 'prince',
    name: '公子王子',
    ability: '光爆穿透',
    image: assets.lightBombHeads.prince,
    start: { range: 2, maxBombs: 1, moveMs: 178, kick: false, pierceBombs: true },
  },
  {
    id: 'panther',
    name: '黑豹忍者小丑',
    ability: '初始兩顆光爆',
    image: assets.lightBombHeads.panther,
    start: { range: 2, maxBombs: 2, moveMs: 178, kick: false, pierceBombs: false },
  },
  {
    id: 'doubleBand',
    name: '雙帶小丑',
    ability: '火力 4 級',
    image: assets.lightBombHeads.doubleBand,
    start: { range: 4, maxBombs: 1, moveMs: 178, kick: false, pierceBombs: false },
  },
  {
    id: 'panda',
    name: '熊貓相撲',
    ability: '初始踢光爆',
    image: assets.lightBombHeads.panda,
    start: { range: 2, maxBombs: 1, moveMs: 178, kick: true, pierceBombs: false },
  },
];

function lightBombCharacterDef(id: LightBombCharacterId) {
  return lightBombCharacters.find((character) => character.id === id) ?? lightBombCharacters[0];
}

function breakthroughHeroImage(id: LightBombCharacterId, direction: CityDirection) {
  return assets.breakthroughHeroes[id]?.[direction] ?? assets.breakthroughHeroes.prince.down;
}

const breakthroughCharacterStats: Record<LightBombCharacterId, BreakthroughCharacterStats> = {
  prince: { hp: 4, moveMs: 150, cooldownMs: 520, shotSpeed: 0.014, damage: 1, piercing: true },
  panther: { hp: 3, moveMs: 118, cooldownMs: 360, shotSpeed: 0.016, damage: 1 },
  doubleBand: { hp: 4, moveMs: 148, cooldownMs: 560, shotSpeed: 0.014, damage: 1, spread: true, double: true },
  panda: { hp: 6, moveMs: 190, cooldownMs: 720, shotSpeed: 0.012, damage: 2, big: true },
};

const breakthroughCharacterAbilityText: Record<LightBombCharacterId, string> = {
  prince: '穿透海光炮',
  panther: '高速連射',
  doubleBand: '雙發散彈',
  panda: '重裝震波',
};

const breakthroughUpgradeLabels: Record<BreakthroughUpgradeKind, string> = {
  rapid: '速射',
  pierce: '穿透',
  spread: '散彈',
  double: '雙發',
  power: '威力',
  charge: '集氣',
  speed: '移速',
};

const breakthroughUpgradeOrder: BreakthroughUpgradeKind[] = ['rapid', 'pierce', 'spread', 'double', 'power', 'charge', 'speed'];
const breakthroughMaxUpgradeLevel = 3;

function createLightBombPlayer(characterId: LightBombCharacterId, carry?: LightBombPlayer): LightBombPlayer {
  const character = lightBombCharacterDef(characterId);
  return {
    ...lightBombPlayerStart,
    character: character.id,
    range: Math.max(character.start.range, carry?.range ?? 0),
    maxBombs: Math.max(character.start.maxBombs, carry?.maxBombs ?? 0),
    moveMs: Math.min(character.start.moveMs, carry?.moveMs ?? character.start.moveMs),
    kick: character.start.kick || carry?.kick || false,
    pierceBombs: character.start.pierceBombs || carry?.pierceBombs || false,
    remoteUntil: carry?.remoteUntil ?? 0,
    shieldUntil: carry?.shieldUntil ?? 0,
  };
}

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
  lightBombMaze: {
    eyebrow: '海光迷宮片頭',
    title: '公子王子的海光迷宮',
    src: assetUrl('/assets/mobile/videos/lightbomb-maze-intro.mp4?v=20260601'),
    actionLabel: '進入迷宮',
    destination: 'lightbomb',
  },
  ancientRevelation: {
    eyebrow: '王國冰晶',
    title: '冰晶王女的封印板',
    src: assetUrl('/assets/mobile/videos/kingdom-ice-intro.mp4?v=20260602'),
    actionLabel: '進入封印板',
    destination: 'revelation',
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

const snakeCols = 38;
const snakeRows = 58;
const snakeViewCols = 10;
const snakeViewRows = 16;
const snakeTarget = 82;
const snakeFoodTarget = 24;
const snakeRivalCount = 4;
const snakeMaxFood = 64;
const snakeStart: SnakeCell[] = [
  { col: 19, row: 44 },
  { col: 19, row: 45 },
  { col: 19, row: 46 },
];
const snakeDecorations: SnakeDecoration[] = [
  { id: 1, kind: 'reef', row: 2, col: 1, width: 6, height: 4, rotate: -8 },
  { id: 2, kind: 'current', row: 1, col: 9, width: 13, height: 3, rotate: 8 },
  { id: 3, kind: 'ruin', row: 5, col: 15, width: 6, height: 5, rotate: 3 },
  { id: 4, kind: 'kelp', row: 8, col: 2, width: 5, height: 7, rotate: -5 },
  { id: 5, kind: 'shell', row: 12, col: 11, width: 4, height: 3, rotate: 14 },
  { id: 6, kind: 'vent', row: 15, col: 18, width: 4, height: 4 },
  { id: 7, kind: 'glow', row: 18, col: 4, width: 5, height: 5 },
  { id: 8, kind: 'reef', row: 21, col: 15, width: 7, height: 5, rotate: 9 },
  { id: 9, kind: 'current', row: 25, col: 0, width: 11, height: 4, rotate: -11 },
  { id: 10, kind: 'ruin', row: 29, col: 5, width: 7, height: 5, rotate: -4 },
  { id: 11, kind: 'kelp', row: 30, col: 17, width: 5, height: 6, rotate: 7 },
  { id: 12, kind: 'shell', row: 33, col: 13, width: 4, height: 2, rotate: -16 },
  { id: 13, kind: 'glow', row: 9, col: 19, width: 4, height: 4 },
  { id: 14, kind: 'vent', row: 23, col: 8, width: 3, height: 3 },
  { id: 15, kind: 'reef', row: 14, col: 0, width: 4, height: 4, rotate: 18 },
  { id: 16, kind: 'current', row: 17, col: 10, width: 12, height: 3, rotate: 12 },
  { id: 17, kind: 'reef', row: 37, col: 25, width: 8, height: 5, rotate: -10 },
  { id: 18, kind: 'ruin', row: 43, col: 3, width: 7, height: 5, rotate: 5 },
  { id: 19, kind: 'current', row: 48, col: 18, width: 15, height: 3, rotate: -7 },
  { id: 20, kind: 'kelp', row: 50, col: 31, width: 5, height: 7, rotate: 8 },
  { id: 21, kind: 'glow', row: 39, col: 10, width: 5, height: 5 },
  { id: 22, kind: 'shell', row: 54, col: 6, width: 4, height: 2, rotate: 12 },
];
const snakePowerupLabels: Record<SnakePowerupKind, string> = {
  shield: '盾',
  boost: '衝',
  magnet: '吸',
  freeze: '凍',
  burst: '爆',
  feast: '宴',
};
const snakePowerupText: Record<SnakePowerupKind, string> = {
  shield: '護盾',
  boost: '衝刺',
  magnet: '吸引',
  freeze: '凍結敵蛇',
  burst: '爆波',
  feast: '盛宴',
};
const snakePowerupKinds: SnakePowerupKind[] = ['shield', 'boost', 'magnet', 'freeze', 'burst', 'feast'];
const towerGoalMs = 180000;
const towerDeathPenaltyMs = 15000;
const towerPlayerRadius = 3.6;
const towerPlayerStart: TowerPlayer = { x: 50, y: 48, vy: 0 };
const cityGridSize = 32;
const cityCellSize = 100 / cityGridSize;
const cityViewCols = 9;
const cityViewRows = 14;
const cityViewWidth = cityCellSize * cityViewCols;
const cityViewHeight = cityCellSize * cityViewRows;
const cityUnitSize = cityCellSize * 0.74;
const cityUnitVisualSize = cityCellSize * 1.14;
const cityPlayerStepDelayMs = 162;
const cityPlayerMoveMs = 148;
const cityTurnRetryMs = 42;
const cityTurnBufferMs = 54;
const cityChargeStageOneMs = 650;
const cityChargeStageTwoMs = 1350;
const cityPoisonCloudSize = cityCellSize * 4;
const cityPoisonSlowScale = 0.7;
const cityPoisonDurationMs = 5200;
const cityStartingBaseHp = 4;
const cityStartingArmor = 4;
const cityMaxHp = 5;
const cityLevels: CityLevelConfig[] = [
  { level: 1, title: '第一防線', targetKills: 17, enemyCap: 4, urchinTarget: 1, spawnMs: 2450, enemyMoveDelayScale: 1.08, enemyShotDelayScale: 1.12, enemyShotSpeed: 0.031, eliteChance: 0.26, dropChance: 0.52 },
  { level: 2, title: '第二防線', targetKills: 24, enemyCap: 6, urchinTarget: 2, spawnMs: 2000, enemyMoveDelayScale: 0.86, enemyShotDelayScale: 0.84, enemyShotSpeed: 0.035, eliteChance: 0.38, dropChance: 0.54 },
  { level: 3, title: '第三防線', targetKills: 31, enemyCap: 8, urchinTarget: 3, spawnMs: 1620, enemyMoveDelayScale: 0.7, enemyShotDelayScale: 0.68, enemyShotSpeed: 0.04, eliteChance: 0.52, dropChance: 0.56 },
];
const cityMaxLevel = cityLevels.length;
const cityBase = { x: cityCellCenter(15.5), y: cityCellCenter(29.5), size: cityCellSize * 2 };
const cityPlayerStart = { x: cityCellCenter(15), y: cityCellCenter(26), dir: 'up' as CityDirection };
const cityEnemySpawnCells = [
  { col: 2, row: 1, dir: 'down' as CityDirection },
  { col: 15, row: 1, dir: 'down' as CityDirection },
  { col: 29, row: 1, dir: 'down' as CityDirection },
  { col: 1, row: 15, dir: 'right' as CityDirection },
  { col: 30, row: 15, dir: 'left' as CityDirection },
];
const breakthroughCols = 11;
const breakthroughRows = 118;
const breakthroughViewCols = 9;
const breakthroughViewRows = 15;
const breakthroughStart = { row: breakthroughRows - 4, col: 5, dir: 'up' as CityDirection };
const breakthroughBossStart = { row: 3, col: 5 };
const breakthroughGoalRow = 1;
const breakthroughCellSize = 100 / breakthroughCols;
const breakthroughPoisonDurationMs = 5200;
const breakthroughPowerupDurationMs = 12000;
const breakthroughStepExtraMs = 20;
const breakthroughLevels: BreakthroughLevelConfig[] = [
  { stage: 1, title: '第一海溝', enemyStepRows: 7, extraEnemyChance: 0.36, dropChance: 0.54, enemyMoveScale: 1.08, enemyShotScale: 1.12, enemyShotSpeedScale: 0.92, bossHp: 16, obstacleDensity: 0.9, musicIntensity: 1.08 },
  { stage: 2, title: '第二海溝', enemyStepRows: 6, extraEnemyChance: 0.52, dropChance: 0.58, enemyMoveScale: 0.92, enemyShotScale: 0.9, enemyShotSpeedScale: 1.05, bossHp: 22, obstacleDensity: 1.04, musicIntensity: 1.24 },
  { stage: 3, title: '王城外環', enemyStepRows: 5, extraEnemyChance: 0.68, dropChance: 0.62, enemyMoveScale: 0.78, enemyShotScale: 0.76, enemyShotSpeedScale: 1.18, bossHp: 30, obstacleDensity: 1.16, musicIntensity: 1.42 },
];
const breakthroughMaxStage = breakthroughLevels.length;
const cityPowerupWeights: { kind: CityPowerupKind; weight: number }[] = [
  { kind: 'speed', weight: 20 },
  { kind: 'shield', weight: 15 },
  { kind: 'armor', weight: 14 },
  { kind: 'fortify', weight: 12 },
  { kind: 'freeze', weight: 14 },
  { kind: 'blast', weight: 10 },
  { kind: 'pierce', weight: 14 },
  { kind: 'spread', weight: 18 },
  { kind: 'double', weight: 16 },
  { kind: 'magnet', weight: 10 },
  { kind: 'dash', weight: 11 },
  { kind: 'jam', weight: 9 },
  { kind: 'repair', weight: 7 },
];
const breakthroughPowerupWeights: { kind: CityPowerupKind; weight: number }[] = [
  { kind: 'speed', weight: 20 },
  { kind: 'pierce', weight: 15 },
  { kind: 'spread', weight: 18 },
  { kind: 'double', weight: 16 },
  { kind: 'blast', weight: 16 },
  { kind: 'magnet', weight: 12 },
  { kind: 'dash', weight: 14 },
  { kind: 'shield', weight: 12 },
  { kind: 'armor', weight: 12 },
  { kind: 'freeze', weight: 12 },
  { kind: 'jam', weight: 10 },
  { kind: 'repair', weight: 7 },
];
const cityPowerupMessages: Record<CityPowerupKind, string> = {
  speed: '速射武器常駐',
  shield: '護盾展開',
  armor: '裝甲 +1',
  fortify: '主堡 +1',
  freeze: '敵軍緩速',
  blast: '震波清場',
  pierce: '穿甲武器常駐',
  spread: '散彈武器常駐',
  double: '雙發武器常駐',
  magnet: '海光牽引',
  dash: '海流疾行',
  jam: '干擾敵火',
  repair: '全體修復',
};
const breakthroughPowerupMessages: Record<CityPowerupKind, string> = {
  speed: '速射升級',
  shield: '體力 +2',
  armor: '體力 +1',
  fortify: '體力 +1',
  freeze: '敵軍短暫停滯',
  blast: '威力升級',
  pierce: '穿透升級',
  spread: '散彈升級',
  double: '雙發升級',
  magnet: '集氣升級',
  dash: '移速升級',
  jam: '敵火干擾',
  repair: '體力 +1',
};
const lightBombRows = 31;
const lightBombCols = 31;
const lightBombViewRows = 17;
const lightBombViewCols = 10;
const lightBombKickStepMs = 82;
const lightBombTurnRetryMs = 62;
const lightBombTurnBufferMs = 52;
const lightBombLevels: LightBombLevelConfig[] = [
  { stage: 1, title: '第一迷宮', enemyCount: 18, enemyDelayScale: 1.08, powerupCount: 13, musicIntensity: 0.96 },
  { stage: 2, title: '第二迷宮', enemyCount: 24, enemyDelayScale: 0.9, powerupCount: 15, musicIntensity: 1.2 },
  { stage: 3, title: '第三迷宮', enemyCount: 30, enemyDelayScale: 0.75, powerupCount: 17, musicIntensity: 1.45 },
];
const lightBombMaxStage = lightBombLevels.length;
const lightBombPlayerStart: LightBombPlayer = {
  character: 'prince',
  row: 1,
  col: 1,
  x: 1,
  y: 1,
  dir: 'down',
  range: 2,
  maxBombs: 1,
  moveMs: 178,
  kick: false,
  pierceBombs: true,
  shieldUntil: 0,
  remoteUntil: 0,
};
const lightBombPowerupLabels: Record<LightBombPowerupKind, string> = {
  flame: '火',
  bomb: '彈',
  speed: '速',
  kick: '踢',
  remote: '遙',
  shield: '盾',
};
const lightBombPowerupText: Record<LightBombPowerupKind, string> = {
  flame: '火力 +1',
  bomb: '光爆 +1',
  speed: '速度提升',
  kick: '踢爆彈',
  remote: '遙控光爆',
  shield: '護盾展開',
};
const lightBombEnemyDelays: Record<LightBombEnemyKind, number> = {
  squid: 650,
  urchin: 560,
  anemone: 780,
};
const lightBombDirections: CityDirection[] = ['up', 'down', 'left', 'right'];
const lightBombEnemyPattern: LightBombEnemyKind[] = ['squid', 'urchin', 'anemone', 'squid', 'urchin', 'anemone', 'squid', 'urchin', 'squid', 'anemone'];
const revelationCols = 44;
const revelationRows = 72;
const revelationSafeBorder = 2;
const revelationTargetPercent = 72;
const revelationTimeLimitMs = 165000;
const revelationRetractSpeed = 19.5;
const revelationOrbitMax = 6;
const revelationStart = { col: Math.floor(revelationCols / 2), row: revelationRows - revelationSafeBorder };
const revelationEnemyKinds: RevelationEnemyKind[] = ['jellyfish', 'urchin', 'squid', 'anemone', 'urchin', 'squid', 'anemone', 'urchin', 'squid', 'anemone'];
const revelationPowerKinds: RevelationPowerKind[] = ['speed', 'freeze', 'reveal', 'shield', 'slow', 'life', 'freeze', 'reveal', 'speed', 'shield'];
const revelationPowerLabels: Record<RevelationPowerKind, string> = {
  speed: '速',
  freeze: '彈',
  reveal: '星',
  shield: '盾',
  slow: '緩',
  life: '命',
};
const revelationPowerText: Record<RevelationPowerKind, string> = {
  speed: '王子加速延長',
  freeze: '護身光彈 +2',
  reveal: '星點開圖擴張',
  shield: '冰晶護盾延長',
  slow: '敵群緩速延長',
  life: '命數 +1',
};

function sameCell(a: SnakeCell, b: SnakeCell) {
  return a.row === b.row && a.col === b.col;
}

function randomInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function revelationCellKey(col: number, row: number) {
  return `${col}-${row}`;
}

function createRevelationClaimed() {
  return Array.from({ length: revelationRows }, (_, row) =>
    Array.from({ length: revelationCols }, (_, col) => (
      row < revelationSafeBorder ||
      col < revelationSafeBorder ||
      row >= revelationRows - revelationSafeBorder ||
      col >= revelationCols - revelationSafeBorder
    )),
  );
}

function revelationCellIsClaimed(grid: boolean[][], col: number, row: number) {
  if (row < 0 || col < 0 || row >= revelationRows || col >= revelationCols) return true;
  return grid[row]?.[col] ?? true;
}

function revelationCellInBounds(col: number, row: number) {
  return row >= 0 && col >= 0 && row < revelationRows && col < revelationCols;
}

function revelationCellIsBoundary(grid: boolean[][], col: number, row: number) {
  if (!revelationCellInBounds(col, row) || !revelationCellIsClaimed(grid, col, row)) return false;
  return [
    { col: col + 1, row },
    { col: col - 1, row },
    { col, row: row + 1 },
    { col, row: row - 1 },
  ].some((neighbor) => revelationCellInBounds(neighbor.col, neighbor.row) && !revelationCellIsClaimed(grid, neighbor.col, neighbor.row));
}

function revelationCellCenter(cell: RevelationCell) {
  return {
    x: cell.col + 0.5,
    y: cell.row + 0.5,
  };
}

function revelationPositionCell(x: number, y: number): RevelationCell {
  return {
    col: clamp(Math.floor(x), 0, revelationCols - 1),
    row: clamp(Math.floor(y), 0, revelationRows - 1),
  };
}

function revelationClaimedPercent(grid: boolean[][]) {
  let claimed = 0;
  for (let row = 0; row < revelationRows; row += 1) {
    for (let col = 0; col < revelationCols; col += 1) {
      if (grid[row][col]) claimed += 1;
    }
  }
  return Math.round((claimed / (revelationCols * revelationRows)) * 100);
}

function createRevelationPlayer(): RevelationPlayer {
  return {
    x: revelationStart.col + 0.5,
    y: revelationStart.row + 0.5,
    safeX: revelationStart.col + 0.5,
    safeY: revelationStart.row + 0.5,
    dir: 'up',
    drawing: false,
    retracting: false,
    shieldUntil: 0,
    speedUntil: 0,
    slowUntil: 0,
    freezeUntil: 0,
    orbitCharges: 0,
  };
}

function randomRevelationVelocity(speed: number) {
  const angle = Math.random() * Math.PI * 2;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  return { vx, vy };
}

function revelationEnemyBlocked(grid: boolean[][], x: number, y: number, size: number) {
  if (x < revelationSafeBorder + 0.4 || y < revelationSafeBorder + 0.4 || x > revelationCols - revelationSafeBorder - 0.4 || y > revelationRows - revelationSafeBorder - 0.4) return true;
  const radius = Math.max(0, size * 0.38);
  const probes = [
    { x, y },
    { x: x - radius, y },
    { x: x + radius, y },
    { x, y: y - radius },
    { x, y: y + radius },
  ];
  return probes.some((point) => {
    const cell = revelationPositionCell(point.x, point.y);
    return revelationCellIsClaimed(grid, cell.col, cell.row);
  });
}

function revelationCellNearEnemies(cell: RevelationCell, enemies: RevelationEnemy[], radius: number) {
  return enemies.some((enemy) => Math.hypot(cell.col + 0.5 - enemy.x, cell.row + 0.5 - enemy.y) < radius + enemy.size * 0.5);
}

function randomRevelationOpenCell(grid: boolean[][], enemies: RevelationEnemy[] = [], margin = 5): RevelationCell {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const cell = {
      col: randomInt(revelationSafeBorder + 2, revelationCols - revelationSafeBorder - 3),
      row: randomInt(revelationSafeBorder + 3, revelationRows - revelationSafeBorder - 4),
    };
    if (!revelationCellIsClaimed(grid, cell.col, cell.row) && !revelationCellNearEnemies(cell, enemies, margin)) return cell;
  }
  return { col: Math.floor(revelationCols / 2), row: Math.floor(revelationRows / 2) };
}

function createRevelationEnemies(grid: boolean[][]): RevelationEnemy[] {
  return revelationEnemyKinds.map((kind, index) => {
    const cell = randomRevelationOpenCell(grid, [], kind === 'jellyfish' ? 9 : 5);
    const speed = kind === 'jellyfish' ? 2.35 : kind === 'anemone' ? 2.05 : kind === 'urchin' ? 2.55 : 2.85;
    const velocity = randomRevelationVelocity(speed);
    return {
      id: index + 1,
      kind,
      x: cell.col + 0.5,
      y: cell.row + 0.5,
      vx: velocity.vx,
      vy: velocity.vy,
      size: kind === 'jellyfish' ? 5.1 : kind === 'anemone' ? 1.45 : 1.22,
      attackAt: kind === 'jellyfish' ? performance.now() + 1800 : undefined,
    };
  });
}

function createRevelationPowerups(grid: boolean[][], enemies: RevelationEnemy[]) {
  return revelationPowerKinds.map((kind, index) => {
    const cell = randomRevelationOpenCell(grid, enemies, 4);
    return {
      id: index + 1,
      kind,
      ...cell,
    };
  });
}

function claimRevelationDots(grid: boolean[][], enemies: RevelationEnemy[]) {
  const nextGrid = grid.map((row) => [...row]);
  for (let dot = 0; dot < 8; dot += 1) {
    const center = randomRevelationOpenCell(nextGrid, enemies, 5);
    const radius = randomInt(2, 4);
    for (let row = center.row - radius; row <= center.row + radius; row += 1) {
      for (let col = center.col - radius; col <= center.col + radius; col += 1) {
        if (
          row >= revelationSafeBorder &&
          col >= revelationSafeBorder &&
          row < revelationRows - revelationSafeBorder &&
          col < revelationCols - revelationSafeBorder &&
          Math.hypot(col - center.col, row - center.row) <= radius &&
          !revelationCellNearEnemies({ col, row }, enemies, 2.5)
        ) nextGrid[row][col] = true;
      }
    }
  }
  return nextGrid;
}

function resolveRevelationCapture(grid: boolean[][], trail: RevelationCell[], enemies: RevelationEnemy[]) {
  const trailKeys = new Set(trail.map((cell) => revelationCellKey(cell.col, cell.row)));
  const blocked = (col: number, row: number) => revelationCellIsClaimed(grid, col, row) || trailKeys.has(revelationCellKey(col, row));
  const visited = new Set<string>();
  const components: RevelationCell[][] = [];

  for (let row = 0; row < revelationRows; row += 1) {
    for (let col = 0; col < revelationCols; col += 1) {
      const startKey = revelationCellKey(col, row);
      if (blocked(col, row) || visited.has(startKey)) continue;
      const component: RevelationCell[] = [];
      const queue = [{ col, row }];
      visited.add(startKey);
      for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        component.push(current);
        [
          { col: current.col + 1, row: current.row },
          { col: current.col - 1, row: current.row },
          { col: current.col, row: current.row + 1 },
          { col: current.col, row: current.row - 1 },
        ].forEach((next) => {
          const key = revelationCellKey(next.col, next.row);
          if (
            next.col < 0 ||
            next.row < 0 ||
            next.col >= revelationCols ||
            next.row >= revelationRows ||
            blocked(next.col, next.row) ||
            visited.has(key)
          ) return;
          visited.add(key);
          queue.push(next);
        });
      }
      components.push(component);
    }
  }

  const largestComponent = components.reduce<RevelationCell[] | null>((largest, component) => (
    !largest || component.length > largest.length ? component : largest
  ), null);
  const capturedRegionKeys = new Set<string>();
  components.forEach((component) => {
    if (component === largestComponent) return;
    component.forEach((cell) => capturedRegionKeys.add(revelationCellKey(cell.col, cell.row)));
  });

  const nextGrid = grid.map((row) => [...row]);
  const capturedKeys = new Set<string>();
  trail.forEach((cell) => {
    if (cell.row >= 0 && cell.col >= 0 && cell.row < revelationRows && cell.col < revelationCols) {
      nextGrid[cell.row][cell.col] = true;
      capturedKeys.add(revelationCellKey(cell.col, cell.row));
    }
  });
  for (let row = 0; row < revelationRows; row += 1) {
    for (let col = 0; col < revelationCols; col += 1) {
      const key = revelationCellKey(col, row);
      if (!grid[row][col] && capturedRegionKeys.has(key)) {
        nextGrid[row][col] = true;
        capturedKeys.add(key);
      }
    }
  }

  const defeatedEnemyIds = new Set<number>();
  enemies.forEach((enemy) => {
    const center = revelationPositionCell(enemy.x, enemy.y);
    const radius = Math.ceil(enemy.size * 0.5);
    for (let row = center.row - radius; row <= center.row + radius; row += 1) {
      for (let col = center.col - radius; col <= center.col + radius; col += 1) {
        if (capturedKeys.has(revelationCellKey(col, row))) defeatedEnemyIds.add(enemy.id);
      }
    }
  });

  return { grid: nextGrid, capturedKeys, defeatedEnemyIds };
}

function cityDirectionVector(direction: CityDirection) {
  if (direction === 'up') return { x: 0, y: -1 };
  if (direction === 'down') return { x: 0, y: 1 };
  if (direction === 'left') return { x: -1, y: 0 };
  return { x: 1, y: 0 };
}

function citySideVector(direction: CityDirection) {
  const vector = cityDirectionVector(direction);
  return { x: -vector.y, y: vector.x };
}

function cityLevelConfig(level: number) {
  return cityLevels[clamp(level, 1, cityMaxLevel) - 1];
}

function cityEmptyAbilityDurations(): CityAbilityDurations {
  return {
    rapid: 0,
    shield: 0,
    freeze: 0,
    pierce: 0,
    spread: 0,
    double: 0,
    magnet: 0,
    dash: 0,
    jam: 0,
  };
}

function cityEmptyWeapons(): CityWeaponState {
  return {
    rapid: false,
    pierce: false,
    spread: false,
    double: false,
  };
}

function cityWeaponFromPowerup(kind: CityPowerupKind): CityWeaponKind | null {
  if (kind === 'speed') return 'rapid';
  if (kind === 'pierce') return 'pierce';
  if (kind === 'spread') return 'spread';
  if (kind === 'double') return 'double';
  return null;
}

function breakthroughLevelConfig(stage: number) {
  return breakthroughLevels[clamp(stage, 1, breakthroughMaxStage) - 1];
}

function breakthroughEmptyUpgrades(): BreakthroughUpgradeState {
  return {
    rapid: 0,
    pierce: 0,
    spread: 0,
    double: 0,
    power: 0,
    charge: 0,
    speed: 0,
  };
}

function breakthroughBaseUpgrades(character: LightBombCharacterId): BreakthroughUpgradeState {
  const upgrades = breakthroughEmptyUpgrades();
  if (character === 'prince') {
    upgrades.pierce = 1;
    upgrades.charge = 1;
  }
  if (character === 'panther') {
    upgrades.rapid = 1;
    upgrades.speed = 1;
  }
  if (character === 'doubleBand') {
    upgrades.spread = 1;
    upgrades.double = 1;
  }
  if (character === 'panda') {
    upgrades.power = 1;
    upgrades.charge = 1;
  }
  return upgrades;
}

function breakthroughUpgradeLevel(current: BreakthroughUpgradeState, kind: BreakthroughUpgradeKind) {
  return clamp(current[kind] ?? 0, 0, breakthroughMaxUpgradeLevel);
}

function breakthroughRaiseUpgrade(current: BreakthroughUpgradeState, kind: BreakthroughUpgradeKind) {
  return {
    ...current,
    [kind]: clamp((current[kind] ?? 0) + 1, 0, breakthroughMaxUpgradeLevel),
  };
}

function breakthroughUpgradeFromPowerup(kind: CityPowerupKind): BreakthroughUpgradeKind | null {
  const weapon = cityWeaponFromPowerup(kind);
  if (weapon) return weapon;
  if (kind === 'blast') return 'power';
  if (kind === 'magnet') return 'charge';
  if (kind === 'dash') return 'speed';
  return null;
}

function breakthroughUpgradeSummary(upgrades: BreakthroughUpgradeState) {
  const active = breakthroughUpgradeOrder
    .filter((kind) => breakthroughUpgradeLevel(upgrades, kind) > 0)
    .map((kind) => `${breakthroughUpgradeLabels[kind]}${breakthroughUpgradeLevel(upgrades, kind)}`);
  return active.length ? active.join(' ') : '初始';
}

function breakthroughRouteCol(row: number) {
  return clamp(5 + Math.round(Math.sin(row * 0.22) * 2 + Math.sin(row * 0.07) * 1.3), 2, breakthroughCols - 3);
}

function breakthroughEffectiveUpgradeLevel(stats: BreakthroughCharacterStats, upgrades: BreakthroughUpgradeState, kind: BreakthroughUpgradeKind) {
  const innate =
    (kind === 'pierce' && stats.piercing) ||
    (kind === 'spread' && stats.spread) ||
    (kind === 'double' && stats.double) ||
    (kind === 'power' && stats.big)
      ? 1
      : 0;
  return clamp(Math.max(innate, upgrades[kind] ?? 0), 0, breakthroughMaxUpgradeLevel);
}

function breakthroughEffectiveMoveMs(stats: BreakthroughCharacterStats, upgrades: BreakthroughUpgradeState) {
  const speedLevel = breakthroughEffectiveUpgradeLevel(stats, upgrades, 'speed');
  return Math.max(92, stats.moveMs * (1 - speedLevel * 0.075));
}

function breakthroughStepMs(stats: BreakthroughCharacterStats, upgrades: BreakthroughUpgradeState) {
  return breakthroughEffectiveMoveMs(stats, upgrades) + breakthroughStepExtraMs;
}

function breakthroughChargeStageForDuration(durationMs: number, chargeLevel: number) {
  const accelerated = durationMs * (1 + chargeLevel * 0.18);
  return cityChargeStageForDuration(accelerated);
}

function directionPadVectorFromDirection(direction: CityDirection): DirectionPadVector {
  const vector = cityDirectionVector(direction);
  return { x: vector.x * 31, y: vector.y * 31 };
}

function directionPadInputFromPointer(clientX: number, clientY: number, target: HTMLElement): DirectionPadInput {
  const rect = target.getBoundingClientRect();
  const dx = clientX - (rect.left + rect.width / 2);
  const dy = clientY - (rect.top + rect.height / 2);
  const size = Math.min(rect.width, rect.height);
  const distance = Math.hypot(dx, dy);
  if (distance < size * 0.1) return { intent: null, vector: { x: 0, y: 0 } };
  const maxOffset = size * 0.31;
  const vectorScale = distance > maxOffset ? maxOffset / distance : 1;
  const vector = { x: dx * vectorScale, y: dy * vectorScale };
  const horizontal: CityDirection = dx > 0 ? 'right' : 'left';
  const vertical: CityDirection = dy > 0 ? 'down' : 'up';
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  let intent: DirectionPadIntent;
  if (absX > absY * 1.8) intent = { primary: horizontal };
  else if (absY > absX * 1.8) intent = { primary: vertical };
  else intent = absX >= absY
    ? { primary: horizontal, secondary: vertical }
    : { primary: vertical, secondary: horizontal };
  return { intent, vector };
}

function directionPadIntentsEqual(a: DirectionPadIntent, b: DirectionPadIntent) {
  return a?.primary === b?.primary && a?.secondary === b?.secondary;
}

function directionPadIntentLabel(intent: DirectionPadIntent) {
  if (!intent) return 'none';
  return intent.secondary ? `${intent.primary}+${intent.secondary}` : intent.primary;
}

function gridNextStepAt(time: number, moved: boolean, timing: GridMoveTiming) {
  return time + (moved ? timing.stepMs : timing.retryMs);
}

function gridTurnBufferAt(currentNextAt: number, time: number, timing: GridMoveTiming) {
  return Math.min(currentNextAt, time + timing.turnBufferMs);
}

function gridDistanceSettled(logical: { x: number; y: number }, visual: { x: number; y: number }, threshold: number) {
  return Math.hypot(visual.x - logical.x, visual.y - logical.y) <= threshold;
}

function gridCellLabel(col: number, row: number) {
  return `${col},${row}`;
}

function cityChargeStageForDuration(durationMs: number): CityChargeStage {
  if (durationMs >= cityChargeStageTwoMs) return 2;
  if (durationMs >= cityChargeStageOneMs) return 1;
  return 0;
}

function cityShotHitRadius(shot: CityShot) {
  return cityCellSize * (shot.chargeStage ? 0.9 : 0.38);
}

function cityShotUnitHitRadius(shot: CityShot) {
  return cityUnitSize * (shot.chargeStage ? 0.98 : 0.62);
}

function cityDirectionToward(from: { x: number; y: number }, to: { x: number; y: number }): CityDirection {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
}

function cityCellCenter(index: number) {
  return (index + 0.5) * cityCellSize;
}

function cityCoordToCell(value: number) {
  return clamp(Math.round(value / cityCellSize - 0.5), 0, cityGridSize - 1);
}

function citySnapToGrid(value: number) {
  return cityCellCenter(clamp(Math.round(value / cityCellSize - 0.5), 0, cityGridSize - 1));
}

function cityApproach(value: number, target: number, maxDelta: number) {
  if (Math.abs(target - value) <= maxDelta) return target;
  return value + Math.sign(target - value) * maxDelta;
}

function cityCellKey(col: number, row: number) {
  return `${col}-${row}`;
}

function cityClusterCells(col: number, row: number, width: number, height: number) {
  const cells: { col: number; row: number }[] = [];
  for (let y = row; y < row + height; y += 1) {
    for (let x = col; x < col + width; x += 1) cells.push({ col: x, row: y });
  }
  return cells;
}

function createCityProtectedCells() {
  const protectedCells = new Set<string>();
  const reserve = (col: number, row: number, width = 1, height = 1) => {
    cityClusterCells(col, row, width, height).forEach((cell) => protectedCells.add(cityCellKey(cell.col, cell.row)));
  };
  reserve(13, 24, 5, 4);
  reserve(13, 27, 6, 5);
  reserve(1, 0, 3, 3);
  reserve(14, 0, 3, 3);
  reserve(28, 0, 3, 3);
  reserve(0, 14, 3, 3);
  reserve(29, 14, 3, 3);
  cityEnemySpawnCells.forEach((spawn) => reserve(spawn.col, spawn.row));
  return protectedCells;
}

function cityCellsAreOpen(cells: { col: number; row: number }[], occupied: Set<string>, protectedCells: Set<string>) {
  return cells.every((cell) => (
    cell.col >= 1 &&
    cell.row >= 1 &&
    cell.col < cityGridSize - 1 &&
    cell.row < cityGridSize - 1 &&
    !occupied.has(cityCellKey(cell.col, cell.row)) &&
    !protectedCells.has(cityCellKey(cell.col, cell.row))
  ));
}

function cityPathExists(blocked: Set<string>, start: { col: number; row: number }, goals: { col: number; row: number }[]) {
  const goalKeys = new Set(goals.map((goal) => cityCellKey(goal.col, goal.row)));
  const startKey = cityCellKey(start.col, start.row);
  if (blocked.has(startKey)) return false;
  const queue = [start];
  const visited = new Set([startKey]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (goalKeys.has(cityCellKey(current.col, current.row))) return true;
    [
      { col: current.col + 1, row: current.row },
      { col: current.col - 1, row: current.row },
      { col: current.col, row: current.row + 1 },
      { col: current.col, row: current.row - 1 },
    ].forEach((next) => {
      const key = cityCellKey(next.col, next.row);
      if (
        next.col < 0 ||
        next.row < 0 ||
        next.col >= cityGridSize ||
        next.row >= cityGridSize ||
        blocked.has(key) ||
        visited.has(key)
      ) return;
      visited.add(key);
      queue.push(next);
    });
  }
  return false;
}

function cityHardRoutesStayOpen(blocked: Set<string>) {
  const goals = [
    { col: 15, row: 26 },
    { col: 14, row: 27 },
    { col: 17, row: 27 },
  ];
  return cityEnemySpawnCells.every((spawn) => cityPathExists(blocked, spawn, goals));
}

function randomWeightedCityPowerupKind(weights: { kind: CityPowerupKind; weight: number }[]) {
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of weights) {
    roll -= item.weight;
    if (roll <= 0) return item.kind;
  }
  return 'speed' as CityPowerupKind;
}

function randomCityPowerupKind() {
  return randomWeightedCityPowerupKind(cityPowerupWeights);
}

function randomBreakthroughPowerupKind() {
  return randomWeightedCityPowerupKind(breakthroughPowerupWeights);
}

function createCityTiles(): CityTile[] {
  const tiles: CityTile[] = [];
  const occupied = new Set<string>();
  const protectedCells = createCityProtectedCells();
  const hardBlocked = new Set<string>();
  const add = (kind: CityTileKind, col: number, row: number) => {
    if (col < 0 || row < 0 || col >= cityGridSize || row >= cityGridSize) return;
    const key = cityCellKey(col, row);
    if (occupied.has(key)) return;
    occupied.add(key);
    tiles.push({
      id: tiles.length + 1,
      kind,
      x: col * cityCellSize,
      y: row * cityCellSize,
      size: cityCellSize,
      hp: kind === 'coral' ? 2 : kind === 'crystal' ? 3 : undefined,
    });
  };
  const block = (kind: CityTileKind, col: number, row: number, width: number, height: number) => {
    for (let y = row; y < row + height; y += 1) {
      for (let x = col; x < col + width; x += 1) add(kind, x, y);
    }
  };
  const tryBlock = (kind: CityTileKind, col: number, row: number, width: number, height: number, hard = false) => {
    const cells = cityClusterCells(col, row, width, height);
    if (!cityCellsAreOpen(cells, occupied, protectedCells)) return false;
    if (hard) {
      const nextHardBlocked = new Set(hardBlocked);
      cells.forEach((cell) => nextHardBlocked.add(cityCellKey(cell.col, cell.row)));
      if (!cityHardRoutesStayOpen(nextHardBlocked)) return false;
      cells.forEach((cell) => hardBlocked.add(cityCellKey(cell.col, cell.row)));
    }
    block(kind, col, row, width, height);
    return true;
  };

  [
    [14, 28],
    [15, 28],
    [16, 28],
    [17, 28],
    [14, 29],
    [17, 29],
    [14, 30],
    [17, 30],
    [14, 31],
    [15, 31],
    [16, 31],
    [17, 31],
  ].forEach(([col, row]) => add('coral', col, row));

  for (let row = 24; row <= 27; row += 1) {
    for (let col = 13; col <= 18; col += 1) {
      if ((col === 15 && row === 26) || (col === 16 && row === 26)) continue;
      if (Math.random() < 0.52) add('rubble', col, row);
    }
  }

  [
    { col: 4, row: 4, width: 2, height: 3 },
    { col: 26, row: 4, width: 2, height: 3 },
    { col: 12, row: 8, width: 2, height: 3 },
    { col: 18, row: 8, width: 2, height: 3 },
    { col: 5, row: 19, width: 3, height: 1 },
    { col: 24, row: 19, width: 3, height: 1 },
  ].forEach((ruin) => tryBlock('stone', ruin.col, ruin.row, ruin.width, ruin.height, true));

  for (let i = 0; i < 20; i += 1) {
    const horizontal = Math.random() < 0.58;
    const width = horizontal ? randomInt(2, 3) : 1;
    const height = horizontal ? 1 : randomInt(2, 3);
    tryBlock('stone', randomInt(2, cityGridSize - width - 2), randomInt(3, 26 - height), width, height, true);
  }

  for (let i = 0; i < 44; i += 1) {
    const horizontal = Math.random() < 0.62;
    const width = horizontal ? randomInt(2, 5) : 1;
    const height = horizontal ? 1 : randomInt(2, 5);
    const kind: CityTileKind = Math.random() < 0.82 ? 'coral' : 'crystal';
    tryBlock(kind, randomInt(2, cityGridSize - width - 2), randomInt(3, 26 - height), width, height);
  }

  for (let i = 0; i < 11; i += 1) {
    const width = randomInt(3, 6);
    const height = randomInt(2, 4);
    tryBlock('seaweed', randomInt(1, cityGridSize - width - 1), randomInt(5, 25 - height), width, height);
  }

  for (let i = 0; i < 7; i += 1) {
    const width = randomInt(4, 7);
    const height = Math.random() < 0.5 ? 1 : 2;
    tryBlock('current', randomInt(2, cityGridSize - width - 2), randomInt(6, 25 - height), width, height);
  }

  for (let i = 0; i < 7; i += 1) {
    const width = randomInt(2, 5);
    const height = randomInt(2, 4);
    tryBlock('trench', randomInt(2, cityGridSize - width - 2), randomInt(6, 26 - height), width, height);
  }

  for (let i = 0; i < 10; i += 1) {
    tryBlock('vent', randomInt(3, cityGridSize - 4), randomInt(5, 25), 1, 1);
  }

  for (let i = 0; i < 54; i += 1) {
    const horizontal = Math.random() < 0.68;
    const width = horizontal ? randomInt(1, 3) : 1;
    const height = horizontal ? 1 : randomInt(1, 3);
    tryBlock('rubble', randomInt(1, cityGridSize - width - 1), randomInt(3, 27 - height), width, height);
  }
  return tiles;
}

function cityRandomEnemySpawn(tiles: CityTile[], occupants: Pick<CityUnit, 'x' | 'y'>[], topHalf = false) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const col = randomInt(2, cityGridSize - 3);
    const row = topHalf ? randomInt(3, 22) : randomInt(3, 26);
    const x = cityCellCenter(col);
    const y = cityCellCenter(row);
    if (Math.hypot(x - cityPlayerStart.x, y - cityPlayerStart.y) < cityCellSize * 6) continue;
    if (Math.hypot(x - cityBase.x, y - cityBase.y) < cityCellSize * 6) continue;
    if (cityCanOccupy(x, y, tiles, occupants)) {
      return { x, y, dir: (['up', 'down', 'left', 'right'] as CityDirection[])[Math.floor(Math.random() * 4)] };
    }
  }
  return null;
}

function chooseCityEnemyKind(config: CityLevelConfig, enemies: CityUnit[], spawnedUrchins: number): CityEnemyKind {
  const anemones = enemies.filter((enemy) => enemy.kind === 'anemone').length;
  const anemoneCap = config.level >= 3 ? 3 : config.level >= 2 ? 2 : 1;
  if (spawnedUrchins < config.urchinTarget) return 'urchin';
  const choices: { kind: CityEnemyKind; weight: number }[] = [{ kind: 'tank', weight: 100 }];
  if (anemones < anemoneCap) choices.push({ kind: 'anemone', weight: config.level >= 2 ? 26 : 18 });
  const total = choices.reduce((sum, choice) => sum + choice.weight, 0);
  let roll = Math.random() * total;
  for (const choice of choices) {
    roll -= choice.weight;
    if (roll <= 0) return choice.kind;
  }
  return 'tank';
}

function cityEnemySpawnForKind(kind: CityEnemyKind, tiles: CityTile[], occupants: Pick<CityUnit, 'x' | 'y'>[]) {
  if (kind === 'tank') {
    const spawns = cityEnemySpawnCells
      .map((spawn) => ({ x: cityCellCenter(spawn.col), y: cityCellCenter(spawn.row), dir: spawn.dir }))
      .filter((spawn) => cityCanOccupy(spawn.x, spawn.y, tiles, occupants));
    if (!spawns.length) return null;
    return spawns[Math.floor(Math.random() * spawns.length)];
  }
  return cityRandomEnemySpawn(tiles, occupants, kind === 'anemone');
}

function createCityEnemy(id: number, tiles: CityTile[], occupants: Pick<CityUnit, 'x' | 'y'>[], config = cityLevelConfig(1), enemies: CityUnit[] = [], spawnedUrchins = 0): CityUnit | null {
  const kind = chooseCityEnemyKind(config, enemies, spawnedUrchins);
  const spawn = cityEnemySpawnForKind(kind, tiles, occupants);
  if (!spawn) return null;
  const elite = Math.random() < config.eliteChance;
  const maxHp = kind === 'anemone' ? 3 : kind === 'urchin' ? 2 : elite ? 2 : 1;
  return {
    id,
    kind,
    x: spawn.x,
    y: spawn.y,
    dir: spawn.dir,
    hp: maxHp,
    maxHp,
    cooldown: (kind === 'anemone' ? 1050 + Math.random() * 700 : 1450 + Math.random() * 950) * config.enemyShotDelayScale,
    turnTimer: (kind === 'urchin' ? 540 + Math.random() * 740 : 760 + Math.random() * 1000) * config.enemyMoveDelayScale,
    moveTimer: (kind === 'anemone' ? Number.POSITIVE_INFINITY : 500 + Math.random() * 480) * config.enemyMoveDelayScale,
    stepDelay: (kind === 'urchin' ? 760 + Math.random() * 220 : 720 + Math.random() * 260) * config.enemyMoveDelayScale,
    poisonTimer: kind === 'urchin' ? 950 + Math.random() * 1100 : undefined,
  };
}

function cityIntersectsRect(x: number, y: number, size: number, rect: { x: number; y: number; size: number }) {
  const half = size / 2;
  return x + half > rect.x && x - half < rect.x + rect.size && y + half > rect.y && y - half < rect.y + rect.size;
}

function cityInsidePoisonCloud(x: number, y: number, clouds: CityPoisonCloud[], time: number) {
  return clouds.some((cloud) => (
    cloud.expiresAt > time &&
    cityIntersectsRect(x, y, cityUnitSize * 0.82, {
      x: cloud.x - cityPoisonCloudSize / 2,
      y: cloud.y - cityPoisonCloudSize / 2,
      size: cityPoisonCloudSize,
    })
  ));
}

function cityTileBlocks(tile: CityTile) {
  return tile.kind === 'coral' || tile.kind === 'stone' || tile.kind === 'crystal';
}

function cityTileBreaks(tile: CityTile) {
  return tile.kind === 'coral' || tile.kind === 'crystal';
}

function cityBlocked(x: number, y: number, size: number, tiles: CityTile[]) {
  if (x < size / 2 || y < size / 2 || x > 100 - size / 2 || y > 100 - size / 2) return true;
  const hitWall = tiles.some((tile) => cityTileBlocks(tile) && cityIntersectsRect(x, y, size, tile));
  const hitBase = cityIntersectsRect(x, y, size, { x: cityBase.x - cityBase.size / 2, y: cityBase.y - cityBase.size / 2, size: cityBase.size });
  return hitWall || hitBase;
}

function citySameGridPosition(a: Pick<CityUnit, 'x' | 'y'>, b: Pick<CityUnit, 'x' | 'y'>) {
  return cityCoordToCell(a.x) === cityCoordToCell(b.x) && cityCoordToCell(a.y) === cityCoordToCell(b.y);
}

function cityStepPosition(unit: Pick<CityUnit, 'x' | 'y'>, direction: CityDirection) {
  const vector = cityDirectionVector(direction);
  return {
    x: cityCellCenter(clamp(cityCoordToCell(unit.x) + vector.x, 0, cityGridSize - 1)),
    y: cityCellCenter(clamp(cityCoordToCell(unit.y) + vector.y, 0, cityGridSize - 1)),
  };
}

function cityOccupied(x: number, y: number, occupants: Pick<CityUnit, 'x' | 'y'>[]) {
  return occupants.some((unit) => citySameGridPosition({ x, y }, unit));
}

function cityCanOccupy(x: number, y: number, tiles: CityTile[], occupants: Pick<CityUnit, 'x' | 'y'>[]) {
  return !cityBlocked(x, y, cityUnitSize, tiles) && !cityOccupied(x, y, occupants);
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
  const inTrench = tiles.some((tile) => tile.kind === 'trench' && cityIntersectsRect(x, y, cityUnitSize * 0.8, tile));
  const inVent = tiles.some((tile) => tile.kind === 'vent' && cityIntersectsRect(x, y, cityUnitSize * 0.8, tile));
  if (inTrench) return 1.55;
  if (inCurrent) return 1.28;
  if (inVent) return 0.9;
  return 1;
}

function cityVisualStep(value: number, target: number, dt: number) {
  return cityApproach(value, target, (cityCellSize * dt) / cityPlayerMoveMs);
}

function citySmoothVisual<T extends { x: number; y: number }>(previous: T | undefined, target: T, dt: number): T {
  if (!previous || Math.hypot(target.x - previous.x, target.y - previous.y) > cityCellSize * 6) return target;
  return {
    ...target,
    x: cityVisualStep(previous.x, target.x, dt),
    y: cityVisualStep(previous.y, target.y, dt),
  };
}

function cityCameraForPosition(x: number, y: number) {
  return {
    x: clamp(x - cityViewWidth / 2, 0, 100 - cityViewWidth),
    y: clamp(y - cityViewHeight / 2, 0, 100 - cityViewHeight),
  };
}

function cityCameraWithDeadZone(previous: { x: number; y: number }, x: number, y: number) {
  let nextX = previous.x;
  let nextY = previous.y;
  const minX = previous.x + cityViewWidth * 0.34;
  const maxX = previous.x + cityViewWidth * 0.66;
  const minY = previous.y + cityViewHeight * 0.34;
  const maxY = previous.y + cityViewHeight * 0.66;

  if (x < minX) nextX = x - cityViewWidth * 0.34;
  if (x > maxX) nextX = x - cityViewWidth * 0.66;
  if (y < minY) nextY = y - cityViewHeight * 0.34;
  if (y > maxY) nextY = y - cityViewHeight * 0.66;

  return {
    x: clamp(nextX, 0, 100 - cityViewWidth),
    y: clamp(nextY, 0, 100 - cityViewHeight),
  };
}

function citySmoothCamera(previous: { x: number; y: number }, target: { x: number; y: number }, dt: number) {
  const maxDelta = (cityCellSize * dt) / 86;
  return {
    x: cityApproach(previous.x, target.x, maxDelta),
    y: cityApproach(previous.y, target.y, maxDelta),
  };
}

function breakthroughKey(row: number, col: number) {
  return `${row}-${col}`;
}

function breakthroughObstacleHp(kind: BreakthroughObstacleKind) {
  if (kind === 'stone') return 999;
  if (kind === 'crystal') return 3;
  if (kind === 'coral') return 2;
  return 1;
}

function breakthroughObstacleBlocks(obstacle?: BreakthroughObstacle) {
  return Boolean(obstacle && obstacle.hp > 0);
}

function breakthroughObstacleBreaks(obstacle?: BreakthroughObstacle) {
  return Boolean(obstacle && obstacle.kind !== 'stone');
}

function createBreakthroughObstacles(config = breakthroughLevelConfig(1)): BreakthroughObstacle[] {
  const obstacles: BreakthroughObstacle[] = [];
  const occupied = new Set<string>();
  const add = (kind: BreakthroughObstacleKind, row: number, col: number) => {
    if (row < 2 || row >= breakthroughRows - 2 || col < 0 || col >= breakthroughCols) return;
    if (Math.abs(row - breakthroughStart.row) <= 3 && Math.abs(col - breakthroughStart.col) <= 3) return;
    if (row <= 5 && Math.abs(col - breakthroughBossStart.col) <= 2) return;
    const key = breakthroughKey(row, col);
    if (occupied.has(key)) return;
    occupied.add(key);
    obstacles.push({ id: obstacles.length + 1, row, col, kind, hp: breakthroughObstacleHp(kind) });
  };

  for (let row = 6; row < breakthroughRows - 5; row += 1) {
    const route = breakthroughRouteCol(row);
    for (let col = 1; col < breakthroughCols - 1; col += 1) {
      const nearRoute = Math.abs(col - route) <= 1;
      const difficulty = 1 - row / breakthroughRows;
      const roll = Math.random();
      if (nearRoute) continue;
      if (roll < (0.08 + difficulty * 0.1) * config.obstacleDensity) add('stone', row, col);
      else if (roll < (0.22 + difficulty * 0.14) * config.obstacleDensity) add(Math.random() < 0.28 ? 'crystal' : 'coral', row, col);
      else if (roll < 0.3 * config.obstacleDensity) add('rubble', row, col);
    }
  }

  for (let row = 10; row < breakthroughRows - 8; row += 8) {
    const gap = breakthroughRouteCol(row);
    for (let col = 1; col < breakthroughCols - 1; col += 1) {
      if (Math.abs(col - gap) <= 1) continue;
      add(Math.random() < 0.7 ? 'coral' : 'crystal', row, col);
    }
  }

  return obstacles;
}

function breakthroughObstacleAt(obstacles: BreakthroughObstacle[], row: number, col: number) {
  return obstacles.find((obstacle) => obstacle.row === row && obstacle.col === col && obstacle.hp > 0);
}

function breakthroughCellBlocked(obstacles: BreakthroughObstacle[], enemies: BreakthroughEnemy[], row: number, col: number) {
  if (row < 0 || row >= breakthroughRows || col < 0 || col >= breakthroughCols) return true;
  if (breakthroughObstacleBlocks(breakthroughObstacleAt(obstacles, row, col))) return true;
  return enemies.some((enemy) => enemy.hp > 0 && Math.round(enemy.y) === row && Math.round(enemy.x) === col);
}

function createBreakthroughEnemy(id: number, kind: BreakthroughEnemy['kind'], row: number, col: number, config = breakthroughLevelConfig(1)): BreakthroughEnemy {
  const maxHp = kind === 'boss' ? config.bossHp : kind === 'anemone' ? 3 + config.stage : kind === 'urchin' ? 2 + config.stage : 1 + config.stage;
  return {
    id,
    kind,
    row,
    col,
    x: col,
    y: row,
    dir: 'down',
    hp: maxHp,
    maxHp,
    cooldown: kind === 'urchin' ? Number.POSITIVE_INFINITY : (600 + Math.random() * 900) * config.enemyShotScale,
    moveAt: performance.now() + (650 + Math.random() * 900) * config.enemyMoveScale,
    poisonAt: kind === 'urchin' ? performance.now() + 1100 + Math.random() * 1200 : undefined,
  };
}

function createBreakthroughEnemies(obstacles: BreakthroughObstacle[], config = breakthroughLevelConfig(1)) {
  const enemies: BreakthroughEnemy[] = [];
  let id = 1;
  const add = (kind: BreakthroughEnemy['kind'], row: number, col: number) => {
    if (breakthroughObstacleAt(obstacles, row, col)) return;
    enemies.push(createBreakthroughEnemy(id++, kind, row, col, config));
  };

  add('boss', breakthroughBossStart.row, breakthroughBossStart.col);
  for (let row = 9; row < breakthroughRows - 8; row += config.enemyStepRows) {
    const sector = row < 22 ? 1 : row < 40 ? 2 : 3;
    add('tank', row, randomInt(2, breakthroughCols - 3));
    if (sector >= 1 && Math.random() < 0.58 + config.extraEnemyChance * 0.35) add('anemone', row + 1, randomInt(1, breakthroughCols - 2));
    if (sector >= 2 && Math.random() < 0.36 + config.extraEnemyChance * 0.4) add('urchin', row + 2, randomInt(2, breakthroughCols - 3));
    if (sector >= 3 && Math.random() < config.extraEnemyChance) add('tank', row + 3, randomInt(1, breakthroughCols - 2));
    if (config.stage >= 3 && Math.random() < 0.42) add('anemone', row + 4, randomInt(1, breakthroughCols - 2));
  }
  return enemies;
}

function createBreakthroughPlayer(character: LightBombCharacterId, carryHp?: number): BreakthroughPlayer {
  const stats = breakthroughCharacterStats[character];
  const hp = clamp(carryHp ?? stats.hp, 1, stats.hp);
  return {
    character,
    row: breakthroughStart.row,
    col: breakthroughStart.col,
    x: breakthroughStart.col,
    y: breakthroughStart.row,
    dir: breakthroughStart.dir,
    hp,
    maxHp: stats.hp,
    cooldown: 0,
  };
}

function breakthroughInsidePoison(row: number, col: number, clouds: BreakthroughPoisonCloud[], time: number) {
  return clouds.some((cloud) => cloud.expiresAt > time && Math.abs(row - cloud.row) <= 2 && Math.abs(col - cloud.col) <= 2);
}

function breakthroughCameraFor(player: { x: number; y: number }) {
  return {
    x: clamp(player.x + 0.5 - breakthroughViewCols / 2, 0, breakthroughCols - breakthroughViewCols),
    y: clamp(player.y + 0.5 - breakthroughViewRows * 0.68, 0, breakthroughRows - breakthroughViewRows),
  };
}

function breakthroughCameraWithDeadZone(previous: { x: number; y: number }, x: number, y: number) {
  let nextX = previous.x;
  let nextY = previous.y;
  const minX = previous.x + breakthroughViewCols * 0.34;
  const maxX = previous.x + breakthroughViewCols * 0.66;
  const minY = previous.y + breakthroughViewRows * 0.3;
  const maxY = previous.y + breakthroughViewRows * 0.7;

  if (x < minX) nextX = x - breakthroughViewCols * 0.34;
  if (x > maxX) nextX = x - breakthroughViewCols * 0.66;
  if (y < minY) nextY = y - breakthroughViewRows * 0.3;
  if (y > maxY) nextY = y - breakthroughViewRows * 0.7;

  return {
    x: clamp(nextX, 0, breakthroughCols - breakthroughViewCols),
    y: clamp(nextY, 0, breakthroughRows - breakthroughViewRows),
  };
}

function breakthroughSmoothCamera(previous: { x: number; y: number }, target: { x: number; y: number }, dt: number) {
  const maxDelta = dt / 86;
  return {
    x: cityApproach(previous.x, target.x, maxDelta),
    y: cityApproach(previous.y, target.y, maxDelta),
  };
}

function breakthroughSmoothCell<T extends { x: number; y: number }>(previous: T | undefined, target: T, dt: number, moveMs = 132): T {
  if (!previous || Math.hypot(target.x - previous.x, target.y - previous.y) > 8) return target;
  const maxDelta = dt / moveMs;
  return {
    ...target,
    x: cityApproach(previous.x, target.x, maxDelta),
    y: cityApproach(previous.y, target.y, maxDelta),
  };
}

function lightBombKey(row: number, col: number) {
  return `${row}-${col}`;
}

function lightBombCellStyle(row: number, col: number): CSSProperties {
  return {
    left: `${(col / lightBombCols) * 100}%`,
    top: `${(row / lightBombRows) * 100}%`,
    width: `${100 / lightBombCols}%`,
    height: `${100 / lightBombRows}%`,
  };
}

function lightBombTokenStyle(x: number, y: number): CSSProperties {
  return {
    left: `${((x + 0.5) / lightBombCols) * 100}%`,
    top: `${((y + 0.5) / lightBombRows) * 100}%`,
  };
}

function lightBombShuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function lightBombLevelConfig(stage: number) {
  return lightBombLevels[clamp(stage, 1, lightBombMaxStage) - 1];
}

function lightBombProtected(row: number, col: number) {
  return (
    (row <= 3 && col <= 3) ||
    (row === 1 && col === 4) ||
    (row === 4 && col === 1)
  );
}

function lightBombTileAt(tiles: LightBombTile[], row: number, col: number) {
  return tiles.find((tile) => tile.row === row && tile.col === col);
}

function lightBombBlocks(tile?: LightBombTile) {
  return tile?.kind === 'solid' || tile?.kind === 'soft';
}

function createLightBombEnemy(id: number, kind: LightBombEnemyKind, row: number, col: number, config = lightBombLevelConfig(1)): LightBombEnemy {
  return {
    id,
    kind,
    row,
    col,
    x: col,
    y: row,
    dir: lightBombDirections[Math.floor(Math.random() * lightBombDirections.length)],
    moveAt: performance.now() + (650 + Math.random() * 850) * config.enemyDelayScale,
  };
}

function lightBombPadVectorFromDirection(direction: CityDirection): LightBombPadVector {
  const vector = cityDirectionVector(direction);
  return { x: vector.x * 31, y: vector.y * 31 };
}

function createLightBombLevel(config = lightBombLevelConfig(1)): LightBombLevel {
  const tiles: LightBombTile[] = [];
  const occupied = new Set<string>();
  let id = 1;
  const addTile = (kind: LightBombTileKind, row: number, col: number) => {
    const key = lightBombKey(row, col);
    if (occupied.has(key)) return;
    occupied.add(key);
    tiles.push({ id: id++, kind, row, col });
  };

  const softCells: { row: number; col: number }[] = [];
  const openCells: { row: number; col: number }[] = [];
  for (let row = 0; row < lightBombRows; row += 1) {
    for (let col = 0; col < lightBombCols; col += 1) {
      const border = row === 0 || col === 0 || row === lightBombRows - 1 || col === lightBombCols - 1;
      const pillar = row % 2 === 0 && col % 2 === 0;
      if (border || pillar) {
        addTile('solid', row, col);
        continue;
      }
      if (lightBombProtected(row, col)) {
        openCells.push({ row, col });
        continue;
      }
      if (Math.random() < 0.62) {
        addTile('soft', row, col);
        softCells.push({ row, col });
      } else {
        openCells.push({ row, col });
      }
    }
  }

  lightBombShuffle(openCells)
    .slice(0, 82)
    .forEach((cell) => {
      if (lightBombProtected(cell.row, cell.col)) return;
      const roll = Math.random();
      const kind: LightBombTileKind = roll < 0.32 ? 'rubble' : roll < 0.55 ? 'kelp' : roll < 0.76 ? 'current' : roll < 0.9 ? 'vent' : 'shell';
      addTile(kind, cell.row, cell.col);
    });

  const farSoft = lightBombShuffle(softCells.filter((cell) => cell.row + cell.col > 20));
  const exit = farSoft[0] ?? { row: lightBombRows - 2, col: lightBombCols - 2 };
  const powerupKinds: LightBombPowerupKind[] = ['flame', 'flame', 'bomb', 'bomb', 'speed', 'speed', 'kick', 'remote', 'shield', 'flame', 'bomb', 'shield'];
  const hiddenPowerups = lightBombShuffle(softCells.filter((cell) => lightBombKey(cell.row, cell.col) !== lightBombKey(exit.row, exit.col)))
    .slice(0, config.powerupCount)
    .map((cell, index) => ({
      id: index + 1,
      row: cell.row,
      col: cell.col,
      kind: powerupKinds[index % powerupKinds.length],
    }));

  const spawnCells = lightBombShuffle(openCells.filter((cell) => Math.abs(cell.row - 1) + Math.abs(cell.col - 1) > 14)).slice(0, config.enemyCount);
  const enemies = spawnCells.map((cell, index) => createLightBombEnemy(100 + index, lightBombEnemyPattern[index % lightBombEnemyPattern.length], cell.row, cell.col, config));

  return { tiles, hiddenPowerups, enemies, exit };
}

function lightBombVisualStep(value: number, target: number, dt: number, moveMs: number) {
  return cityApproach(value, target, dt / moveMs);
}

function lightBombHoldStepMs(player: LightBombPlayer) {
  return Math.max(128, player.moveMs * 0.92);
}

function lightBombCellsEqual(a: { row: number; col: number }, b: { row: number; col: number }) {
  return a.row === b.row && a.col === b.col;
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

function snakeCenteredCamera(cell: SnakeCell) {
  return {
    col: clamp(cell.col + 0.5 - snakeViewCols / 2, 0, snakeCols - snakeViewCols),
    row: clamp(cell.row + 0.5 - snakeViewRows / 2, 0, snakeRows - snakeViewRows),
  };
}

function snakeCameraWithDeadZone(previous: { col: number; row: number }, head: SnakeCell) {
  const headCol = head.col + 0.5;
  const headRow = head.row + 0.5;
  let col = previous.col;
  let row = previous.row;
  const minVisibleCol = col + snakeViewCols * 0.3;
  const maxVisibleCol = col + snakeViewCols * 0.7;
  const minVisibleRow = row + snakeViewRows * 0.32;
  const maxVisibleRow = row + snakeViewRows * 0.68;

  if (headCol < minVisibleCol) col = headCol - snakeViewCols * 0.3;
  if (headCol > maxVisibleCol) col = headCol - snakeViewCols * 0.7;
  if (headRow < minVisibleRow) row = headRow - snakeViewRows * 0.32;
  if (headRow > maxVisibleRow) row = headRow - snakeViewRows * 0.68;

  return {
    col: clamp(col, 0, snakeCols - snakeViewCols),
    row: clamp(row, 0, snakeRows - snakeViewRows),
  };
}

function snakeSmoothCamera(previous: { col: number; row: number }, head: SnakeCell) {
  const target = snakeCameraWithDeadZone(previous, head);
  const nextCol = previous.col + (target.col - previous.col) * 0.28;
  const nextRow = previous.row + (target.row - previous.row) * 0.28;
  return {
    col: Math.abs(target.col - previous.col) < 0.015 ? previous.col : clamp(nextCol, 0, snakeCols - snakeViewCols),
    row: Math.abs(target.row - previous.row) < 0.015 ? previous.row : clamp(nextRow, 0, snakeRows - snakeViewRows),
  };
}

function snakeCellKey(cell: SnakeCell) {
  return `${cell.col}-${cell.row}`;
}

function snakeDistance(a: SnakeCell, b: SnakeCell) {
  const dx = Math.abs(a.col - b.col);
  const dy = Math.abs(a.row - b.row);
  return Math.min(dx, snakeCols - dx) + Math.min(dy, snakeRows - dy);
}

function snakeAllCells(player: SnakeCell[], rivals: SnakeRival[]) {
  return [...player, ...rivals.filter((rival) => rival.alive).flatMap((rival) => rival.cells)];
}

function randomSnakeOpenCell(player: SnakeCell[], rivals: SnakeRival[], foods: SnakeFood[] = [], powerup: SnakePowerup | null = null, minPlayerDistance = 4): SnakeCell {
  const occupied = new Set(snakeAllCells(player, rivals).map(snakeCellKey));
  foods.forEach((food) => occupied.add(snakeCellKey(food)));
  if (powerup) occupied.add(snakeCellKey(powerup));
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const candidate = {
      col: randomInt(1, snakeCols - 2),
      row: randomInt(1, snakeRows - 2),
    };
    if (occupied.has(snakeCellKey(candidate))) continue;
    if (snakeDistance(candidate, player[0] ?? snakeStart[0]) < minPlayerDistance && attempt < 130) continue;
    return candidate;
  }
  return {
    col: randomInt(1, snakeCols - 2),
    row: randomInt(1, snakeRows - 2),
  };
}

function createSnakeFood(id: number, cell: SnakeCell, value = 1, dropped = false): SnakeFood {
  return { id, ...cell, value, dropped };
}

function fillSnakeFoods(player: SnakeCell[], rivals: SnakeRival[], foods: SnakeFood[], nextId: () => number, target = snakeFoodTarget) {
  const nextFoods = [...foods].slice(-snakeMaxFood);
  while (nextFoods.length < target) {
    nextFoods.push(createSnakeFood(nextId(), randomSnakeOpenCell(player, rivals, nextFoods, null, 3), Math.random() < 0.12 ? 2 : 1));
  }
  return nextFoods.slice(-snakeMaxFood);
}

function dropSnakeFoods(cells: SnakeCell[], nextId: () => number, limit = 18) {
  return cells
    .filter((_, index) => index % 2 === 0)
    .slice(0, limit)
    .map((cell, index) => createSnakeFood(nextId(), cell, index < 3 ? 2 : 1, true));
}

function createSnakeRivalSnake(head: SnakeCell, direction: SnakeDirection): SnakeCell[] {
  const reverse = direction === 'up' ? 'down' : direction === 'down' ? 'up' : direction === 'left' ? 'right' : 'left';
  const body1 = wrapSnakeCell(nextSnakeHead(head, reverse));
  const body2 = wrapSnakeCell(nextSnakeHead(body1, reverse));
  return [head, body1, body2];
}

function createSnakeRivals(player: SnakeCell[] = snakeStart): SnakeRival[] {
  const seeds: Array<Pick<SnakeRival, 'name' | 'color' | 'dir'>> = [
    { name: '紫海膽蛇', color: 'urchin', dir: 'left' },
    { name: '機甲烏賊蛇', color: 'squid', dir: 'right' },
    { name: '海葵蛇', color: 'anemone', dir: 'up' },
    { name: '暗潮蛇', color: 'urchin', dir: 'down' },
  ];
  const rivals: SnakeRival[] = [];
  seeds.slice(0, snakeRivalCount).forEach((seed, index) => {
    const head = randomSnakeOpenCell(player, rivals, [], null, 10);
    rivals.push({
      id: index + 1,
      ...seed,
      cells: createSnakeRivalSnake(head, seed.dir),
      score: 0,
      alive: true,
      respawnAt: 0,
    });
  });
  return rivals;
}

function respawnSnakeRival(rival: SnakeRival, player: SnakeCell[], rivals: SnakeRival[], foods: SnakeFood[], time: number): SnakeRival {
  const direction = lightBombDirections[randomInt(0, lightBombDirections.length - 1)] as SnakeDirection;
  const head = randomSnakeOpenCell(player, rivals.filter((other) => other.id !== rival.id), foods, null, 9);
  return {
    ...rival,
    cells: createSnakeRivalSnake(head, direction),
    dir: direction,
    alive: true,
    respawnAt: time + 999999,
  };
}

function snakeGrowth(cells: SnakeCell[], head: SnakeCell, growBy: number) {
  const base = [head, ...cells];
  if (growBy <= 0) return base.slice(0, cells.length);
  const tail = cells[cells.length - 1] ?? head;
  while (base.length < cells.length + growBy) base.push({ ...tail });
  return base.slice(0, cells.length + growBy);
}

function snakeNearestFood(head: SnakeCell, foods: SnakeFood[]) {
  return foods.reduce<SnakeFood | null>((best, food) => (
    !best || snakeDistance(head, food) < snakeDistance(head, best) ? food : best
  ), null);
}

function snakeDirectionScore(from: SnakeCell, direction: SnakeDirection, target: SnakeCell) {
  return snakeDistance(wrapSnakeCell(nextSnakeHead(from, direction)), target);
}

function chooseSnakeRivalDirection(rival: SnakeRival, foods: SnakeFood[], blocked: Set<string>) {
  const head = rival.cells[0];
  const target = snakeNearestFood(head, foods);
  const directions = (['up', 'down', 'left', 'right'] as SnakeDirection[])
    .filter((direction) => !isReverseDirection(rival.dir, direction))
    .sort((a, b) => {
      if (!target) return Math.random() - 0.5;
      return snakeDirectionScore(head, a, target) - snakeDirectionScore(head, b, target);
    });
  return directions.find((direction) => !blocked.has(snakeCellKey(wrapSnakeCell(nextSnakeHead(head, direction))))) ?? rival.dir;
}

function placeSnakePowerup(player: SnakeCell[], rivals: SnakeRival[], foods: SnakeFood[], powerup: SnakePowerup | null): SnakePowerup {
  const kind = snakePowerupKinds[randomInt(0, snakePowerupKinds.length - 1)];
  return {
    ...randomSnakeOpenCell(player, rivals, foods, powerup, 5),
    id: Date.now() + randomInt(0, 9999),
    kind,
    expiresAt: performance.now() + 9000,
  };
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
const breakoutMaxActiveShots = 7;
const breakoutMaxBalls = 8;
const breakoutDefaultPaddleWidth = 24;
const breakoutInitialBallVx = 0.014;
const breakoutInitialBallVy = -0.031;
const breakoutShotIntervalMs = 220;
const breakoutPowerupCooldownMs = 480;
const breakoutBallPowerupChance = 0.12;
const breakoutShotPowerupChance = 0.04;
const breakoutMaxGrowLayers = 3;
const breakoutUltimateChargeMax = 100;
const breakoutUltimateShots = 20;
const breakoutUltimateBallCount = 5;
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

function initialScreenFromQuery(): Screen {
  if (typeof window === 'undefined') return 'title';
  const scene = new URLSearchParams(window.location.search).get('scene');
  const directScreens: Screen[] = ['map', 'combat', 'memory', 'breakout', 'minefield', 'snowfield', 'snake', 'tower', 'city', 'breakthrough', 'lightbomb', 'revelation'];
  return directScreens.includes(scene as Screen) ? scene as Screen : 'title';
}

export default function App() {
  useVisualViewportFrame();
  const [screen, setScreen] = useState<Screen>(() => initialScreenFromQuery());
  const [progress, setProgress] = useState<GameProgress>(() => loadGameProgress());
  const [gameSettings, setGameSettings] = useState<GameSettings>(() => loadGameSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [screenResetKey, setScreenResetKey] = useState(0);
  const [completionNotice, setCompletionNotice] = useState<CompletionNotice | null>(null);
  const [videoLeadIn, setVideoLeadIn] = useState<VideoLeadInConfig>(videoLeadIns.startGame);
  const [videoBackTarget, setVideoBackTarget] = useState<VideoBackTarget>('title');
  const progressRef = useRef(progress);
  const completionNoticeId = useRef(1);

  const recordGameProgress = useCallback((scene: PlayableScene, score = 0) => {
    const safeScore = Number.isFinite(score) ? Math.max(0, Math.round(score)) : 0;
    const current = progressRef.current;
    const previous = current[scene];
    const nextBest = Math.max(previous?.best ?? 0, safeScore);
    const next: GameProgress = {
      ...current,
      [scene]: {
        cleared: true,
        best: nextBest,
        plays: (previous?.plays ?? 0) + 1,
        updatedAt: Date.now(),
      },
    };
    progressRef.current = next;
    setProgress(next);
    saveGameProgress(next);
    setCompletionNotice({
      id: completionNoticeId.current++,
      sceneName: sceneDisplayNames[scene],
      score: safeScore,
      best: nextBest,
      status: previous?.cleared ? (safeScore > (previous.best ?? 0) ? 'record' : 'saved') : 'first',
    });
  }, []);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    setOceanMasterVolume(gameSettings.volume);
    setOceanMuted(gameSettings.muted);
    saveGameSettings(gameSettings);
  }, [gameSettings]);

  useEffect(() => {
    setSettingsOpen(false);
  }, [screen]);

  useEffect(() => {
    resetGlobalGameControls(settingsOpen ? 'settings-open' : 'screen-change');
  }, [screen, screenResetKey, settingsOpen]);

  useEffect(() => {
    setGlobalGamePaused(settingsOpen && isPlayableScreen(screen));
    return () => setGlobalGamePaused(false);
  }, [screen, settingsOpen]);

  useEffect(() => {
    if (!completionNotice) return undefined;
    const timer = window.setTimeout(() => setCompletionNotice(null), 3600);
    return () => window.clearTimeout(timer);
  }, [completionNotice]);

  useEffect(() => {
    const clearControlsAndAudio = () => {
      resetGlobalGameControls('window-interrupt');
      stopOceanBgm();
    };
    const clearControlsOnBlur = () => resetGlobalGameControls('window-blur');
    const stopOnHide = () => {
      if (document.visibilityState === 'hidden') clearControlsAndAudio();
    };
    window.addEventListener('blur', clearControlsOnBlur);
    window.addEventListener('pagehide', clearControlsAndAudio);
    window.addEventListener('beforeunload', clearControlsAndAudio);
    document.addEventListener('visibilitychange', stopOnHide);
    return () => {
      window.removeEventListener('blur', clearControlsOnBlur);
      window.removeEventListener('pagehide', clearControlsAndAudio);
      window.removeEventListener('beforeunload', clearControlsAndAudio);
      document.removeEventListener('visibilitychange', stopOnHide);
      stopOceanBgm();
    };
  }, []);

  const showTitle = useCallback(() => {
    resetGlobalGameControls('show-title');
    stopOceanBgm();
    setScreen('title');
  }, []);

  const showMap = useCallback(() => {
    resetGlobalGameControls('show-map');
    stopOceanBgm();
    setScreen('map');
  }, []);

  const updateGameSettings = useCallback((patch: Partial<GameSettings>) => {
    setGameSettings((current) => ({ ...current, ...patch }));
  }, []);

  const resetProgress = useCallback(() => {
    progressRef.current = {};
    setProgress({});
    setCompletionNotice(null);
    if (typeof window !== 'undefined') window.localStorage.removeItem(progressStorageKey);
    playGameSfx('warning');
  }, []);

  const restartCurrentScreen = useCallback(() => {
    if (!isPlayableScreen(screen)) return;
    resetGlobalGameControls('restart');
    playGameSfx('select');
    setScreenResetKey((value) => value + 1);
    setSettingsOpen(false);
  }, [screen]);

  const returnFromVideoLeadIn = useCallback(() => {
    resetGlobalGameControls('video-back');
    stopOceanBgm();
    playGameSfx('select');
    setScreen(videoBackTarget);
  }, [videoBackTarget]);

  const openVideoLeadIn = (leadIn: VideoLeadInConfig, backTarget: VideoBackTarget = 'map') => {
    resetGlobalGameControls('open-video');
    stopOceanBgm();
    setVideoLeadIn(leadIn);
    setVideoBackTarget(backTarget);
    setScreen('video');
  };
  const openLeadInOrCombat = () => {
    openVideoLeadIn(videoLeadIns.northBorder);
  };
  const startGame = () => {
    openVideoLeadIn(videoLeadIns.startGame, 'title');
  };
  const startCombat = () => {
    resetGlobalGameControls('start-combat');
    void startOceanBgm();
    setScreen('combat');
  };
  const completeVideoLeadIn = () => {
    resetGlobalGameControls('video-complete');
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
      void startOceanBgm('snake', 1);
      setScreen('snake');
      return;
    }
    if (videoLeadIn.destination === 'tower') {
      void startOceanBgm();
      setScreen('tower');
      return;
    }
    if (videoLeadIn.destination === 'city') {
      void startOceanBgm('city', 1.08);
      setScreen('city');
      return;
    }
    if (videoLeadIn.destination === 'lightbomb') {
      void startOceanBgm('lightbomb', 1);
      setScreen('lightbomb');
      return;
    }
    if (videoLeadIn.destination === 'revelation') {
      void startOceanBgm();
      setScreen('revelation');
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
            progress={progress}
            onBack={showTitle}
            onPlay={openLeadInOrCombat}
            onMemory={() => openVideoLeadIn(videoLeadIns.coralStreet)}
            onBreakout={() => openVideoLeadIn(videoLeadIns.iceCastle)}
            onMinefield={() => openVideoLeadIn(videoLeadIns.darkCurrent)}
            onSnowfield={() => openVideoLeadIn(videoLeadIns.snowfieldHighland)}
            onSnake={() => openVideoLeadIn(videoLeadIns.tideTribe)}
            onTower={() => openVideoLeadIn(videoLeadIns.abyssTower)}
            onCity={() => openVideoLeadIn(videoLeadIns.underseaCity)}
            onBreakthrough={() => {
              void startOceanBgm('city', 1.16);
              setScreen('breakthrough');
            }}
            onLightBomb={() => openVideoLeadIn(videoLeadIns.lightBombMaze)}
            onRevelation={() => openVideoLeadIn(videoLeadIns.ancientRevelation)}
          />
        )}
        {screen === 'gallery' && <CharacterGallery onBack={showTitle} />}
        {screen === 'memory' && <MemoryMatchGame key={`memory-${screenResetKey}`} onBack={showMap} onComplete={(score) => recordGameProgress('memory', score)} />}
        {screen === 'breakout' && <IceBreakoutGame key={`breakout-${screenResetKey}`} onBack={showMap} onComplete={(score) => recordGameProgress('breakout', score)} />}
        {screen === 'minefield' && <MinefieldGame key={`minefield-${screenResetKey}`} onBack={showMap} onComplete={(score) => recordGameProgress('minefield', score)} />}
        {screen === 'snowfield' && <SnowfieldGame key={`snowfield-${screenResetKey}`} onBack={showMap} onComplete={(score) => recordGameProgress('snowfield', score)} />}
        {screen === 'snake' && <TideSnakeGame key={`snake-${screenResetKey}`} debugGrid={gameSettings.debugGrid} onBack={showMap} onComplete={(score) => recordGameProgress('snake', score)} />}
        {screen === 'tower' && <AbyssTowerGame key={`tower-${screenResetKey}`} onBack={showMap} onComplete={(score) => recordGameProgress('tower', score)} />}
        {screen === 'city' && <UnderseaCityGame key={`city-${screenResetKey}`} debugGrid={gameSettings.debugGrid} onBack={showMap} onComplete={(score) => recordGameProgress('city', score)} />}
        {screen === 'breakthrough' && <BreakthroughShooterGame key={`breakthrough-${screenResetKey}`} debugGrid={gameSettings.debugGrid} onBack={showMap} onComplete={(score) => recordGameProgress('breakthrough', score)} />}
        {screen === 'lightbomb' && <LightBombMazeGame key={`lightbomb-${screenResetKey}`} debugGrid={gameSettings.debugGrid} onBack={showMap} onComplete={(score) => recordGameProgress('lightbomb', score)} />}
        {screen === 'revelation' && <AncientRevelationGame key={`revelation-${screenResetKey}`} onBack={showMap} onComplete={(score) => recordGameProgress('revelation', score)} />}
        {screen === 'video' && (
          <VideoLeadIn
            leadIn={videoLeadIn}
            backLabel={videoBackTarget === 'title' ? '返回首頁' : '返回地圖'}
            onBack={returnFromVideoLeadIn}
            onComplete={completeVideoLeadIn}
          />
        )}
        {screen === 'combat' && (
          <CombatStage
            key={`combat-${screenResetKey}`}
            onVictory={() => {
              stopOceanBgm();
              recordGameProgress('combat', 1500);
              setScreen('victory');
            }}
            onExit={showMap}
          />
        )}
        {screen === 'victory' && <VictoryCard onMap={showMap} onReplay={openLeadInOrCombat} />}
        <GlobalSettingsPanel
          open={settingsOpen}
          settings={gameSettings}
          canReturnMap={screen !== 'title' && screen !== 'map' && (screen !== 'video' || videoBackTarget === 'map')}
          canRestart={isPlayableScreen(screen)}
          onToggleOpen={() => setSettingsOpen((open) => !open)}
          onClose={() => setSettingsOpen(false)}
          onSettingsChange={updateGameSettings}
          onReturnMap={showMap}
          onRestart={restartCurrentScreen}
          onResetProgress={resetProgress}
        />
        {completionNotice && <CompletionToast notice={completionNotice} />}
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

function CompletionToast({ notice }: { notice: CompletionNotice }) {
  return (
    <div className={`completion-toast ${notice.status}`} key={notice.id} aria-live="polite">
      <span>{completionStatusLabel(notice.status)}</span>
      <strong>{notice.sceneName}</strong>
      <small>
        本局 {formatBestScore(notice.score) || '0'} · 最佳 {formatBestScore(notice.best) || '0'}
      </small>
    </div>
  );
}

function GlobalSettingsPanel({
  open,
  settings,
  canReturnMap,
  canRestart,
  onToggleOpen,
  onClose,
  onSettingsChange,
  onReturnMap,
  onRestart,
  onResetProgress,
}: {
  open: boolean;
  settings: GameSettings;
  canReturnMap: boolean;
  canRestart: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  onSettingsChange: (patch: Partial<GameSettings>) => void;
  onReturnMap: () => void;
  onRestart: () => void;
  onResetProgress: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!open) setConfirmReset(false);
  }, [open]);

  const volumePercent = Math.round(settings.volume * 100);

  return (
    <div
      className={`global-settings ${open ? 'open' : ''}`}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
    >
      <button className="global-settings-toggle" onClick={onToggleOpen} aria-label={open ? '關閉設定' : '開啟設定'}>
        <Settings size={18} />
      </button>
      {open && (
        <>
          <button className="global-settings-scrim" onClick={onClose} aria-label="關閉設定" />
          <div className="settings-panel" role="dialog" aria-label="遊戲設定">
            <div className="settings-panel-head">
              <strong>設定</strong>
              <span>{canRestart ? '暫停中' : '全域'}</span>
              <button className="icon-button" onClick={onClose} aria-label="關閉設定">
                <ChevronUp size={18} />
              </button>
            </div>
            <div className="settings-volume">
              <button
                className={`settings-mute ${settings.muted ? 'muted' : ''}`}
                onClick={() => onSettingsChange({ muted: !settings.muted })}
                aria-label={settings.muted ? '取消靜音' : '靜音'}
              >
                {settings.muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
              </button>
              <label>
                <span>音量 {volumePercent}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volumePercent}
                  onChange={(event) => onSettingsChange({ volume: clamp(Number(event.currentTarget.value) / 100, 0, 1), muted: false })}
                />
              </label>
            </div>
            <label className="settings-toggle-row">
              <input
                type="checkbox"
                checked={settings.debugGrid}
                onChange={(event) => onSettingsChange({ debugGrid: event.currentTarget.checked })}
              />
              <span>QA 格狀移動顯示</span>
            </label>
            <div className="settings-actions">
              <button onClick={onRestart} disabled={!canRestart}>
                <RotateCcw size={17} />
                重新開始
              </button>
              <button onClick={onReturnMap} disabled={!canReturnMap}>
                <Home size={17} />
                回地圖
              </button>
              <button
                className={`settings-danger ${confirmReset ? 'confirm' : ''}`}
                onClick={() => {
                  if (!confirmReset) {
                    setConfirmReset(true);
                    return;
                  }
                  onResetProgress();
                  setConfirmReset(false);
                }}
              >
                <Trash2 size={17} />
                {confirmReset ? '再按一次清除' : '重置進度'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GridDebugOverlay({ title, items }: { title: string; items: GridDebugItem[] }) {
  return (
    <div className="grid-debug-overlay" aria-hidden="true">
      <strong>{title}</strong>
      {items.map((item) => (
        <span key={item.label}>
          <b>{item.label}</b>
          <i>{String(item.value)}</i>
        </span>
      ))}
    </div>
  );
}

function EpisodeMap({
  progress,
  onBack,
  onPlay,
  onMemory,
  onBreakout,
  onMinefield,
  onSnowfield,
  onSnake,
  onTower,
  onCity,
  onBreakthrough,
  onLightBomb,
  onRevelation,
}: {
  progress: GameProgress;
  onBack: () => void;
  onPlay: () => void;
  onMemory: () => void;
  onBreakout: () => void;
  onMinefield: () => void;
  onSnowfield: () => void;
  onSnake: () => void;
  onTower: () => void;
  onCity: () => void;
  onBreakthrough: () => void;
  onLightBomb: () => void;
  onRevelation: () => void;
}) {
  const nodes: {
    name: string;
    scene: PlayableScene;
    style: string;
    onClick: () => void;
  }[] = [
    { name: '冰晶王城', scene: 'breakout', style: 'breakout', onClick: onBreakout },
    { name: '珊瑚老街', scene: 'memory', style: 'memory', onClick: onMemory },
    { name: '北境邊防', scene: 'combat', style: 'shooter', onClick: onPlay },
    { name: '暗流原野', scene: 'minefield', style: 'minefield', onClick: onMinefield },
    { name: '冰雪高原', scene: 'snowfield', style: 'snowfield', onClick: onSnowfield },
    { name: '海潮部落', scene: 'snake', style: 'snake', onClick: onSnake },
    { name: '深淵高塔', scene: 'tower', style: 'tower', onClick: onTower },
    { name: '海底城市', scene: 'city', style: 'city', onClick: onCity },
    { name: '海底突圍', scene: 'breakthrough', style: 'breakthrough', onClick: onBreakthrough },
    { name: '海光迷宮', scene: 'lightbomb', style: 'lightbomb', onClick: onLightBomb },
    { name: '王國冰晶', scene: 'revelation', style: 'revelation', onClick: onRevelation },
  ];
  const clearedCount = nodes.filter(({ scene }) => progress[scene]?.cleared).length;
  const starCount = totalProgressStars(progress);
  return (
    <section className="screen map-screen">
      <Header title="劇情地圖" onBack={onBack} />
      <div className="map-progress-summary">
        <strong>已通關 {clearedCount}/{nodes.length}</strong>
        <span>星等 {starCount}/{nodes.length * 3}</span>
      </div>
      <div className="map-path">
        {nodes.map(({ name, scene, style, onClick }) => {
          const entry = progress[scene];
          const cleared = Boolean(entry?.cleared);
          const best = entry?.best ?? 0;
          const stars = progressStars(scene, entry);
          const nodeLabel = `${name} (${sceneShortHints[scene]})`;
          return (
          <button
            key={name}
            className={`map-node ${style}${cleared ? ' cleared' : ''}`}
            onClick={onClick}
            aria-label={`${nodeLabel}，${cleared ? `已通關，${stars} 星，最佳 ${formatBestScore(best) || '未計分'}` : '尚未通關'}`}
          >
            <span className="map-node-title">
              <b>{nodeLabel}</b>
              <em className="map-node-version">{sceneVersions[scene]}</em>
            </span>
            <small className="map-node-meta">
              {cleared ? (
                <>
                  <em>{formatStars(stars)}</em>
                  {best > 0 && <strong>{formatBestScore(best)}</strong>}
                </>
              ) : (
                '未通關'
              )}
            </small>
          </button>
          );
        })}
      </div>
    </section>
  );
}

function MemoryMatchGame({ onBack, onComplete }: { onBack: () => void; onComplete: GameCompleteHandler }) {
  const [deck, setDeck] = useState<MemoryDeckCard[]>(() => createMemoryDeck());
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [previewed, setPreviewed] = useState<string[]>([]);
  const [locked, setLocked] = useState(true);
  const [hintUsed, setHintUsed] = useState(false);
  const [moves, setMoves] = useState(0);
  const [dialogue, setDialogue] = useState('你能贏我嗎？先看清楚每一張牌。');
  const completionReported = useRef(false);

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
    completionReported.current = false;
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
        playGameSfx('powerup');
      } else {
        setDialogue('你是不是記憶不行？再想想剛剛在哪裡。');
        playGameSfx('hit');
      }
      setFlipped([]);
      setLocked(false);
    }, first && second && first.id === second.id ? 360 : 720);
  }, [deck, flipped]);

  const flipCard = useCallback(
    (card: MemoryDeckCard) => {
      if (locked || won || matchedSet.has(card.deckId) || flipped.includes(card.deckId) || flipped.length >= 2) return;
      playGameSfx('select');
      setFlipped((items) => [...items, card.deckId]);
      if (flipped.length === 1) setMoves((value) => value + 1);
    },
    [flipped, locked, matchedSet, won],
  );

  const useHint = useCallback(() => {
    if (hintUsed || locked || won) return;
    playGameSfx('powerup');
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

  useEffect(() => {
    if (!won || completionReported.current) return;
    completionReported.current = true;
    playGameSfx('door');
    onComplete(Math.max(100, 1600 - moves * 32 - (hintUsed ? 180 : 0)));
  }, [hintUsed, moves, onComplete, won]);

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

function IceBreakoutGame({ onBack, onComplete }: { onBack: () => void; onComplete: GameCompleteHandler }) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useGamePausedRef();
  const nextId = useRef(1);
  const rafRef = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  const shotTimer = useRef(0);
  const growLayerRef = useRef(0);
  const lastPowerupSpawnTime = useRef(-Infinity);
  const paddleRef = useRef(50);
  const paddleWidthRef = useRef(breakoutDefaultPaddleWidth);
  const ballsRef = useRef<IceBall[]>([{ id: 0, x: 50, y: 80, vx: breakoutInitialBallVx, vy: breakoutInitialBallVy, bigHits: 0 }]);
  const powerupsRef = useRef<BreakoutPowerup[]>([]);
  const shotsRef = useRef<IceShot[]>([]);
  const ammoRef = useRef(0);
  const ultimateChargeRef = useRef(0);
  const shieldRef = useRef(3);
  const bricksRef = useRef<IceBrick[]>(createIceBricks());
  const statusRef = useRef<BreakoutStatus>('ready');
  const hitCountRef = useRef(0);
  const scoreRef = useRef(0);
  const completionReported = useRef(false);
  const [paddle, setPaddle] = useState(50);
  const [paddleWidth, setPaddleWidth] = useState(breakoutDefaultPaddleWidth);
  const [balls, setBalls] = useState<IceBall[]>(() => [{ id: 0, x: 50, y: 80, vx: breakoutInitialBallVx, vy: breakoutInitialBallVy, bigHits: 0 }]);
  const [powerups, setPowerups] = useState<BreakoutPowerup[]>([]);
  const [shots, setShots] = useState<IceShot[]>([]);
  const [ammo, setAmmo] = useState(0);
  const [ultimateCharge, setUltimateCharge] = useState(0);
  const [bricks, setBricks] = useState<IceBrick[]>(() => createIceBricks());
  const [shield, setShield] = useState(3);
  const [score, setScore] = useState(0);
  const [hitCount, setHitCount] = useState(0);
  const [status, setStatus] = useState<BreakoutStatus>('ready');
  const [dialogue, setDialogue] = useState('冰晶法陣待命。');

  const resetBall = useCallback((nextPaddle = paddleRef.current) => {
    const direction = Math.random() > 0.5 ? 1 : -1;
    const next = [{ id: nextId.current++, x: nextPaddle, y: 80, vx: direction * breakoutInitialBallVx, vy: breakoutInitialBallVy, bigHits: 0 }];
    ballsRef.current = next;
    setBalls(next);
  }, []);

  const restart = useCallback(() => {
    const nextBricks = createIceBricks();
    const nextBall = [{ id: 0, x: 50, y: 80, vx: breakoutInitialBallVx, vy: breakoutInitialBallVy, bigHits: 0 }];
    nextId.current = 1;
    bricksRef.current = nextBricks;
    ballsRef.current = nextBall;
    powerupsRef.current = [];
    shotsRef.current = [];
    ammoRef.current = 0;
    ultimateChargeRef.current = 0;
    shieldRef.current = 3;
    scoreRef.current = 0;
    completionReported.current = false;
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
    setUltimateCharge(0);
    setPaddle(50);
    setPaddleWidth(breakoutDefaultPaddleWidth);
    setShield(3);
    setScore(0);
    setHitCount(0);
    setStatus('ready');
    setDialogue('冰晶法陣待命。');
  }, []);

  const startRound = useCallback(() => {
    if (statusRef.current !== 'ready') return;
    statusRef.current = 'playing';
    lastTime.current = null;
    setStatus('playing');
    setDialogue('冰晶球已加速展開。');
    playGameSfx('select');
  }, []);

  const triggerUltimate = useCallback(() => {
    if (statusRef.current !== 'playing' || ultimateChargeRef.current < breakoutUltimateChargeMax) return;
    const source = ballsRef.current[0] ?? {
      id: nextId.current++,
      x: paddleRef.current,
      y: 80,
      vx: breakoutInitialBallVx,
      vy: breakoutInitialBallVy,
      bigHits: 0,
    };
    const spread = [-0.044, -0.024, 0, 0.024, 0.044];
    const nextBalls = ballsRef.current.slice(0, breakoutMaxBalls).map((ball) => ({
      ...ball,
      vy: -Math.abs(ball.vy || breakoutInitialBallVy),
      bigHits: Math.max(ball.bigHits, 6),
    }));
    while (nextBalls.length < Math.min(breakoutUltimateBallCount, breakoutMaxBalls)) {
      const index = nextBalls.length;
      nextBalls.push({
        id: nextId.current++,
        x: clamp(source.x + (index - 2) * 1.4, 8, 92),
        y: Math.min(source.y, 80),
        vx: spread[index % spread.length],
        vy: breakoutInitialBallVy * 1.08,
        bigHits: 6,
      });
    }
    ballsRef.current = nextBalls;
    ammoRef.current = Math.min(60, ammoRef.current + breakoutUltimateShots);
    ultimateChargeRef.current = 0;
    setBalls(nextBalls);
    setAmmo(ammoRef.current);
    setUltimateCharge(0);
    setDialogue('冰晶大絕展開，五球連射。');
    playGameSfx('level');
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
    if (status === 'won') playGameSfx('door');
    if (status === 'lost') playGameSfx('hit');
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
      if (pausedRef.current) {
        lastTime.current = time;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const last = lastTime.current ?? time;
      const dt = Math.min(34, time - last);
      lastTime.current = time;

      if (statusRef.current === 'playing') {
        const radius = 1.08;
        const bigRadius = 2.1;
        const paddleWidth = paddleWidthRef.current;
        const paddleY = 91;
        const speedFactor = 1.04 + (breakoutSpeedLevel(hitCountRef.current) - 1) * 0.14;
        let nextBricks = bricksRef.current;
        let nextPowerups = powerupsRef.current;
        let nextShots = shotsRef.current;
        let nextAmmo = ammoRef.current;
        let scoreGain = 0;
        let hitGain = 0;
        let ultimateGain = 0;
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
          ultimateGain += brick.kind === 'core' ? 22 : brick.kind === 'corrupt' ? 14 : 10;
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
              nextBall.vx = clamp(offset * 0.034 + nextBall.vx * 0.28, -0.046, 0.046);
              nextBall.vy = -0.033 - Math.min(0.009, Math.abs(offset) * 0.005);
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
              playGameSfx(isNegativeBreakoutPowerup(powerup.kind) ? 'hit' : 'powerup');
              if (powerup.kind === 'split2') {
                const source = nextBalls[0] ?? { id: nextId.current++, x: paddleRef.current, y: 80, vx: breakoutInitialBallVx, vy: breakoutInitialBallVy, bigHits: 0 };
                if (nextBalls.length < breakoutMaxBalls) {
                  nextBalls.push({ ...source, id: nextId.current++, vx: -source.vx || 0.022, vy: -Math.abs(source.vy || breakoutInitialBallVy) });
                  setDialogue('冰晶球分裂成兩顆。');
                } else {
                  setDialogue('冰晶球已經滿場飛舞，力量轉成分數。');
                  scoreGain += 120;
                }
              }
              if (powerup.kind === 'split5') {
                const source = nextBalls[0] ?? { id: nextId.current++, x: paddleRef.current, y: 80, vx: breakoutInitialBallVx, vy: breakoutInitialBallVy, bigHits: 0 };
                [-0.034, -0.018, 0.018, 0.034].slice(0, Math.max(0, breakoutMaxBalls - nextBalls.length)).forEach((vx) => {
                  nextBalls.push({ ...source, id: nextId.current++, vx, vy: -Math.abs(source.vy || breakoutInitialBallVy) });
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
          scoreRef.current += scoreGain;
          ultimateChargeRef.current = Math.min(breakoutUltimateChargeMax, ultimateChargeRef.current + ultimateGain);
          setHitCount(hitCountRef.current);
          setScore(scoreRef.current);
          setUltimateCharge(ultimateChargeRef.current);
          const nextSpeedLevel = breakoutSpeedLevel(hitCountRef.current);
          setDialogue(lastPoints >= 80 ? `核心鬆動了，球速升到 LV${nextSpeedLevel}。` : `打得好，球速 LV${nextSpeedLevel}。`);
        }

        const remaining = nextBricks.filter((brick) => brick.hp > 0);
        if (remaining.length === 0) {
          statusRef.current = 'won';
          setStatus('won');
          setDialogue('結界修復完成，王城外牆暫時穩住了。');
          if (!completionReported.current) {
            completionReported.current = true;
            onComplete(scoreRef.current + shieldRef.current * 250 + nextBalls.length * 90);
          }
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
  }, [onComplete, resetBall]);

  const remaining = bricks.filter((brick) => brick.hp > 0).length;
  const totalBricks = bricks.length;
  const speedLevel = breakoutSpeedLevel(hitCount);
  const ultimatePercent = Math.round((ultimateCharge / breakoutUltimateChargeMax) * 100);
  const ultimateReady = ultimateCharge >= breakoutUltimateChargeMax;

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
          <span>大絕 {ultimatePercent}%</span>
          <span>{score}</span>
        </div>
        <div className="breakout-callout" key={dialogue}>{dialogue}</div>

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
        <button
          className={`breakout-ultimate ${ultimateReady ? 'ready' : ''}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={triggerUltimate}
          disabled={!ultimateReady || status !== 'playing'}
          aria-label={`冰晶大絕，${ultimateReady ? '可發動' : `充能 ${ultimatePercent}%`}`}
        >
          <Sparkles size={18} />
          <strong>大絕</strong>
          <small>{ultimateReady ? '五球連射' : `${ultimatePercent}%`}</small>
        </button>

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

function MinefieldGame({ onBack, onComplete }: { onBack: () => void; onComplete: GameCompleteHandler }) {
  const longPressTimer = useRef<number | null>(null);
  const longPressedCell = useRef<number | null>(null);
  const completionReported = useRef(false);
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
    completionReported.current = false;
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
      playGameSfx('select');
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
        playGameSfx('hit');
        return;
      }

      nextCells = revealMineCells(seededCells, cell.id);
      const nextRevealed = nextCells.filter((item) => item.revealed && !item.hasMine).length;
      const wonNext = nextRevealed >= safeCount;
      setCells(nextCells);
      setStatus(wonNext ? 'won' : 'playing');
      setDialogue(wonNext ? '路線清出來了，暗流原野暫時安全。' : currentCell.adjacent === 0 ? '黑豹忍者找到一片乾淨水路。' : `周圍有 ${currentCell.adjacent} 個暗雷。`);
      playGameSfx(wonNext ? 'door' : 'select');
      if (wonNext && !completionReported.current) {
        const correctFlags = nextCells.filter((item) => item.flagged && item.hasMine).length;
        completionReported.current = true;
        onComplete(1200 + correctFlags * 80 + Math.max(0, safeCount - flaggedCount) * 6);
      }
    },
    [cells, flaggedCount, mode, onComplete, safeCount, status, toggleFlag],
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

  useGlobalControlReset(clearMineLongPress);

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
            <div className="row-actions">
              <button onClick={restart}>{status === 'won' ? '再探一次' : '重新挑戰'}</button>
              <button className="primary-action" onClick={onBack}>返回地圖</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function createSnowUnits(): SnowUnit[] {
  return [
    { id: 101, side: 'enemy', x: 23, y: 22, hp: 90, cooldown: 1320, moveDir: 1 },
    { id: 102, side: 'enemy', x: 50, y: 18, hp: 90, cooldown: 1480, moveDir: -1 },
    { id: 103, side: 'enemy', x: 77, y: 22, hp: 90, cooldown: 1400, moveDir: 1 },
    { id: 1, side: 'ally', x: 23, y: 76, hp: 105, cooldown: 740, moveDir: 0 },
    { id: 2, side: 'ally', x: 50, y: 82, hp: 105, cooldown: 830, moveDir: 0 },
    { id: 3, side: 'ally', x: 77, y: 76, hp: 105, cooldown: 790, moveDir: 0 },
  ];
}

function SnowfieldGame({ onBack, onComplete }: { onBack: () => void; onComplete: GameCompleteHandler }) {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useGamePausedRef();
  const rafRef = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  const nextSnowballId = useRef(1);
  const nextSnowBarrierId = useRef(1);
  const nextBarrierAt = useRef(3200);
  const unitsRef = useRef<SnowUnit[]>(createSnowUnits());
  const snowballsRef = useRef<Snowball[]>([]);
  const barriersRef = useRef<SnowBarrier[]>([]);
  const draggingRef = useRef<number | null>(null);
  const completionReported = useRef(false);
  const [units, setUnits] = useState<SnowUnit[]>(() => createSnowUnits());
  const [snowballs, setSnowballs] = useState<Snowball[]>([]);
  const [barriers, setBarriers] = useState<SnowBarrier[]>([]);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [dialogue, setDialogue] = useState('雪杖會自己聚雪。站定才能穩穩丟出去。');

  const restart = useCallback(() => {
    const next = createSnowUnits();
    unitsRef.current = next;
    snowballsRef.current = [];
    barriersRef.current = [];
    draggingRef.current = null;
    completionReported.current = false;
    nextSnowballId.current = 1;
    nextSnowBarrierId.current = 1;
    nextBarrierAt.current = 3200;
    lastTime.current = null;
    setUnits(next);
    setSnowballs([]);
    setBarriers([]);
    setStatus('playing');
    setDialogue('雪杖會自己聚雪。站定才能穩穩丟出去。');
  }, []);

  useEffect(() => {
    if (status === 'won') playGameSfx('door');
    if (status === 'lost') playGameSfx('hit');
  }, [status]);

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

  useGlobalControlReset(stopDrag);

  useEffect(() => {
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
    return () => {
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointercancel', stopDrag);
    };
  }, [stopDrag]);

  useEffect(() => {
    const tick = (time: number) => {
      if (pausedRef.current) {
        lastTime.current = time;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const last = lastTime.current ?? time;
      const dt = Math.min(34, time - last);
      lastTime.current = time;

      if (status === 'playing') {
        const nextUnits = unitsRef.current.map((unit) => ({ ...unit }));
        const nextSnowballs: Snowball[] = [];
        const spawned: Snowball[] = [];
        let nextBarriers = barriersRef.current.filter((barrier) => barrier.expiresAt > time);
        if (time >= nextBarrierAt.current) {
          if (nextBarriers.length < 2) {
            nextBarriers = [
              ...nextBarriers,
              {
                id: nextSnowBarrierId.current++,
                x: randomInt(24, 76),
                y: randomInt(52, 67),
                width: randomInt(19, 26),
                height: randomInt(4, 6),
                expiresAt: time + randomInt(5200, 7200),
              },
            ];
            setDialogue('冰晶隔板浮現了，可以暫時躲在後方。');
          }
          nextBarrierAt.current = time + randomInt(6200, 9200);
        }

        nextUnits.forEach((unit) => {
          if (unit.hp <= 0) return;
          if (unit.side === 'enemy') {
            unit.x += unit.moveDir * dt * 0.011;
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
          unit.cooldown = unit.side === 'ally' ? 860 + Math.random() * 220 : 1450 + Math.random() * 380;
        });

        [...snowballsRef.current, ...spawned].forEach((ball) => {
          const moved = {
            ...ball,
            x: ball.x + ball.vx * dt,
            y: ball.y + ball.vy * dt,
          };
          const blockedByBarrier = ball.side === 'enemy' && nextBarriers.some((barrier) => {
            const insideX = moved.x >= barrier.x - barrier.width / 2 && moved.x <= barrier.x + barrier.width / 2;
            const crossedY = ball.y <= barrier.y + barrier.height / 2 && moved.y >= barrier.y - barrier.height / 2;
            const steepEnough = Math.abs(ball.vx) < Math.abs(ball.vy) * 0.52;
            return insideX && crossedY && steepEnough;
          });
          if (blockedByBarrier) {
            playGameSfx('hit');
            return;
          }
          const target = nextUnits.find((unit) => unit.side !== ball.side && unit.hp > 0 && Math.hypot(unit.x - moved.x, unit.y - moved.y) < 5.2);
          if (target) {
            target.hp = Math.max(0, target.hp - 10);
            if (target.hp % 30 === 0 || target.hp <= 0) playGameSfx('hit');
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
          if (!completionReported.current) {
            const allyHp = nextUnits.filter((unit) => unit.side === 'ally').reduce((total, unit) => total + Math.max(0, unit.hp), 0);
            completionReported.current = true;
            onComplete(1100 + allyHp * 5);
          }
        } else if (!alliesAlive) {
          setStatus('lost');
          setDialogue('雪杖陣形被打散了，再調整站位。');
        }

        unitsRef.current = nextUnits;
        snowballsRef.current = nextSnowballs.slice(-24);
        barriersRef.current = nextBarriers;
        setUnits(unitsRef.current);
        setSnowballs(snowballsRef.current);
        setBarriers(nextBarriers);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onComplete, status]);

  const enemiesLeft = units.filter((unit) => unit.side === 'enemy' && unit.hp > 0).length;
  const alliesLeft = units.filter((unit) => unit.side === 'ally' && unit.hp > 0).length;

  return (
    <section className="screen snowfield-screen">
      <div className="snowfield-nav">
        <button className="icon-button" onClick={onBack} aria-label="返回">
          <ChevronLeft size={20} />
        </button>
        <button className="icon-button" onClick={restart} aria-label="重新開始">
          <RotateCcw size={20} />
        </button>
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
          <span>
            隔板 <strong>{barriers.length}/2</strong>
          </span>
        </div>
        <div className="snowfield-notice">{dialogue}</div>
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
        {barriers.map((barrier) => (
          <span
            className="snow-barrier"
            key={barrier.id}
            style={{
              left: `${barrier.x}%`,
              top: `${barrier.y}%`,
              width: `${barrier.width}%`,
              height: `${barrier.height}%`,
            }}
          />
        ))}
        {snowballs.map((ball) => (
          <span className={`snowball ${ball.side}`} key={ball.id} style={{ left: `${ball.x}%`, top: `${ball.y}%` }} />
        ))}
        {(status === 'won' || status === 'lost') && (
          <div className="snowfield-result">
            <strong>{status === 'won' ? '雪線守住' : '雪杖失守'}</strong>
            <div className="row-actions">
              <button onClick={restart}>{status === 'won' ? '再打一場' : '重新布陣'}</button>
              <button className="primary-action" onClick={onBack}>返回地圖</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TideSnakeGame({ debugGrid, onBack, onComplete }: { debugGrid: boolean; onBack: () => void; onComplete: GameCompleteHandler }) {
  const snakeBoardRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useGamePausedRef();
  const snakeRafRef = useRef<number | null>(null);
  const nextSnakeStepAt = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const movePointerRef = useRef<number | null>(null);
  const directionRef = useRef<SnakeDirection>('up');
  const stepDirectionRef = useRef<SnakeDirection>('up');
  const snakeRef = useRef<SnakeCell[]>(snakeStart);
  const snakeCameraRef = useRef(snakeCenteredCamera(snakeStart[0]));
  const nextFoodId = useRef(1);
  const initialRivals = useMemo(() => createSnakeRivals(snakeStart), []);
  const foodsRef = useRef<SnakeFood[]>(fillSnakeFoods(snakeStart, initialRivals, [], () => nextFoodId.current++));
  const rivalsRef = useRef<SnakeRival[]>(initialRivals);
  const powerupRef = useRef<SnakePowerup | null>(null);
  const invincibleUntilRef = useRef(0);
  const boostUntilRef = useRef(0);
  const magnetUntilRef = useRef(0);
  const freezeRivalsUntilRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const statusRef = useRef<SnakeStatus>('ready');
  const nextWrapEffectId = useRef(1);
  const wrapEffectTimer = useRef<number | null>(null);
  const completionReported = useRef(false);
  const [direction, setDirection] = useState<SnakeDirection>('up');
  const [snake, setSnake] = useState<SnakeCell[]>(snakeStart);
  const [snakeCamera, setSnakeCamera] = useState(() => snakeCenteredCamera(snakeStart[0]));
  const [foods, setFoods] = useState<SnakeFood[]>(() => foodsRef.current);
  const [rivals, setRivals] = useState<SnakeRival[]>(initialRivals);
  const [powerup, setPowerup] = useState<SnakePowerup | null>(null);
  const [invincibleUntil, setInvincibleUntil] = useState(0);
  const [boostUntil, setBoostUntil] = useState(0);
  const [magnetUntil, setMagnetUntil] = useState(0);
  const [freezeRivalsUntil, setFreezeRivalsUntil] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [status, setStatus] = useState<SnakeStatus>('ready');
  const [readyNotice, setReadyNotice] = useState<SnakeReadyNotice>({
    title: '海潮待命',
    detail: '拖曳方向鍵開始',
  });
  const [snakeBoardSize, setSnakeBoardSize] = useState({ width: 0, height: 0 });
  const [wrapEffect, setWrapEffect] = useState<SnakeWrapEffect>(null);
  const [skipSnakeTransition, setSkipSnakeTransition] = useState(false);
  const [padDirection, setPadDirection] = useState<CityDirection | null>(null);
  const [padVector, setPadVector] = useState<DirectionPadVector>({ x: 0, y: 0 });
  const nowForPace = performance.now();
  const snakeStepMs = Math.round(Math.max(92, 188 - Math.floor(score / 10) * 8) * (boostUntil > nowForPace ? 0.72 : 1));
  const snakeCellPx = Math.max(22, Math.min((snakeBoardSize.width || 360) / snakeViewCols, (snakeBoardSize.height || 540) / snakeViewRows));
  const snakeViewportWidthPx = snakeCellPx * snakeViewCols;
  const snakeViewportHeightPx = snakeCellPx * snakeViewRows;
  const snakeWorldWidthPx = snakeCellPx * snakeCols;
  const snakeWorldHeightPx = snakeCellPx * snakeRows;
  const snakePositionStyle = useCallback(
    (cell: SnakeCell, extra?: CSSProperties) =>
      ({
        '--snake-x': `${(cell.col + 0.5) * snakeCellPx}px`,
        '--snake-y': `${(cell.row + 0.5) * snakeCellPx}px`,
        ...extra,
      }) as CSSProperties,
    [snakeCellPx],
  );
  const snakeDecorationStyle = useCallback(
    (decor: SnakeDecoration) =>
      ({
        left: `${decor.col * snakeCellPx}px`,
        top: `${decor.row * snakeCellPx}px`,
        width: `${decor.width * snakeCellPx}px`,
        height: `${decor.height * snakeCellPx}px`,
        ['--decor-rotate' as string]: `${decor.rotate ?? 0}deg`,
      }) as CSSProperties,
    [snakeCellPx],
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
    foodsRef.current = foods;
  }, [foods]);

  useEffect(() => {
    rivalsRef.current = rivals;
  }, [rivals]);

  useEffect(() => {
    powerupRef.current = powerup;
  }, [powerup]);

  useEffect(() => {
    invincibleUntilRef.current = invincibleUntil;
  }, [invincibleUntil]);

  useEffect(() => {
    boostUntilRef.current = boostUntil;
  }, [boostUntil]);

  useEffect(() => {
    magnetUntilRef.current = magnetUntil;
  }, [magnetUntil]);

  useEffect(() => {
    freezeRivalsUntilRef.current = freezeRivalsUntil;
  }, [freezeRivalsUntil]);

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
    if (isReverseDirection(stepDirectionRef.current, next)) return;
    if (statusRef.current === 'ready') {
      statusRef.current = 'playing';
      setStatus('playing');
    }
    directionRef.current = next;
    setDirection(next);
  }, []);

  const resetRound = useCallback((nextLives: number, notice: SnakeReadyNotice = { title: '海潮待命', detail: '拖曳方向鍵開始' }, options: { preserveWorld?: boolean } = {}) => {
    if (wrapEffectTimer.current) window.clearTimeout(wrapEffectTimer.current);
    const nextCamera = snakeCenteredCamera(snakeStart[0]);
    wrapEffectTimer.current = null;
    directionRef.current = 'up';
    stepDirectionRef.current = 'up';
    powerupRef.current = null;
    invincibleUntilRef.current = 0;
    boostUntilRef.current = 0;
    magnetUntilRef.current = 0;
    freezeRivalsUntilRef.current = 0;
    snakeRef.current = snakeStart;
    snakeCameraRef.current = nextCamera;
    movePointerRef.current = null;
    if (!options.preserveWorld) {
      const nextRivals = createSnakeRivals(snakeStart);
      const nextFoods = fillSnakeFoods(snakeStart, nextRivals, [], () => nextFoodId.current++);
      rivalsRef.current = nextRivals;
      foodsRef.current = nextFoods;
      setRivals(nextRivals);
      setFoods(nextFoods);
    } else {
      const refilled = fillSnakeFoods(snakeStart, rivalsRef.current, foodsRef.current, () => nextFoodId.current++);
      foodsRef.current = refilled;
      setFoods(refilled);
    }
    setDirection('up');
    setSnake(snakeStart);
    setSnakeCamera(nextCamera);
    setPowerup(null);
    setInvincibleUntil(0);
    setBoostUntil(0);
    setMagnetUntil(0);
    setFreezeRivalsUntil(0);
    setWrapEffect(null);
    setSkipSnakeTransition(false);
    setPadDirection(null);
    setPadVector({ x: 0, y: 0 });
    setLives(nextLives);
    setReadyNotice(notice);
  }, []);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = 3;
    statusRef.current = 'ready';
    completionReported.current = false;
    setOceanBgmIntensity(1);
    setScore(0);
    setStatus('ready');
    resetRound(3, { title: '重新開始', detail: '拖曳方向鍵再出發' });
  }, [resetRound]);

  const loseLife = useCallback((reason: 'self' | 'rival') => {
    const dropped = dropSnakeFoods(snakeRef.current, () => nextFoodId.current++, 20);
    const nextFoodPool = fillSnakeFoods(snakeStart, rivalsRef.current, [...foodsRef.current, ...dropped], () => nextFoodId.current++);
    foodsRef.current = nextFoodPool;
    setFoods(nextFoodPool);
    const nextLives = livesRef.current - 1;
    livesRef.current = nextLives;
    playGameSfx('hit');
    if (nextLives <= 0) {
      statusRef.current = 'lost';
      setLives(0);
      setStatus('lost');
      return;
    }
    statusRef.current = 'ready';
    setStatus('ready');
    resetRound(nextLives, {
      title: reason === 'self' ? '撞到自己，身體化成海光' : '撞上敵蛇，身體化成海光',
      detail: `剩餘 ${nextLives} 命，拖曳方向鍵繼續`,
    }, { preserveWorld: true });
  }, [resetRound]);

  useEffect(() => {
    nextSnakeStepAt.current = 0;
    const tick = (time: number) => {
      try {
        if (pausedRef.current) {
          nextSnakeStepAt.current = time + snakeStepMs;
          return;
        }
        if (statusRef.current !== 'playing') {
          nextSnakeStepAt.current = 0;
          return;
        }
        if (nextSnakeStepAt.current <= 0) nextSnakeStepAt.current = time;
        if (time < nextSnakeStepAt.current) return;
        nextSnakeStepAt.current = time + snakeStepMs;
        const now = time;
      if (powerupRef.current && powerupRef.current.expiresAt <= now) {
        powerupRef.current = null;
        setPowerup(null);
      }
      if (invincibleUntilRef.current > 0 && invincibleUntilRef.current <= now) {
        invincibleUntilRef.current = 0;
        setInvincibleUntil(0);
      }
      if (boostUntilRef.current > 0 && boostUntilRef.current <= now) {
        boostUntilRef.current = 0;
        setBoostUntil(0);
      }
      if (magnetUntilRef.current > 0 && magnetUntilRef.current <= now) {
        magnetUntilRef.current = 0;
        setMagnetUntil(0);
      }
      if (freezeRivalsUntilRef.current > 0 && freezeRivalsUntilRef.current <= now) {
        freezeRivalsUntilRef.current = 0;
        setFreezeRivalsUntil(0);
      }

      const currentSnake = snakeRef.current;
      const moveDirection = directionRef.current;
      const rawHead = nextSnakeHead(currentSnake[0], moveDirection);
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
      const isInvincible = invincibleUntilRef.current > now;
      const magnetActive = magnetUntilRef.current > now;
      const currentRivals = rivalsRef.current.map((rival) => ({ ...rival, cells: rival.cells.map((cell) => ({ ...cell })) }));
      let nextFoods = foodsRef.current.slice(-snakeMaxFood);
      let scoreGain = 0;
      let growBy = 0;

      const collectedFoodIds = new Set<number>();
      nextFoods.forEach((food) => {
        const collected = sameCell(food, head) || (magnetActive && snakeDistance(food, head) <= 2);
        if (!collected) return;
        collectedFoodIds.add(food.id);
        growBy += food.value;
        scoreGain += food.value;
      });
      nextFoods = nextFoods.filter((food) => !collectedFoodIds.has(food.id));

      const pickedPowerup = powerupRef.current && sameCell(powerupRef.current, head) ? powerupRef.current : null;
      if (pickedPowerup) {
        powerupRef.current = null;
        setPowerup(null);
        playGameSfx('powerup');
        if (pickedPowerup.kind === 'shield') {
          invincibleUntilRef.current = now + 5200;
          setInvincibleUntil(invincibleUntilRef.current);
        } else if (pickedPowerup.kind === 'boost') {
          boostUntilRef.current = now + 6500;
          setBoostUntil(boostUntilRef.current);
        } else if (pickedPowerup.kind === 'magnet') {
          magnetUntilRef.current = now + 7600;
          setMagnetUntil(magnetUntilRef.current);
        } else if (pickedPowerup.kind === 'freeze') {
          freezeRivalsUntilRef.current = now + 4200;
          setFreezeRivalsUntil(freezeRivalsUntilRef.current);
        } else if (pickedPowerup.kind === 'feast') {
          growBy += 6;
          scoreGain += 6;
        } else if (pickedPowerup.kind === 'burst') {
          const nearest = currentRivals
            .filter((rival) => rival.alive)
            .sort((a, b) => snakeDistance(a.cells[0], head) - snakeDistance(b.cells[0], head))[0];
          if (nearest && snakeDistance(nearest.cells[0], head) <= 6) {
            nearest.alive = false;
            nearest.respawnAt = now + 4600;
            nextFoods = [...nextFoods, ...dropSnakeFoods(nearest.cells, () => nextFoodId.current++, 18)];
            scoreGain += 8;
            growBy += 3;
            playGameSfx('blast');
          } else {
            scoreGain += 3;
            growBy += 2;
          }
        }
      }

      const rivalHit = currentRivals.find((rival) => rival.alive && rival.cells.some((cell) => sameCell(cell, head)));
      if (rivalHit && isInvincible) {
        rivalHit.alive = false;
        rivalHit.respawnAt = now + 4600;
        nextFoods = [...nextFoods, ...dropSnakeFoods(rivalHit.cells, () => nextFoodId.current++, 18)];
        scoreGain += 6;
        growBy += 2;
        playGameSfx('blast');
      }

      const bodyCells = growBy > 0 ? currentSnake.slice(1) : currentSnake.slice(1, -1);
      const hitSelf = bodyCells.some((cell) => sameCell(cell, head));
      if (hitSelf) {
        loseLife('self');
        return;
      }
      if (rivalHit && !isInvincible) {
        loseLife('rival');
        return;
      }
      const nextSnakeCamera = didWrap ? snakeCenteredCamera(head) : snakeSmoothCamera(snakeCameraRef.current, head);
      snakeCameraRef.current = nextSnakeCamera;
      setSnakeCamera(nextSnakeCamera);

      const nextSnake = snakeGrowth(currentSnake, head, growBy);
      stepDirectionRef.current = moveDirection;
      snakeRef.current = nextSnake;
      setSnake(nextSnake);

      let playerDefeatedByRival = false;
      const frozen = freezeRivalsUntilRef.current > now;
      let nextRivals = currentRivals.map((rival) => {
        if (!rival.alive) {
          return rival.respawnAt <= now ? respawnSnakeRival(rival, nextSnake, currentRivals, nextFoods, now) : rival;
        }
        if (frozen) return rival;

        const otherRivals = currentRivals.filter((other) => other.id !== rival.id && other.alive);
        const blocked = new Set([...nextSnake, ...otherRivals.flatMap((other) => other.cells)].map(snakeCellKey));
        const nextDir = chooseSnakeRivalDirection(rival, nextFoods, blocked);
        const nextHead = wrapSnakeCell(nextSnakeHead(rival.cells[0], nextDir));
        const food = nextFoods.find((item) => sameCell(item, nextHead));
        const rivalGrowBy = food?.value ?? 0;
        if (food) nextFoods = nextFoods.filter((item) => item.id !== food.id);
        const nextCells = snakeGrowth(rival.cells, nextHead, rivalGrowBy);
        const selfBody = rivalGrowBy > 0 ? rival.cells.slice(1) : rival.cells.slice(1, -1);
        const hitSelfRival = selfBody.some((cell) => sameCell(cell, nextHead));
        const hitPlayer = nextSnake.some((cell) => sameCell(cell, nextHead));
        const hitOther = otherRivals.some((other) => other.cells.some((cell) => sameCell(cell, nextHead)));
        if (hitSelfRival || hitOther || hitPlayer) {
          if (hitPlayer && sameCell(nextSnake[0], nextHead) && nextCells.length > nextSnake.length && !isInvincible) {
            playerDefeatedByRival = true;
            return { ...rival, cells: nextCells, dir: nextDir, score: rival.score + rivalGrowBy };
          }
          nextFoods = [...nextFoods, ...dropSnakeFoods(rival.cells, () => nextFoodId.current++, 14)];
          return { ...rival, alive: false, respawnAt: now + 4400 };
        }
        return {
          ...rival,
          cells: nextCells,
          dir: nextDir,
          score: rival.score + rivalGrowBy,
        };
      });

      if (playerDefeatedByRival) {
        rivalsRef.current = nextRivals;
        setRivals(nextRivals);
        foodsRef.current = nextFoods.slice(-snakeMaxFood);
        setFoods(foodsRef.current);
        loseLife('rival');
        return;
      }

      if (scoreGain > 0) {
        const nextScore = scoreRef.current + scoreGain;
        scoreRef.current = nextScore;
        setScore(nextScore);
        setOceanBgmIntensity(1 + Math.min(0.45, nextScore / snakeTarget * 0.45));
        playGameSfx(pickedPowerup?.kind === 'burst' ? 'blast' : 'score');
        if (nextScore >= snakeTarget) {
          statusRef.current = 'won';
          setStatus('won');
          playGameSfx('door');
          if (!completionReported.current) {
            completionReported.current = true;
            onComplete(nextScore * 42 + livesRef.current * 180 + nextSnake.length * 9);
          }
          return;
        }
      }

      nextFoods = fillSnakeFoods(nextSnake, nextRivals, nextFoods, () => nextFoodId.current++);
      nextRivals = nextRivals.map((rival) => (
        !rival.alive && rival.respawnAt <= now ? respawnSnakeRival(rival, nextSnake, nextRivals, nextFoods, now) : rival
      ));
      foodsRef.current = nextFoods.slice(-snakeMaxFood);
      rivalsRef.current = nextRivals;
      setFoods(foodsRef.current);
      setRivals(nextRivals);
      } finally {
        snakeRafRef.current = requestAnimationFrame(tick);
      }
    };
    snakeRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (snakeRafRef.current) cancelAnimationFrame(snakeRafRef.current);
      snakeRafRef.current = null;
      nextSnakeStepAt.current = 0;
    };
  }, [loseLife, onComplete, snakeStepMs]);

  useEffect(
    () => () => {
      if (wrapEffectTimer.current) window.clearTimeout(wrapEffectTimer.current);
    },
    [],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (pausedRef.current) return;
      if (statusRef.current !== 'playing' || powerupRef.current) return;
      const nextPowerup = placeSnakePowerup(snakeRef.current, rivalsRef.current, foodsRef.current, powerupRef.current);
      powerupRef.current = nextPowerup;
      setPowerup(nextPowerup);
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (pausedRef.current) return;
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

  const updateSnakePad = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const input = directionPadInputFromPointer(event.clientX, event.clientY, event.currentTarget);
    setPadDirection(input.intent?.primary ?? null);
    setPadVector(input.intent ? input.vector : { x: 0, y: 0 });
    if (input.intent?.primary) changeDirection(input.intent.primary as SnakeDirection);
  }, [changeDirection]);

  const releaseSnakePad = useCallback((event?: ReactPointerEvent<HTMLDivElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (event && movePointerRef.current !== null && event.pointerId !== movePointerRef.current) return;
    movePointerRef.current = null;
    setPadDirection(null);
    setPadVector({ x: 0, y: 0 });
  }, []);

  useGlobalControlReset(releaseSnakePad);

  useEffect(() => {
    const releaseMatchingPad = (event: PointerEvent) => {
      if (movePointerRef.current === event.pointerId) releaseSnakePad();
    };
    const clearPad = () => releaseSnakePad();
    window.addEventListener('pointerup', releaseMatchingPad);
    window.addEventListener('pointercancel', releaseMatchingPad);
    window.addEventListener('blur', clearPad);
    window.addEventListener('pagehide', clearPad);
    return () => {
      window.removeEventListener('pointerup', releaseMatchingPad);
      window.removeEventListener('pointercancel', releaseMatchingPad);
      window.removeEventListener('blur', clearPad);
      window.removeEventListener('pagehide', clearPad);
    };
  }, [releaseSnakePad]);

  const snakeViewportStyle: CSSProperties = {
    width: `${snakeViewportWidthPx}px`,
    height: `${snakeViewportHeightPx}px`,
    ['--snake-cell-px' as string]: `${snakeCellPx}px`,
    ['--snake-cols' as string]: snakeCols,
    ['--snake-rows' as string]: snakeRows,
    ['--snake-step-ms' as string]: `${snakeStepMs}ms`,
  };
  const snakeWorldStyle: CSSProperties = {
    width: `${snakeWorldWidthPx}px`,
    height: `${snakeWorldHeightPx}px`,
    transform: `translate3d(${-snakeCamera.col * snakeCellPx}px, ${-snakeCamera.row * snakeCellPx}px, 0)`,
  };
  const snakePadStickStyle: CSSProperties = {
    ['--pad-x' as string]: `${padVector.x}px`,
    ['--pad-y' as string]: `${padVector.y}px`,
  };
  const snakeRenderTime = performance.now();
  const snakeInvincibleRemaining = invincibleUntil - snakeRenderTime;
  const snakeInvincibleActive = snakeInvincibleRemaining > 0;
  const snakeInvincibleEnding = snakeInvincibleActive && snakeInvincibleRemaining < 1600;
  const snakeBoostActive = boostUntil > snakeRenderTime;
  const snakeMagnetActive = magnetUntil > snakeRenderTime;
  const snakeFreezeActive = freezeRivalsUntil > snakeRenderTime;
  const aliveRivals = rivals.filter((rival) => rival.alive).length;
  const activeSnakePowerLabel = snakeInvincibleActive ? '護盾' : snakeBoostActive ? '衝刺' : snakeMagnetActive ? '吸引' : snakeFreezeActive ? '凍結' : '';
  const snakeDebugItems: GridDebugItem[] = [
    { label: 'head', value: gridCellLabel(snake[0]?.col ?? 0, snake[0]?.row ?? 0) },
    { label: 'dir', value: direction },
    { label: 'step', value: stepDirectionRef.current },
    { label: 'camera', value: `${snakeCamera.col.toFixed(2)},${snakeCamera.row.toFixed(2)}` },
    { label: 'status', value: status },
    { label: 'tick', value: snakeStepMs },
    { label: 'food', value: foods.length },
    { label: 'rivals', value: aliveRivals },
  ];

  return (
    <section className="screen tide-screen">
      <div className="snake-nav">
        <button className="icon-button" onClick={onBack} aria-label="返回">
          <ChevronLeft size={20} />
        </button>
        <button className="icon-button" onClick={restart} aria-label="重新開始">
          <RotateCcw size={20} />
        </button>
      </div>
      <div className="snake-panel" ref={snakeBoardRef}>
        <div
          className={`snake-board ${skipSnakeTransition ? 'no-snake-transition' : ''}`}
          style={snakeViewportStyle}
          onPointerDown={(event) => {
            touchStart.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => handleSwipeEnd(event.clientX, event.clientY)}
          onPointerCancel={() => {
            touchStart.current = null;
          }}
        >
          <div className="snake-world" style={snakeWorldStyle}>
            {snakeDecorations.map((decor) => (
              <span className={`snake-decor ${decor.kind}`} key={decor.id} style={snakeDecorationStyle(decor)} />
            ))}
            {foods.map((food) => (
              <span className={`snake-food ${food.dropped ? 'dropped' : ''} value-${food.value}`} key={food.id} style={snakePositionStyle(food)} />
            ))}
            {rivals.map((rival) => rival.alive && rival.cells.map((cell, index) => (
              index === 0 ? (
                <img
                  className={`snake-rival-head ${rival.color} face-${rival.dir} ${snakeFreezeActive ? 'frozen' : ''}`}
                  key={`rival-${rival.id}-head`}
                  src={assets.lightBombHeads[rival.color]}
                  alt=""
                  style={snakePositionStyle(cell)}
                />
              ) : (
                <span
                  className={`snake-rival-segment ${rival.color} ${snakeFreezeActive ? 'frozen' : ''}`}
                  key={`rival-${rival.id}-${index}`}
                  style={snakePositionStyle(cell, { opacity: clamp(0.92 - index * 0.03, 0.35, 0.86) })}
                />
              )
            )))}
            {snakeInvincibleActive && (
              <span className={`snake-aura ${snakeInvincibleEnding ? 'ending' : ''}`} style={snakePositionStyle(snake[0])} />
            )}
            {snake.map((cell, index) =>
              index === 0 ? (
                <img
                  className={`snake-head face-${direction} ${snakeInvincibleActive ? 'invincible' : ''} ${snakeInvincibleEnding ? 'ending' : ''}`}
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
            {powerup && (
              <span className={`snake-powerup ${powerup.kind}`} style={snakePositionStyle(powerup)}>
                {snakePowerupLabels[powerup.kind]}
              </span>
            )}
            {wrapEffect && (
              <>
                <span className="snake-portal exit" key={`portal-exit-${wrapEffect.id}`} style={snakePositionStyle(wrapEffect.from)} />
                <span className="snake-portal entry" key={`portal-entry-${wrapEffect.id}`} style={snakePositionStyle(wrapEffect.to)} />
              </>
            )}
          </div>
          <div className="snake-hud">
            <span>
              海光 <strong>{score}/{snakeTarget}</strong>
            </span>
            <span>
              命 <strong>{lives}/3</strong>
            </span>
            <span>
              敵蛇 <strong>{aliveRivals}/{snakeRivalCount}</strong>
            </span>
            {activeSnakePowerLabel && (
              <span className={`snake-invincible ${snakeInvincibleEnding ? 'ending' : ''}`}>
                <Sparkles size={13} />
                {activeSnakePowerLabel}
              </span>
            )}
          </div>
          <div className="snake-minimap">
            <span
              className="view"
              style={{
                left: `${(snakeCamera.col / snakeCols) * 100}%`,
                top: `${(snakeCamera.row / snakeRows) * 100}%`,
                width: `${(snakeViewCols / snakeCols) * 100}%`,
                height: `${(snakeViewRows / snakeRows) * 100}%`,
              }}
            />
            <span className="player" style={{ left: `${((snake[0]?.col ?? 0) / snakeCols) * 100}%`, top: `${((snake[0]?.row ?? 0) / snakeRows) * 100}%` }} />
            {rivals.filter((rival) => rival.alive).map((rival) => (
              <span className={`enemy ${rival.color}`} key={`mini-snake-${rival.id}`} style={{ left: `${(rival.cells[0].col / snakeCols) * 100}%`, top: `${(rival.cells[0].row / snakeRows) * 100}%` }} />
            ))}
            {foods.slice(0, 18).map((food) => (
              <span className="food" key={`mini-food-${food.id}`} style={{ left: `${(food.col / snakeCols) * 100}%`, top: `${(food.row / snakeRows) * 100}%` }} />
            ))}
          </div>
          {status === 'ready' && (
            <div className="snake-ready">
              <strong>{readyNotice.title}</strong>
              <span>{readyNotice.detail}</span>
            </div>
          )}
          {debugGrid && <GridDebugOverlay title="SNAKE GRID" items={snakeDebugItems} />}
          <div
            className={`snake-controls ${padDirection ? `active-${padDirection}` : ''}`}
            aria-label="方向控制"
            onPointerDown={(event) => {
              if (movePointerRef.current !== null) return;
              movePointerRef.current = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
              updateSnakePad(event);
            }}
            onPointerMove={(event) => {
              if (movePointerRef.current === event.pointerId) updateSnakePad(event);
            }}
            onPointerUp={releaseSnakePad}
            onPointerCancel={releaseSnakePad}
            onLostPointerCapture={releaseSnakePad}
          >
            <span className="snake-stick-base" />
            <span className="snake-stick-arrow up"><ChevronUp size={14} /></span>
            <span className="snake-stick-arrow left"><ChevronLeft size={14} /></span>
            <span className="snake-stick-arrow right"><ChevronRight size={14} /></span>
            <span className="snake-stick-arrow down"><ChevronDown size={14} /></span>
            <span className="snake-stick" style={snakePadStickStyle} />
          </div>
          {(status === 'won' || status === 'lost') && (
            <div className="snake-result">
              <strong>{status === 'won' ? '海潮路線完成' : '海潮迷失'}</strong>
              <div className="row-actions">
                <button onClick={restart}>{status === 'won' ? '再跑一次' : '重新挑戰'}</button>
                <button className="primary-action" onClick={onBack}>返回地圖</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AbyssTowerGame({ onBack, onComplete }: { onBack: () => void; onComplete: GameCompleteHandler }) {
  const initialPlatforms = useMemo(() => createTowerPlatforms(), []);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useGamePausedRef();
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
  const completionReported = useRef(false);
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
    completionReported.current = false;
    setDialogue('王子啊，深淵不會等你準備好。');
  }, [syncRound]);

  const startPlaying = useCallback(() => {
    if (statusRef.current !== 'ready') return;
    statusRef.current = 'playing';
    setStatus('playing');
    setDialogue('往下，別被塔頂尖刺追上。');
    playGameSfx('select');
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
        playGameSfx('hit');
        setDialogue(
          reason === 'spike' ? '塔頂尖刺合上了，王子被逼回深淵。' : reason === 'monster' ? '垃圾海葵堵住階梯，王子被拖進暗流。' : '沒有踏上平台，深淵吞掉了路線。',
        );
        return;
      }
      playGameSfx('hit');
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

  const clearTowerControls = useCallback(() => {
    draggingRef.current = false;
    keysRef.current = { left: false, right: false };
    targetXRef.current = playerRef.current.x;
  }, []);

  useGlobalControlReset(clearTowerControls);

  useEffect(() => {
    window.addEventListener('pointerup', clearTowerControls);
    window.addEventListener('pointercancel', clearTowerControls);
    return () => {
      window.removeEventListener('pointerup', clearTowerControls);
      window.removeEventListener('pointercancel', clearTowerControls);
    };
  }, [clearTowerControls]);

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
      if (pausedRef.current) {
        lastTime.current = time;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
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
          playGameSfx('powerup');
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
            playGameSfx('blast');
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
          playGameSfx('door');
          setDialogue('竟然真的下去了……有意思。');
          if (!completionReported.current) {
            completionReported.current = true;
            onComplete(1800 + livesRef.current * 220 + (hoverUntilRef.current > time ? 90 : 0));
          }
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
  }, [loseLife, onComplete]);

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
            <div className="row-actions">
              <button onClick={restart}>{status === 'won' ? '再下一次' : '重新挑戰'}</button>
              <button className="primary-action" onClick={onBack}>返回地圖</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function UnderseaCityGame({ debugGrid, onBack, onComplete }: { debugGrid: boolean; onBack: () => void; onComplete: GameCompleteHandler }) {
  const startingTiles = useMemo(() => createCityTiles(), []);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useGamePausedRef();
  const rafRef = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  const nextId = useRef(1);
  const spawnTimer = useRef(0);
  const noticeId = useRef(0);
  const cityLevelRef = useRef(1);
  const cityUrchinsSpawnedRef = useRef(0);
  const playerRef = useRef({ ...cityPlayerStart, cooldown: 0 });
  const visualPlayerRef = useRef({ ...cityPlayerStart });
  const cameraRef = useRef(cityCameraForPosition(cityPlayerStart.x, cityPlayerStart.y));
  const tilesRef = useRef<CityTile[]>(startingTiles);
  const enemiesRef = useRef<CityUnit[]>([]);
  const visualEnemiesRef = useRef<CityUnit[]>([]);
  const shotsRef = useRef<CityShot[]>([]);
  const powerupsRef = useRef<CityPowerup[]>([]);
  const poisonCloudsRef = useRef<CityPoisonCloud[]>([]);
  const keysRef = useRef({ fire: false });
  const firePointerRef = useRef<number | null>(null);
  const fireChargeStartedAtRef = useRef<number | null>(null);
  const pendingChargeShotRef = useRef<CityChargeStage | null>(null);
  const chargeStageRef = useRef<CityChargeStage | -1>(-1);
  const heldDirectionRef = useRef<DirectionPadIntent>(null);
  const diagonalAxisRef = useRef<'horizontal' | 'vertical'>('horizontal');
  const nextPlayerStepAt = useRef(0);
  const cityMoveDebugRef = useRef({ last: 'ready', attempts: 0, committed: 0 });
  const bankedAbilitiesRef = useRef<CityAbilityDurations>(cityEmptyAbilityDurations());
  const cityWeaponsRef = useRef<CityWeaponState>(cityEmptyWeapons());
  const movePointerRef = useRef<number | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [arenaSize, setArenaSize] = useState({ width: 0, height: 0 });
  const [tiles, setTiles] = useState<CityTile[]>(startingTiles);
  const [visualPlayer, setVisualPlayer] = useState({ ...cityPlayerStart });
  const [visualEnemies, setVisualEnemies] = useState<CityUnit[]>([]);
  const [camera, setCamera] = useState(() => cityCameraForPosition(cityPlayerStart.x, cityPlayerStart.y));
  const [shots, setShots] = useState<CityShot[]>([]);
  const [powerups, setPowerups] = useState<CityPowerup[]>([]);
  const [poisonClouds, setPoisonClouds] = useState<CityPoisonCloud[]>([]);
  const [cityWeapons, setCityWeapons] = useState<CityWeaponState>(cityEmptyWeapons);
  const [baseHp, setBaseHp] = useState(cityStartingBaseHp);
  const [armor, setArmor] = useState(cityStartingArmor);
  const [kills, setKills] = useState(0);
  const [cityLevel, setCityLevel] = useState(1);
  const [status, setStatus] = useState<CityStatus>('playing');
  const [rapidUntil, setRapidUntil] = useState(0);
  const [shieldUntil, setShieldUntil] = useState(0);
  const [freezeUntil, setFreezeUntil] = useState(0);
  const [pierceUntil, setPierceUntil] = useState(0);
  const [spreadUntil, setSpreadUntil] = useState(0);
  const [doubleUntil, setDoubleUntil] = useState(0);
  const [magnetUntil, setMagnetUntil] = useState(0);
  const [dashUntil, setDashUntil] = useState(0);
  const [jamUntil, setJamUntil] = useState(0);
  const [chargeStage, setChargeStage] = useState<CityChargeStage | -1>(-1);
  const [padDirection, setPadDirection] = useState<CityDirection | null>(null);
  const [padVector, setPadVector] = useState<DirectionPadVector>({ x: 0, y: 0 });
  const [notice, setNotice] = useState<CityNotice | null>(null);
  const baseHpRef = useRef(cityStartingBaseHp);
  const armorRef = useRef(cityStartingArmor);
  const killsRef = useRef(0);
  const statusRef = useRef<CityStatus>('playing');
  const completionReported = useRef(false);
  const rapidUntilRef = useRef(0);
  const shieldUntilRef = useRef(0);
  const freezeUntilRef = useRef(0);
  const pierceUntilRef = useRef(0);
  const spreadUntilRef = useRef(0);
  const doubleUntilRef = useRef(0);
  const magnetUntilRef = useRef(0);
  const dashUntilRef = useRef(0);
  const jamUntilRef = useRef(0);

  const showCityNotice = useCallback((kind: CityNoticeKind, text: string) => {
    noticeId.current += 1;
    setNotice({ id: noticeId.current, kind, text });
  }, []);

  const setCityAbilityUntil = useCallback((ability: CityTimedAbility, until: number) => {
    if (ability === 'rapid') {
      rapidUntilRef.current = until;
      setRapidUntil(until);
    }
    if (ability === 'shield') {
      shieldUntilRef.current = until;
      setShieldUntil(until);
    }
    if (ability === 'freeze') {
      freezeUntilRef.current = until;
      setFreezeUntil(until);
    }
    if (ability === 'pierce') {
      pierceUntilRef.current = until;
      setPierceUntil(until);
    }
    if (ability === 'spread') {
      spreadUntilRef.current = until;
      setSpreadUntil(until);
    }
    if (ability === 'double') {
      doubleUntilRef.current = until;
      setDoubleUntil(until);
    }
    if (ability === 'magnet') {
      magnetUntilRef.current = until;
      setMagnetUntil(until);
    }
    if (ability === 'dash') {
      dashUntilRef.current = until;
      setDashUntil(until);
    }
    if (ability === 'jam') {
      jamUntilRef.current = until;
      setJamUntil(until);
    }
  }, []);

  const readCityAbilityDurations = useCallback((time: number): CityAbilityDurations => ({
    rapid: Math.max(0, rapidUntilRef.current - time),
    shield: Math.max(0, shieldUntilRef.current - time),
    freeze: Math.max(0, freezeUntilRef.current - time),
    pierce: Math.max(0, pierceUntilRef.current - time),
    spread: Math.max(0, spreadUntilRef.current - time),
    double: Math.max(0, doubleUntilRef.current - time),
    magnet: Math.max(0, magnetUntilRef.current - time),
    dash: Math.max(0, dashUntilRef.current - time),
    jam: Math.max(0, jamUntilRef.current - time),
  }), []);

  const applyCityAbilityDurations = useCallback((durations: CityAbilityDurations, time: number) => {
    (Object.keys(durations) as CityTimedAbility[]).forEach((ability) => {
      setCityAbilityUntil(ability, durations[ability] > 0 ? time + durations[ability] : 0);
    });
  }, [setCityAbilityUntil]);

  const resetCityAbilities = useCallback(() => {
    applyCityAbilityDurations(cityEmptyAbilityDurations(), performance.now());
    bankedAbilitiesRef.current = cityEmptyAbilityDurations();
  }, [applyCityAbilityDurations]);

  const resetCityWeapons = useCallback(() => {
    const emptyWeapons = cityEmptyWeapons();
    cityWeaponsRef.current = emptyWeapons;
    setCityWeapons(emptyWeapons);
  }, []);

  const activateCityWeapon = useCallback((weapon: CityWeaponKind) => {
    const nextWeapons = { ...cityWeaponsRef.current, [weapon]: true };
    cityWeaponsRef.current = nextWeapons;
    setCityWeapons(nextWeapons);
  }, []);

  const extendCityAbility = useCallback((ability: CityTimedAbility, time: number, duration: number, maxDuration = 12000) => {
    const remaining = readCityAbilityDurations(time)[ability];
    setCityAbilityUntil(ability, time + Math.min(maxDuration, remaining + duration));
  }, [readCityAbilityDurations, setCityAbilityUntil]);

  const startCityLevel = useCallback((level: number, options: { resetAbilities?: boolean; abilityDurations?: CityAbilityDurations; notice?: string } = {}) => {
    const nextTiles = createCityTiles();
    const nextCamera = cityCameraForPosition(cityPlayerStart.x, cityPlayerStart.y);
    const nextLevel = clamp(level, 1, cityMaxLevel);
    const now = performance.now();
    cityLevelRef.current = nextLevel;
    playerRef.current = { ...cityPlayerStart, cooldown: 0 };
    visualPlayerRef.current = { ...cityPlayerStart };
    cameraRef.current = nextCamera;
    tilesRef.current = nextTiles;
    enemiesRef.current = [];
    visualEnemiesRef.current = [];
    shotsRef.current = [];
    powerupsRef.current = [];
    poisonCloudsRef.current = [];
    keysRef.current = { fire: false };
    firePointerRef.current = null;
    fireChargeStartedAtRef.current = null;
    pendingChargeShotRef.current = null;
    chargeStageRef.current = -1;
    heldDirectionRef.current = null;
    diagonalAxisRef.current = 'horizontal';
    movePointerRef.current = null;
    nextPlayerStepAt.current = 0;
    cityMoveDebugRef.current = { last: 'ready', attempts: 0, committed: 0 };
    spawnTimer.current = 0;
    cityUrchinsSpawnedRef.current = 0;
    nextId.current = 1;
    lastTime.current = null;
    baseHpRef.current = cityStartingBaseHp;
    armorRef.current = cityStartingArmor;
    killsRef.current = 0;
    statusRef.current = 'playing';
    setTiles(nextTiles);
    setVisualPlayer({ ...cityPlayerStart });
    setVisualEnemies([]);
    setCamera(nextCamera);
    setShots([]);
    setPowerups([]);
    setPoisonClouds([]);
    setBaseHp(cityStartingBaseHp);
    setArmor(cityStartingArmor);
    setKills(0);
    setCityLevel(nextLevel);
    setStatus('playing');
    setChargeStage(-1);
    setPadDirection(null);
    setPadVector({ x: 0, y: 0 });
    if (options.resetAbilities) {
      resetCityAbilities();
      resetCityWeapons();
    } else if (options.abilityDurations) {
      applyCityAbilityDurations(options.abilityDurations, now);
    }
    setOceanBgmIntensity(1.08 + (nextLevel - 1) * 0.22);
    showCityNotice('spawn', options.notice ?? cityLevelConfig(nextLevel).title);
  }, [applyCityAbilityDurations, resetCityAbilities, resetCityWeapons, showCityNotice]);

  const restart = useCallback(() => {
    completionReported.current = false;
    startCityLevel(1, { resetAbilities: true, notice: '第一防線' });
  }, [startCityLevel]);

  const continueCity = useCallback(() => {
    const banked = bankedAbilitiesRef.current;
    bankedAbilitiesRef.current = cityEmptyAbilityDurations();
    startCityLevel(cityLevelRef.current, { abilityDurations: banked, notice: '半能量續戰' });
  }, [startCityLevel]);

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

  const cityPlayerSettled = useCallback(() => (
    gridDistanceSettled(playerRef.current, visualPlayerRef.current, cityCellSize * 0.1)
  ), []);

  const movePlayerStep = useCallback((direction: CityDirection) => {
    const currentPlayer = { ...playerRef.current, dir: direction };
    cityMoveDebugRef.current.attempts += 1;
    if (!cityPlayerSettled()) {
      playerRef.current = currentPlayer;
      cityMoveDebugRef.current.last = 'busy';
      return false;
    }
    const next = cityStepPosition(currentPlayer, direction);
    const blockedByWall = cityBlocked(next.x, next.y, cityUnitSize, tilesRef.current);
    const blockedByUnit = cityOccupied(next.x, next.y, enemiesRef.current);
    if (statusRef.current === 'playing' && !blockedByWall && !blockedByUnit) {
      currentPlayer.x = next.x;
      currentPlayer.y = next.y;
      playerRef.current = currentPlayer;
      cityMoveDebugRef.current.committed += 1;
      cityMoveDebugRef.current.last = 'moved';
      playGameSfx('step');
      return true;
    }
    playerRef.current = currentPlayer;
    cityMoveDebugRef.current.last = blockedByWall ? 'blocked' : blockedByUnit ? 'unit' : 'stopped';
    return false;
  }, [cityPlayerSettled]);

  const facePlayerDirection = useCallback((direction: CityDirection) => {
    if (playerRef.current.dir === direction) return;
    playerRef.current = { ...playerRef.current, dir: direction };
    visualPlayerRef.current = { ...visualPlayerRef.current, dir: direction };
    setVisualPlayer((current) => ({ ...current, dir: direction }));
  }, []);

  const movePlayerIntent = useCallback((intent: DirectionPadIntent) => {
    if (!intent) return false;
    if (intent.secondary) {
      const directions = [intent.primary, intent.secondary];
      const horizontal = directions.find((direction) => direction === 'left' || direction === 'right');
      const vertical = directions.find((direction) => direction === 'up' || direction === 'down');
      const ordered = diagonalAxisRef.current === 'horizontal'
        ? [horizontal, vertical]
        : [vertical, horizontal];
      const moved = ordered.some((direction) => direction ? movePlayerStep(direction) : false);
      if (moved) {
        diagonalAxisRef.current = diagonalAxisRef.current === 'horizontal' ? 'vertical' : 'horizontal';
      }
      return moved;
    }
    return movePlayerStep(intent.primary);
  }, [movePlayerStep]);

  const holdPlayerDirection = useCallback((intent: DirectionPadIntent, vector: DirectionPadVector = { x: 0, y: 0 }, startTime = performance.now()) => {
    const wasHolding = heldDirectionRef.current !== null;
    const sameIntent = directionPadIntentsEqual(heldDirectionRef.current, intent);
    heldDirectionRef.current = intent;
    setPadDirection(intent?.primary ?? null);
    setPadVector(intent ? vector : { x: 0, y: 0 });
    if (!intent) {
      diagonalAxisRef.current = 'horizontal';
      nextPlayerStepAt.current = Number.POSITIVE_INFINITY;
      return;
    }
    if (!sameIntent) {
      facePlayerDirection(intent.primary);
    }
    if (intent.secondary && !sameIntent) {
      diagonalAxisRef.current = 'horizontal';
    }
    const playerPace = cityInsidePoisonCloud(playerRef.current.x, playerRef.current.y, poisonCloudsRef.current, startTime) ? cityPoisonSlowScale : 1;
    if (!wasHolding) {
      const moved = movePlayerIntent(intent);
      nextPlayerStepAt.current = gridNextStepAt(startTime, moved, {
        stepMs: (dashUntilRef.current > startTime ? 118 : cityPlayerStepDelayMs) / playerPace,
        retryMs: cityTurnRetryMs / playerPace,
        turnBufferMs: cityTurnBufferMs,
      });
    } else if (!sameIntent) {
      nextPlayerStepAt.current = gridTurnBufferAt(nextPlayerStepAt.current, startTime, {
        stepMs: cityPlayerStepDelayMs / playerPace,
        retryMs: cityTurnRetryMs / playerPace,
        turnBufferMs: cityTurnBufferMs,
      });
    }
  }, [facePlayerDirection, movePlayerIntent]);

  const setFirePressed = useCallback((pressed: boolean, options: { releaseShot?: boolean } = {}) => {
    const now = performance.now();
    if (pressed) {
      if (statusRef.current !== 'playing' || keysRef.current.fire) return;
      keysRef.current.fire = true;
      fireChargeStartedAtRef.current = now;
      chargeStageRef.current = 0;
      setChargeStage(0);
      return;
    }
    if (!keysRef.current.fire) {
      chargeStageRef.current = -1;
      fireChargeStartedAtRef.current = null;
      setChargeStage(-1);
      return;
    }
    const stage = cityChargeStageForDuration(now - (fireChargeStartedAtRef.current ?? now));
    keysRef.current.fire = false;
    fireChargeStartedAtRef.current = null;
    chargeStageRef.current = -1;
    setChargeStage(-1);
    if (options.releaseShot !== false && statusRef.current === 'playing') {
      pendingChargeShotRef.current = Math.max(pendingChargeShotRef.current ?? 0, stage) as CityChargeStage;
    }
  }, []);

  const finishSwipeMove = useCallback((clientX: number, clientY: number) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const dx = clientX - start.x;
    const dy = clientY - start.y;
    if (Math.hypot(dx, dy) < 18) return;
    movePlayerStep(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  }, [movePlayerStep]);

  const updateMovePad = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const input = directionPadInputFromPointer(event.clientX, event.clientY, event.currentTarget);
    holdPlayerDirection(input.intent, input.vector);
  }, [holdPlayerDirection]);

  const releaseMovePad = useCallback((event?: ReactPointerEvent<HTMLDivElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (event && movePointerRef.current !== null && event.pointerId !== movePointerRef.current) return;
    movePointerRef.current = null;
    holdPlayerDirection(null);
  }, [holdPlayerDirection]);

  const pressCityFire = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (firePointerRef.current !== null) return;
    firePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setFirePressed(true);
  }, [setFirePressed]);

  const releaseCityFire = useCallback((event?: ReactPointerEvent<HTMLButtonElement>, releaseShot = true) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (event && firePointerRef.current !== null && event.pointerId !== firePointerRef.current) return;
    firePointerRef.current = null;
    setFirePressed(false, { releaseShot });
  }, [setFirePressed]);

  const clearCityControls = useCallback(() => {
    releaseMovePad();
    releaseCityFire(undefined, false);
  }, [releaseCityFire, releaseMovePad]);

  useGlobalControlReset(clearCityControls);

  useEffect(() => {
    const releaseMatchingMove = (event: PointerEvent) => {
      if (movePointerRef.current === event.pointerId) releaseMovePad();
    };
    const releaseMatchingFire = (event: PointerEvent) => {
      if (firePointerRef.current === event.pointerId) releaseCityFire();
    };
    const cancelMatchingFire = (event: PointerEvent) => {
      if (firePointerRef.current === event.pointerId) releaseCityFire(undefined, false);
    };
    window.addEventListener('pointerup', releaseMatchingMove);
    window.addEventListener('pointerup', releaseMatchingFire);
    window.addEventListener('pointercancel', releaseMatchingMove);
    window.addEventListener('pointercancel', cancelMatchingFire);
    window.addEventListener('blur', clearCityControls);
    window.addEventListener('pagehide', clearCityControls);
    return () => {
      window.removeEventListener('pointerup', releaseMatchingMove);
      window.removeEventListener('pointerup', releaseMatchingFire);
      window.removeEventListener('pointercancel', releaseMatchingMove);
      window.removeEventListener('pointercancel', cancelMatchingFire);
      window.removeEventListener('blur', clearCityControls);
      window.removeEventListener('pagehide', clearCityControls);
    };
  }, [clearCityControls, releaseCityFire, releaseMovePad]);

  useEffect(() => {
    const directionFromKey = (event: KeyboardEvent): CityDirection | null => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') return 'up';
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') return 'down';
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') return 'left';
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') return 'right';
      return null;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = directionFromKey(event);
      if (direction && heldDirectionRef.current?.primary !== direction) {
        holdPlayerDirection({ primary: direction }, directionPadVectorFromDirection(direction));
        event.preventDefault();
      }
      if (event.key === ' ' || event.key.toLowerCase() === 'j' || event.key.toLowerCase() === 'k') {
        setFirePressed(true);
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const direction = directionFromKey(event);
      if (direction && heldDirectionRef.current?.primary === direction) {
        holdPlayerDirection(null);
        event.preventDefault();
      }
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
  }, [holdPlayerDirection, setFirePressed]);

  useEffect(() => {
    const tick = (time: number) => {
      if (pausedRef.current) {
        lastTime.current = time;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const last = lastTime.current ?? time;
      const dt = Math.min(34, time - last);
      lastTime.current = time;

      if (statusRef.current === 'playing') {
        const cityConfig = cityLevelConfig(cityLevelRef.current);
        const dashActive = dashUntilRef.current > time;
        const playerPoisoned = cityInsidePoisonCloud(playerRef.current.x, playerRef.current.y, poisonCloudsRef.current, time);
        const playerPace = playerPoisoned ? cityPoisonSlowScale : 1;
        const heldIntent = heldDirectionRef.current;
        if (heldIntent && time >= nextPlayerStepAt.current) {
          const moved = movePlayerIntent(heldIntent);
          nextPlayerStepAt.current = gridNextStepAt(time, moved, {
            stepMs: (dashActive ? 118 : cityPlayerStepDelayMs) / playerPace,
            retryMs: cityTurnRetryMs / playerPace,
            turnBufferMs: cityTurnBufferMs,
          });
        }
        const currentTiles = tilesRef.current;
        const currentPlayer = { ...playerRef.current };
        currentPlayer.cooldown -= dt * playerPace;
        const activeWeapons = cityWeaponsRef.current;
        const rapid = rapidUntilRef.current > time || activeWeapons.rapid;
        const piercing = pierceUntilRef.current > time || activeWeapons.pierce;
        const spread = spreadUntilRef.current > time || activeWeapons.spread;
        const double = doubleUntilRef.current > time || activeWeapons.double;
        const magnet = magnetUntilRef.current > time;
        if (keysRef.current.fire) {
          const nextChargeStage = cityChargeStageForDuration(time - (fireChargeStartedAtRef.current ?? time));
          if (chargeStageRef.current !== nextChargeStage) {
            chargeStageRef.current = nextChargeStage;
            setChargeStage(nextChargeStage);
            if (nextChargeStage > 0) playGameSfx('powerup');
          }
        }
        const chargeToFire = pendingChargeShotRef.current;
        if (chargeToFire !== null && currentPlayer.cooldown <= 0) {
          pendingChargeShotRef.current = null;
          const vector = cityDirectionVector(currentPlayer.dir);
          const side = citySideVector(currentPlayer.dir);
          const charged = chargeToFire > 0;
          const shotSpeed = charged ? 0.062 : piercing ? 0.056 : 0.052;
          const damage = chargeToFire === 2 ? 2 : 1;
          const makeAllyShot = (sideOffset: number, sideVelocity: number, flags: Pick<CityShot, 'spread' | 'double'> = {}): CityShot => ({
            id: nextId.current++,
            side: 'ally',
            x: currentPlayer.x + vector.x * cityCellSize * (charged ? 0.78 : 0.62) + side.x * cityCellSize * sideOffset,
            y: currentPlayer.y + vector.y * cityCellSize * (charged ? 0.78 : 0.62) + side.y * cityCellSize * sideOffset,
            vx: vector.x * shotSpeed + side.x * sideVelocity,
            vy: vector.y * shotSpeed + side.y * sideVelocity,
            dir: currentPlayer.dir,
            piercing: piercing || charged,
            chargeStage: charged ? chargeToFire : undefined,
            damage,
            ...flags,
          });
          const allyShots = [makeAllyShot(0, 0)];
          if (!charged && double) {
            allyShots.push(makeAllyShot(0.36, 0, { double: true }), makeAllyShot(-0.36, 0, { double: true }));
          }
          if (!charged && spread) {
            allyShots.push(makeAllyShot(0, 0.021, { spread: true }), makeAllyShot(0, -0.021, { spread: true }));
          }
          shotsRef.current = [
            ...shotsRef.current,
            ...allyShots,
          ].slice(-30);
          playGameSfx(charged ? 'blast' : 'shoot');
          currentPlayer.cooldown = charged ? (chargeToFire === 2 ? 980 : 820) : rapid ? 390 : 650;
          if (!charged && spread) {
            currentPlayer.cooldown += 90;
          }
          if (!charged && double) {
            currentPlayer.cooldown += 60;
          }
        }

        spawnTimer.current += dt;
        let nextEnemies = enemiesRef.current.map((enemy) => ({ ...enemy }));
        if (spawnTimer.current >= cityConfig.spawnMs && nextEnemies.length < cityConfig.enemyCap && killsRef.current + nextEnemies.length < cityConfig.targetKills) {
          spawnTimer.current = 0;
          const spawned = createCityEnemy(nextId.current++, currentTiles, [currentPlayer, ...nextEnemies], cityConfig, nextEnemies, cityUrchinsSpawnedRef.current);
          if (spawned) {
            if (spawned.kind === 'urchin') cityUrchinsSpawnedRef.current += 1;
            nextEnemies.push(spawned);
          }
        }

        const frozen = freezeUntilRef.current > time;
        const jammed = jamUntilRef.current > time;
        const enemyPace = frozen ? 0.42 : 1;
        const enemyShots: CityShot[] = [];
        const movedEnemies: CityUnit[] = [];
        let nextPoisonClouds = poisonCloudsRef.current.filter((cloud) => cloud.expiresAt > time);
        nextEnemies = nextEnemies.map((enemy) => {
          const nextEnemy = { ...enemy };
          const activeEnemyPace = nextEnemy.kind === 'anemone' ? 1 : enemyPace;
          nextEnemy.turnTimer -= dt * (jammed ? 0.65 : activeEnemyPace);
          if (nextEnemy.kind !== 'anemone') nextEnemy.moveTimer -= dt * activeEnemyPace;
          if (nextEnemy.turnTimer <= 0) {
            nextEnemy.turnTimer = (nextEnemy.kind === 'urchin' ? 600 + Math.random() * 900 : 900 + Math.random() * 1200) * cityConfig.enemyMoveDelayScale;
            if (nextEnemy.kind === 'urchin') {
              nextEnemy.dir = (['up', 'down', 'left', 'right'] as CityDirection[])[Math.floor(Math.random() * 4)];
            } else if (Math.random() < 0.72) {
              nextEnemy.dir = cityDirectionToward(nextEnemy, Math.random() < 0.58 ? cityBase : currentPlayer);
            } else {
              nextEnemy.dir = (['up', 'down', 'left', 'right'] as CityDirection[])[Math.floor(Math.random() * 4)];
            }
          }
          if (nextEnemy.kind === 'urchin') {
            nextEnemy.poisonTimer = (nextEnemy.poisonTimer ?? 0) - dt * activeEnemyPace;
            if (!jammed && nextEnemy.poisonTimer <= 0) {
              nextPoisonClouds = [
                ...nextPoisonClouds,
                {
                  id: nextId.current++,
                  x: nextEnemy.x,
                  y: nextEnemy.y,
                  expiresAt: time + cityPoisonDurationMs,
                },
              ].slice(-6);
              nextEnemy.poisonTimer = 4700 + Math.random() * 2100;
            }
          }
          if (nextEnemy.kind !== 'anemone' && nextEnemy.moveTimer <= 0) {
            const nextStep = cityStepPosition(nextEnemy, nextEnemy.dir);
            const blockers = [
              currentPlayer,
              ...movedEnemies,
              ...nextEnemies.filter((other) => other.id !== nextEnemy.id),
            ];
            if (cityCanOccupy(nextStep.x, nextStep.y, currentTiles, blockers)) {
              nextEnemy.x = nextStep.x;
              nextEnemy.y = nextStep.y;
            } else {
              nextEnemy.dir = nextEnemy.kind === 'urchin'
                ? (['up', 'down', 'left', 'right'] as CityDirection[])[Math.floor(Math.random() * 4)]
                : cityDirectionToward(nextEnemy, cityBase);
            }
            nextEnemy.moveTimer = nextEnemy.stepDelay * cityTerrainSpeed(nextEnemy.x, nextEnemy.y, currentTiles);
          }
          nextEnemy.cooldown -= jammed ? 0 : dt * enemyPace;
          if (!jammed && nextEnemy.kind !== 'urchin' && nextEnemy.cooldown <= 0) {
            nextEnemy.dir = cityDirectionToward(nextEnemy, Math.random() < (nextEnemy.kind === 'anemone' ? 0.64 : 0.58) ? currentPlayer : cityBase);
            const vector = cityDirectionVector(nextEnemy.dir);
            enemyShots.push({
              id: nextId.current++,
              side: 'enemy',
              x: nextEnemy.x + vector.x * cityCellSize * 0.62,
              y: nextEnemy.y + vector.y * cityCellSize * 0.62,
              vx: vector.x * cityConfig.enemyShotSpeed,
              vy: vector.y * cityConfig.enemyShotSpeed,
              dir: nextEnemy.dir,
            });
            nextEnemy.cooldown = (nextEnemy.kind === 'anemone' ? 1550 + Math.random() * 950 : 1900 + Math.random() * 1100) * cityConfig.enemyShotDelayScale;
          }
          movedEnemies.push(nextEnemy);
          return nextEnemy;
        });

        let nextArmor = armorRef.current;
        let nextBaseHp = baseHpRef.current;
        let nextKills = killsRef.current;
        let nextPowerups = powerupsRef.current.filter((powerup) => powerup.expiresAt > time);
        let nextTiles = currentTiles;
        let tilesChanged = false;
        let nextShots: CityShot[] = [];
        const movedShots = [...shotsRef.current, ...enemyShots]
          .map((shot) => ({ ...shot, x: shot.x + shot.vx * dt, y: shot.y + shot.vy * dt }))
          .filter((shot) => shot.x >= 0 && shot.x <= 100 && shot.y >= 0 && shot.y <= 100);
        const canceledShots = new Set<number>();
        for (let i = 0; i < movedShots.length; i += 1) {
          if (canceledShots.has(movedShots[i].id)) continue;
          for (let j = i + 1; j < movedShots.length; j += 1) {
            if (canceledShots.has(movedShots[j].id) || movedShots[i].side === movedShots[j].side) continue;
            if (Math.hypot(movedShots[i].x - movedShots[j].x, movedShots[i].y - movedShots[j].y) < cityCellSize * 0.58) {
              canceledShots.add(movedShots[i].id);
              canceledShots.add(movedShots[j].id);
              break;
            }
          }
        }
        movedShots.forEach((moved) => {
          if (canceledShots.has(moved.id)) return;
          const shotDamage = moved.damage ?? 1;
          const wallHitIndex = nextTiles.findIndex((tile) => cityTileBlocks(tile) && cityIntersectsRect(moved.x, moved.y, cityShotHitRadius(moved), tile));
          if (wallHitIndex >= 0) {
            const tile = nextTiles[wallHitIndex];
            if (cityTileBreaks(tile)) {
              if (!tilesChanged) nextTiles = [...nextTiles];
              const nextHp = (tile.hp ?? 1) - shotDamage;
              if (nextHp <= 0) {
                nextTiles.splice(wallHitIndex, 1);
              } else {
                nextTiles[wallHitIndex] = { ...tile, hp: nextHp };
              }
              tilesChanged = true;
            }
            if (moved.side === 'ally' && moved.piercing && cityTileBreaks(tile)) {
              nextShots.push(moved);
            }
            return;
          }

          if (moved.side === 'ally') {
            const target = nextEnemies.find((enemy) => Math.hypot(enemy.x - moved.x, enemy.y - moved.y) < cityShotUnitHitRadius(moved));
            if (target) {
              target.hp -= shotDamage;
              if (target.hp <= 0) {
                nextKills += 1;
                playGameSfx('blast');
                if (Math.random() < cityConfig.dropChance) {
                  nextPowerups = [
                    ...nextPowerups,
                    {
                      id: nextId.current++,
                      kind: randomCityPowerupKind(),
                      x: target.x,
                      y: target.y,
                      expiresAt: time + 11000,
                    },
                  ].slice(-6);
                }
              }
              if (!moved.piercing) return;
            }
          } else {
            const protectedPlayer = shieldUntilRef.current > time;
            if (Math.hypot(currentPlayer.x - moved.x, currentPlayer.y - moved.y) < cityUnitSize * 0.62) {
              if (!protectedPlayer) {
                nextArmor -= 1;
                shieldUntilRef.current = time + 1400;
                setShieldUntil(time + 1400);
                playGameSfx('hit');
                showCityNotice('damage', '裝甲 -1');
              }
              return;
            }
            if (cityIntersectsRect(moved.x, moved.y, cityCellSize * 0.45, { x: cityBase.x - cityBase.size / 2, y: cityBase.y - cityBase.size / 2, size: cityBase.size })) {
              nextBaseHp -= 1;
              playGameSfx('warning');
              showCityNotice('base', '主堡 -1');
              return;
            }
          }
          nextShots.push(moved);
        });

        nextEnemies = nextEnemies.filter((enemy) => enemy.hp > 0);
        nextPowerups = nextPowerups.filter((powerup) => {
          const collectRadius = magnet ? cityCellSize * 2.9 : cityCellSize * 1.24;
          if (Math.hypot(currentPlayer.x - powerup.x, currentPlayer.y - powerup.y) >= collectRadius) return true;
          const weapon = cityWeaponFromPowerup(powerup.kind);
          if (weapon) {
            activateCityWeapon(weapon);
            showCityNotice(powerup.kind, cityPowerupMessages[powerup.kind]);
            playGameSfx('powerup');
            return false;
          }
          if (powerup.kind === 'speed') {
            extendCityAbility('rapid', time, 7000, 14000);
            showCityNotice(powerup.kind, cityPowerupMessages[powerup.kind]);
          }
          if (powerup.kind === 'shield') {
            extendCityAbility('shield', time, 6000, 12000);
            showCityNotice(powerup.kind, cityPowerupMessages[powerup.kind]);
          }
          if (powerup.kind === 'armor') {
            nextArmor = Math.min(cityMaxHp, nextArmor + 1);
            showCityNotice(powerup.kind, cityPowerupMessages[powerup.kind]);
          }
          if (powerup.kind === 'fortify') {
            nextBaseHp = Math.min(cityMaxHp, nextBaseHp + 1);
            showCityNotice(powerup.kind, cityPowerupMessages[powerup.kind]);
          }
          if (powerup.kind === 'freeze') {
            extendCityAbility('freeze', time, 6500, 11000);
            showCityNotice(powerup.kind, cityPowerupMessages[powerup.kind]);
          }
          if (powerup.kind === 'blast') {
            let defeated = 0;
            nextEnemies = nextEnemies
              .map((enemy) => ({ ...enemy, hp: enemy.hp - 1 }))
              .filter((enemy) => {
                if (enemy.hp <= 0) defeated += 1;
                return enemy.hp > 0;
            });
            nextKills += defeated;
            nextShots = nextShots.filter((shot) => shot.side === 'ally');
            showCityNotice(powerup.kind, cityPowerupMessages[powerup.kind]);
          }
          if (powerup.kind === 'pierce') {
            extendCityAbility('pierce', time, 8000, 13000);
            showCityNotice(powerup.kind, cityPowerupMessages[powerup.kind]);
          }
          if (powerup.kind === 'spread') {
            extendCityAbility('spread', time, 6200, 9000);
            showCityNotice(powerup.kind, cityPowerupMessages[powerup.kind]);
          }
          if (powerup.kind === 'double') {
            extendCityAbility('double', time, 8500, 13000);
            showCityNotice(powerup.kind, cityPowerupMessages[powerup.kind]);
          }
          if (powerup.kind === 'magnet') {
            extendCityAbility('magnet', time, 9000, 14000);
            showCityNotice(powerup.kind, cityPowerupMessages[powerup.kind]);
          }
          if (powerup.kind === 'dash') {
            extendCityAbility('dash', time, 7500, 12000);
            showCityNotice(powerup.kind, cityPowerupMessages[powerup.kind]);
          }
          if (powerup.kind === 'jam') {
            extendCityAbility('jam', time, 6500, 10000);
            nextShots = nextShots.filter((shot) => shot.side === 'ally');
            showCityNotice(powerup.kind, cityPowerupMessages[powerup.kind]);
          }
          if (powerup.kind === 'repair') {
            nextArmor = Math.min(cityMaxHp, nextArmor + 1);
            nextBaseHp = Math.min(cityMaxHp, nextBaseHp + 1);
            showCityNotice(powerup.kind, cityPowerupMessages[powerup.kind]);
          }
          playGameSfx('powerup');
          return false;
        });

        playerRef.current = currentPlayer;
        enemiesRef.current = nextEnemies;
        shotsRef.current = nextShots.slice(-36);
        powerupsRef.current = nextPowerups;
        poisonCloudsRef.current = nextPoisonClouds;
        armorRef.current = nextArmor;
        baseHpRef.current = nextBaseHp;
        killsRef.current = nextKills;
        if (tilesChanged) {
          tilesRef.current = nextTiles;
          setTiles(nextTiles);
        }
        const nextVisualPlayer = citySmoothVisual(visualPlayerRef.current, { x: currentPlayer.x, y: currentPlayer.y, dir: currentPlayer.dir }, dt);
        const nextCamera = citySmoothCamera(cameraRef.current, cityCameraWithDeadZone(cameraRef.current, nextVisualPlayer.x, nextVisualPlayer.y), dt);
        const visualEnemyLookup = new Map(visualEnemiesRef.current.map((enemy) => [enemy.id, enemy]));
        const nextVisualEnemies = nextEnemies.map((enemy) => citySmoothVisual(visualEnemyLookup.get(enemy.id), enemy, dt));
        visualPlayerRef.current = nextVisualPlayer;
        cameraRef.current = nextCamera;
        visualEnemiesRef.current = nextVisualEnemies;
        setVisualPlayer(nextVisualPlayer);
        setCamera(nextCamera);
        setVisualEnemies(nextVisualEnemies);
        setShots(shotsRef.current);
        setPowerups(nextPowerups);
        setPoisonClouds(nextPoisonClouds);
        setArmor(nextArmor);
        setBaseHp(nextBaseHp);
        setKills(nextKills);

        if (nextBaseHp <= 0 || nextArmor <= 0) {
          const remainingAbilities = readCityAbilityDurations(time);
          bankedAbilitiesRef.current = (Object.keys(remainingAbilities) as CityTimedAbility[]).reduce((banked, ability) => {
            banked[ability] = remainingAbilities[ability] / 2;
            return banked;
          }, cityEmptyAbilityDurations());
          applyCityAbilityDurations(cityEmptyAbilityDurations(), time);
          resetCityWeapons();
          statusRef.current = 'lost';
          setStatus('lost');
          showCityNotice('damage', nextBaseHp <= 0 ? '主堡失守，武器失效' : '裝甲破裂，武器失效');
        } else if (nextKills >= cityConfig.targetKills) {
          const remainingAbilities = readCityAbilityDurations(time);
          if (cityLevelRef.current < cityMaxLevel) {
            const nextLevel = cityLevelRef.current + 1;
            startCityLevel(nextLevel, {
              abilityDurations: remainingAbilities,
              notice: `${cityLevelConfig(nextLevel).title}展開`,
            });
            playGameSfx('level');
          } else {
            statusRef.current = 'won';
            setStatus('won');
            showCityNotice('spawn', '三重防線守住');
            if (!completionReported.current) {
              completionReported.current = true;
              onComplete(2200 + nextKills * 24 + nextBaseHp * 160 + nextArmor * 130);
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activateCityWeapon, applyCityAbilityDurations, extendCityAbility, movePlayerIntent, onComplete, readCityAbilityDurations, resetCityWeapons, showCityNotice, startCityLevel]);

  const cityCellPx = Math.max(18, Math.min((arenaSize.width || 360) / cityViewCols, (arenaSize.height || 520) / cityViewRows));
  const cityViewportWidthPx = cityCellPx * cityViewCols;
  const cityViewportHeightPx = cityCellPx * cityViewRows;
  const cityWorldPx = cityCellPx * cityGridSize;
  const viewportStyle: CSSProperties = {
    width: `${cityViewportWidthPx}px`,
    height: `${cityViewportHeightPx}px`,
    ['--city-cell-px' as string]: `${cityCellPx}px`,
  };
  const worldTransform: CSSProperties = {
    width: `${cityWorldPx}px`,
    height: `${cityWorldPx}px`,
    transform: `translate3d(${-(camera.x / cityCellSize) * cityCellPx}px, ${-(camera.y / cityCellSize) * cityCellPx}px, 0)`,
    ['--city-unit-size' as string]: `${cityUnitVisualSize}%`,
    ['--city-shot-size' as string]: `${cityCellSize * 0.34}%`,
    ['--city-powerup-size' as string]: `${cityCellSize * 1.02}%`,
  };
  const playerHidden = citySeaweedCover(visualPlayer.x, visualPlayer.y, tiles);
  const cityRenderTime = performance.now();
  const currentCityConfig = cityLevelConfig(cityLevel);
  const shielded = shieldUntil > cityRenderTime;
  const rapid = rapidUntil > cityRenderTime || cityWeapons.rapid;
  const piercing = pierceUntil > cityRenderTime || cityWeapons.pierce;
  const spreadActive = spreadUntil > cityRenderTime || cityWeapons.spread;
  const doubleActive = doubleUntil > cityRenderTime || cityWeapons.double;
  const magnetActive = magnetUntil > cityRenderTime;
  const dashActive = dashUntil > cityRenderTime;
  const enemiesFrozen = freezeUntil > cityRenderTime;
  const enemiesJammed = jamUntil > cityRenderTime;
  const playerPoisonedNow = cityInsidePoisonCloud(visualPlayer.x, visualPlayer.y, poisonClouds, cityRenderTime);
  const chargeLabel = chargeStage === 2 ? '二段' : chargeStage === 1 ? '一段' : chargeStage === 0 ? '集氣' : '攻擊';
  const cityPadStickStyle: CSSProperties = {
    ['--pad-x' as string]: `${padVector.x}px`,
    ['--pad-y' as string]: `${padVector.y}px`,
  };
  const cityDebugItems: GridDebugItem[] = [
    { label: 'logic', value: gridCellLabel(cityCoordToCell(playerRef.current.x), cityCoordToCell(playerRef.current.y)) },
    { label: 'visual', value: gridCellLabel(cityCoordToCell(visualPlayer.x), cityCoordToCell(visualPlayer.y)) },
    { label: 'intent', value: directionPadIntentLabel(heldDirectionRef.current) },
    { label: 'busy', value: !gridDistanceSettled(playerRef.current, visualPlayerRef.current, cityCellSize * 0.1) },
    { label: 'next', value: Number.isFinite(nextPlayerStepAt.current) ? Math.max(0, Math.round(nextPlayerStepAt.current - cityRenderTime)) : 'idle' },
    { label: 'charge', value: chargeStage >= 0 ? chargeLabel : pendingChargeShotRef.current !== null ? `pending-${pendingChargeShotRef.current}` : 'idle' },
    { label: 'last', value: cityMoveDebugRef.current.last },
    { label: 'moves', value: `${cityMoveDebugRef.current.committed}/${cityMoveDebugRef.current.attempts}` },
  ];

  return (
    <section className="screen city-screen">
      <div className="city-nav">
        <button className="icon-button" onClick={onBack} aria-label="返回">
          <ChevronLeft size={20} />
        </button>
        <button className="icon-button" onClick={restart} aria-label="重新開始">
          <RotateCcw size={20} />
        </button>
      </div>
      <div className="city-arena" ref={arenaRef}>
        <div
          className="city-viewport"
          style={viewportStyle}
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest('button')) return;
            swipeStartRef.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => finishSwipeMove(event.clientX, event.clientY)}
          onPointerCancel={() => {
            swipeStartRef.current = null;
          }}
        >
          <div className="city-world" style={worldTransform}>
            {tiles.map((tile) => (
              <span
                className={`city-tile ${tile.kind} hp-${tile.hp ?? 0}`}
                key={tile.id}
                style={{ left: `${tile.x}%`, top: `${tile.y}%`, width: `${tile.size}%`, height: `${tile.size}%` }}
              />
            ))}
            <div className={`city-base hp-${baseHp} ${baseHp <= 1 ? 'critical' : baseHp <= 2 ? 'danger' : ''}`} style={{ left: `${cityBase.x}%`, top: `${cityBase.y}%`, width: `${cityBase.size}%`, height: `${cityBase.size}%`, ['--base-hp' as string]: baseHp }}>
              <img src={assets.cityUnits.base} alt="" />
            </div>
            {powerups.map((powerup) => (
              <div className={`city-powerup ${powerup.kind}`} key={powerup.id} style={{ left: `${powerup.x}%`, top: `${powerup.y}%` }} />
            ))}
            {poisonClouds.map((cloud) => (
              <span
                className="city-poison-cloud"
                key={cloud.id}
                style={{
                  left: `${cloud.x}%`,
                  top: `${cloud.y}%`,
                  width: `${cityPoisonCloudSize}%`,
                  height: `${cityPoisonCloudSize}%`,
                }}
              />
            ))}
            {visualEnemies.map((enemy) => (
              <div className={`city-unit enemy ${enemy.kind} dir-${enemy.dir} ${citySeaweedCover(enemy.x, enemy.y, tiles) ? 'hidden' : ''} ${enemiesFrozen ? 'frozen' : ''} ${enemiesJammed ? 'jammed' : ''}`} key={enemy.id} style={{ left: `${enemy.x}%`, top: `${enemy.y}%` }}>
                <img src={enemy.kind === 'anemone' ? assets.cityUnits.anemone : enemy.kind === 'urchin' ? assets.cityUnits.urchin[enemy.dir] : assets.cityUnits.enemy[enemy.dir]} alt="" />
                <i style={{ width: `${clamp(enemy.hp / enemy.maxHp, 0, 1) * 100}%` }} />
              </div>
            ))}
            <div className={`city-unit player dir-${visualPlayer.dir} ${playerHidden ? 'hidden' : ''} ${shielded ? 'shielded' : ''} ${playerPoisonedNow ? 'poisoned' : ''} ${rapid ? 'rapid' : ''} ${piercing ? 'piercing' : ''} ${spreadActive ? 'spread' : ''} ${doubleActive ? 'double' : ''} ${magnetActive ? 'magnet' : ''} ${dashActive ? 'dash' : ''} ${chargeStage >= 0 ? `charging charge-${chargeStage}` : ''}`} style={{ left: `${visualPlayer.x}%`, top: `${visualPlayer.y}%` }}>
              <img src={assets.cityUnits.player[visualPlayer.dir]} alt="" />
            </div>
            {shots.map((shot) => (
              <span className={`city-shot ${shot.side} dir-${shot.dir} ${shot.piercing ? 'piercing' : ''} ${shot.spread ? 'spread' : ''} ${shot.double ? 'double' : ''} ${shot.chargeStage ? `charged charge-${shot.chargeStage}` : ''}`} key={shot.id} style={{ left: `${shot.x}%`, top: `${shot.y}%` }} />
            ))}
            {tiles.filter((tile) => tile.kind === 'seaweed').map((tile) => (
              <span className="city-seaweed-cover" key={`cover-${tile.id}`} style={{ left: `${tile.x}%`, top: `${tile.y}%`, width: `${tile.size}%`, height: `${tile.size}%` }} />
            ))}
          </div>
          <div className="city-hud">
            <span>{currentCityConfig.title}</span>
            <span>主堡 {baseHp}/{cityMaxHp}</span>
            <span>裝甲 {armor}/{cityMaxHp}</span>
            <span>擊破 {kills}/{currentCityConfig.targetKills}</span>
          </div>
          {debugGrid && <GridDebugOverlay title="CITY GRID" items={cityDebugItems} />}
          {notice && (
            <div className={`city-notice ${notice.kind}`} key={notice.id}>
              {notice.text}
            </div>
          )}
          <div className="city-minimap">
            <span className="view" style={{ left: `${camera.x}%`, top: `${camera.y}%`, width: `${cityViewWidth}%`, height: `${cityViewHeight}%` }} />
            <span className="base" style={{ left: `${cityBase.x}%`, top: `${cityBase.y}%` }} />
            <span className="player" style={{ left: `${visualPlayer.x}%`, top: `${visualPlayer.y}%` }} />
            {visualEnemies.map((enemy) => (
              <span className="enemy" key={`mini-${enemy.id}`} style={{ left: `${enemy.x}%`, top: `${enemy.y}%` }} />
            ))}
          </div>
          <div
            className={`city-controls ${padDirection ? `active-${padDirection}` : ''}`}
            aria-label="方向控制"
            onPointerDown={(event) => {
              if (movePointerRef.current !== null) return;
              movePointerRef.current = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
              updateMovePad(event);
            }}
            onPointerMove={(event) => {
              if (movePointerRef.current === event.pointerId) updateMovePad(event);
            }}
            onPointerUp={releaseMovePad}
            onPointerCancel={releaseMovePad}
            onLostPointerCapture={releaseMovePad}
          >
            <span className="city-stick-base" />
            <span className="city-stick-arrow up"><ChevronUp size={14} /></span>
            <span className="city-stick-arrow left"><ChevronLeft size={14} /></span>
            <span className="city-stick-arrow right"><ChevronRight size={14} /></span>
            <span className="city-stick-arrow down"><ChevronDown size={14} /></span>
            <span className="city-stick" style={cityPadStickStyle} />
          </div>
          <button
            className={`city-fire-control ${chargeStage >= 0 ? `charging charge-${chargeStage}` : ''}`}
            onPointerDown={pressCityFire}
            onPointerUp={releaseCityFire}
            onPointerCancel={(event) => releaseCityFire(event, false)}
            onPointerLeave={(event) => releaseCityFire(event, false)}
            aria-label="攻擊"
          >
            <Swords size={24} />
            <small>{chargeLabel}</small>
          </button>
          {status !== 'playing' && (
            <div className="city-result">
              <strong>{status === 'won' ? '三重防線完成' : '防線失守'}</strong>
              <div className="row-actions">
                <button onClick={status === 'won' ? restart : continueCity}>{status === 'won' ? '再守一次' : '半能量續戰'}</button>
                <button className="primary-action" onClick={onBack}>返回地圖</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function BreakthroughShooterGame({ debugGrid, onBack, onComplete }: { debugGrid: boolean; onBack: () => void; onComplete: GameCompleteHandler }) {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useGamePausedRef();
  const rafRef = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  const nextId = useRef(1);
  const noticeId = useRef(0);
  const totalEnemiesRef = useRef(0);
  const exitNoticeShownRef = useRef(false);
  const movePointerRef = useRef<number | null>(null);
  const firePointerRef = useRef<number | null>(null);
  const heldDirectionRef = useRef<DirectionPadIntent>(null);
  const diagonalAxisRef = useRef<'horizontal' | 'vertical'>('horizontal');
  const nextMoveAtRef = useRef(0);
  const firePressedRef = useRef(false);
  const fireChargeStartedAtRef = useRef<number | null>(null);
  const pendingChargeShotRef = useRef<CityChargeStage | null>(null);
  const chargeStageRef = useRef<CityChargeStage | -1>(-1);
  const completionReported = useRef(false);
  const stageRef = useRef(1);
  const stageConfigRef = useRef(breakthroughLevelConfig(1));
  const runScoreRef = useRef(0);
  const [arenaSize, setArenaSize] = useState({ width: 0, height: 0 });
  const [selectedCharacter, setSelectedCharacter] = useState<LightBombCharacterId>('prince');
  const [stage, setStage] = useState(1);
  const [status, setStatus] = useState<BreakthroughStatus>('select');
  const [obstacles, setObstacles] = useState<BreakthroughObstacle[]>([]);
  const [enemies, setEnemies] = useState<BreakthroughEnemy[]>([]);
  const [visualEnemies, setVisualEnemies] = useState<BreakthroughEnemy[]>([]);
  const [shots, setShots] = useState<BreakthroughShot[]>([]);
  const [powerups, setPowerups] = useState<BreakthroughPowerup[]>([]);
  const [poisonClouds, setPoisonClouds] = useState<BreakthroughPoisonCloud[]>([]);
  const [player, setPlayer] = useState<BreakthroughPlayer>(() => createBreakthroughPlayer('prince'));
  const [visualPlayer, setVisualPlayer] = useState<BreakthroughPlayer>(() => createBreakthroughPlayer('prince'));
  const [camera, setCamera] = useState(() => breakthroughCameraFor(createBreakthroughPlayer('prince')));
  const [upgradeState, setUpgradeState] = useState<BreakthroughUpgradeState>(() => breakthroughBaseUpgrades('prince'));
  const [chargeStage, setChargeStage] = useState<CityChargeStage | -1>(-1);
  const [fireActive, setFireActive] = useState(false);
  const [padDirection, setPadDirection] = useState<CityDirection | null>(null);
  const [padVector, setPadVector] = useState<DirectionPadVector>({ x: 0, y: 0 });
  const [notice, setNotice] = useState<BreakthroughNotice>(null);
  const statusRef = useRef<BreakthroughStatus>('select');
  const obstaclesRef = useRef<BreakthroughObstacle[]>([]);
  const enemiesRef = useRef<BreakthroughEnemy[]>([]);
  const visualEnemiesRef = useRef<BreakthroughEnemy[]>([]);
  const shotsRef = useRef<BreakthroughShot[]>([]);
  const powerupsRef = useRef<BreakthroughPowerup[]>([]);
  const poisonCloudsRef = useRef<BreakthroughPoisonCloud[]>([]);
  const playerRef = useRef<BreakthroughPlayer>(createBreakthroughPlayer('prince'));
  const visualPlayerRef = useRef<BreakthroughPlayer>(createBreakthroughPlayer('prince'));
  const cameraRef = useRef(breakthroughCameraFor(createBreakthroughPlayer('prince')));
  const upgradeStateRef = useRef<BreakthroughUpgradeState>(breakthroughBaseUpgrades('prince'));

  const showNotice = useCallback((kind: CityNoticeKind | 'win', text: string) => {
    noticeId.current += 1;
    setNotice({ id: noticeId.current, kind, text });
  }, []);

  const setBreakthroughUpgrades = useCallback((next: BreakthroughUpgradeState) => {
    upgradeStateRef.current = next;
    setUpgradeState(next);
  }, []);

  const startRun = useCallback((character: LightBombCharacterId, options: { stage?: number; carryUpgrades?: BreakthroughUpgradeState; carryHp?: number; resetScore?: boolean; notice?: string } = {}) => {
    const nextStage = clamp(options.stage ?? 1, 1, breakthroughMaxStage);
    const config = breakthroughLevelConfig(nextStage);
    const nextObstacles = createBreakthroughObstacles(config);
    const nextEnemies = createBreakthroughEnemies(nextObstacles, config);
    const nextPlayer = createBreakthroughPlayer(character, options.carryHp);
    const nextCamera = breakthroughCameraFor(nextPlayer);
    nextId.current = 1000;
    totalEnemiesRef.current = nextEnemies.length;
    exitNoticeShownRef.current = false;
    lastTime.current = null;
    if (options.resetScore ?? nextStage === 1) {
      runScoreRef.current = 0;
      completionReported.current = false;
    }
    stageRef.current = nextStage;
    stageConfigRef.current = config;
    statusRef.current = 'playing';
    obstaclesRef.current = nextObstacles;
    enemiesRef.current = nextEnemies;
    visualEnemiesRef.current = nextEnemies;
    shotsRef.current = [];
    powerupsRef.current = [];
    poisonCloudsRef.current = [];
    playerRef.current = nextPlayer;
    visualPlayerRef.current = nextPlayer;
    cameraRef.current = nextCamera;
    firePressedRef.current = false;
    firePointerRef.current = null;
    movePointerRef.current = null;
    fireChargeStartedAtRef.current = null;
    pendingChargeShotRef.current = null;
    chargeStageRef.current = -1;
    heldDirectionRef.current = null;
    diagonalAxisRef.current = 'horizontal';
    nextMoveAtRef.current = 0;
    const nextUpgrades = options.carryUpgrades ?? breakthroughBaseUpgrades(character);
    setBreakthroughUpgrades(nextUpgrades);
    setSelectedCharacter(character);
    setStage(nextStage);
    setStatus('playing');
    setObstacles(nextObstacles);
    setEnemies(nextEnemies);
    setVisualEnemies(nextEnemies);
    setShots([]);
    setPowerups([]);
    setPoisonClouds([]);
    setPlayer(nextPlayer);
    setVisualPlayer(nextPlayer);
    setCamera(nextCamera);
    setChargeStage(-1);
    setFireActive(false);
    setPadDirection(null);
    setPadVector({ x: 0, y: 0 });
    setOceanBgmIntensity(config.musicIntensity);
    void startOceanBgm('city', config.musicIntensity);
    showNotice('spawn', options.notice ?? `${config.title}開始`);
  }, [setBreakthroughUpgrades, showNotice]);

  const restart = useCallback(() => {
    startRun(selectedCharacter, { stage: 1, resetScore: true });
  }, [selectedCharacter, startRun]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

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

  const tryMovePlayer = useCallback((direction: CityDirection) => {
    if (statusRef.current !== 'playing') return false;
    const current = { ...playerRef.current, dir: direction };
    if (!gridDistanceSettled(current, visualPlayerRef.current, 0.12)) {
      playerRef.current = current;
      return false;
    }
    const vector = cityDirectionVector(direction);
    const nextRow = clamp(current.row + vector.y, 0, breakthroughRows - 1);
    const nextCol = clamp(current.col + vector.x, 0, breakthroughCols - 1);
    if (!breakthroughCellBlocked(obstaclesRef.current, enemiesRef.current, nextRow, nextCol)) {
      current.row = nextRow;
      current.col = nextCol;
      current.x = nextCol;
      current.y = nextRow;
      playerRef.current = current;
      playGameSfx('step');
      return true;
    }
    playerRef.current = current;
    return false;
  }, []);

  const moveIntent = useCallback((intent: DirectionPadIntent) => {
    if (!intent) return false;
    if (intent.secondary) {
      const directions = [intent.primary, intent.secondary];
      const horizontal = directions.find((direction) => direction === 'left' || direction === 'right');
      const vertical = directions.find((direction) => direction === 'up' || direction === 'down');
      const ordered = diagonalAxisRef.current === 'horizontal' ? [horizontal, vertical] : [vertical, horizontal];
      const moved = ordered.some((direction) => direction ? tryMovePlayer(direction) : false);
      if (moved) diagonalAxisRef.current = diagonalAxisRef.current === 'horizontal' ? 'vertical' : 'horizontal';
      return moved;
    }
    return tryMovePlayer(intent.primary);
  }, [tryMovePlayer]);

  const holdDirection = useCallback((intent: DirectionPadIntent, vector: DirectionPadVector = { x: 0, y: 0 }, startTime = performance.now()) => {
    const wasHolding = heldDirectionRef.current !== null;
    const sameIntent = directionPadIntentsEqual(heldDirectionRef.current, intent);
    heldDirectionRef.current = intent;
    setPadDirection(intent?.primary ?? null);
    setPadVector(intent ? vector : { x: 0, y: 0 });
    if (!intent) {
      diagonalAxisRef.current = 'horizontal';
      nextMoveAtRef.current = Number.POSITIVE_INFINITY;
      return;
    }
    if (intent.secondary && !sameIntent) diagonalAxisRef.current = 'horizontal';
    if (!sameIntent) {
      playerRef.current = { ...playerRef.current, dir: intent.primary };
      visualPlayerRef.current = { ...visualPlayerRef.current, dir: intent.primary };
    }
    const stats = breakthroughCharacterStats[playerRef.current.character];
    const stepMs = breakthroughStepMs(stats, upgradeStateRef.current);
    const poisoned = breakthroughInsidePoison(playerRef.current.row, playerRef.current.col, poisonCloudsRef.current, startTime);
    const pace = poisoned ? cityPoisonSlowScale : 1;
    if (!wasHolding) {
      const moved = moveIntent(intent);
      nextMoveAtRef.current = startTime + (moved ? stepMs / pace : cityTurnRetryMs / pace);
    } else if (!sameIntent) {
      nextMoveAtRef.current = Math.min(nextMoveAtRef.current, startTime + cityTurnBufferMs / pace);
    }
  }, [moveIntent]);

  const updateMovePad = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const input = directionPadInputFromPointer(event.clientX, event.clientY, event.currentTarget);
    holdDirection(input.intent, input.vector);
  }, [holdDirection]);

  const releaseMovePad = useCallback((event?: ReactPointerEvent<HTMLDivElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (event && movePointerRef.current !== null && event.pointerId !== movePointerRef.current) return;
    movePointerRef.current = null;
    holdDirection(null);
  }, [holdDirection]);

  const pressFire = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (statusRef.current !== 'playing') return;
    if (firePointerRef.current !== null) return;
    firePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    firePressedRef.current = true;
    fireChargeStartedAtRef.current = performance.now();
    chargeStageRef.current = 0;
    setChargeStage(0);
    setFireActive(true);
  }, []);

  const releaseFire = useCallback((event?: ReactPointerEvent<HTMLButtonElement>, releaseShot = true) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (event && firePointerRef.current !== null && event.pointerId !== firePointerRef.current) return;
    const now = performance.now();
    const startedAt = fireChargeStartedAtRef.current;
    if (releaseShot && firePressedRef.current && startedAt !== null && statusRef.current === 'playing') {
      const stats = breakthroughCharacterStats[playerRef.current.character];
      const chargeLevel = breakthroughEffectiveUpgradeLevel(stats, upgradeStateRef.current, 'charge');
      const stage = breakthroughChargeStageForDuration(now - startedAt, chargeLevel);
      pendingChargeShotRef.current = Math.max(pendingChargeShotRef.current ?? 0, stage) as CityChargeStage;
    }
    firePointerRef.current = null;
    firePressedRef.current = false;
    fireChargeStartedAtRef.current = null;
    chargeStageRef.current = -1;
    setChargeStage(-1);
    setFireActive(false);
  }, []);

  const clearBreakthroughControls = useCallback(() => {
    releaseMovePad();
    releaseFire(undefined, false);
  }, [releaseFire, releaseMovePad]);

  useGlobalControlReset(clearBreakthroughControls);

  useEffect(() => {
    const releaseMatchingMove = (event: PointerEvent) => {
      if (movePointerRef.current === event.pointerId) releaseMovePad();
    };
    const releaseMatchingFire = (event: PointerEvent) => {
      if (firePointerRef.current === event.pointerId) releaseFire();
    };
    const cancelMatchingFire = (event: PointerEvent) => {
      if (firePointerRef.current === event.pointerId) releaseFire(undefined, false);
    };
    window.addEventListener('pointerup', releaseMatchingMove);
    window.addEventListener('pointerup', releaseMatchingFire);
    window.addEventListener('pointercancel', releaseMatchingMove);
    window.addEventListener('pointercancel', cancelMatchingFire);
    window.addEventListener('blur', clearBreakthroughControls);
    window.addEventListener('pagehide', clearBreakthroughControls);
    return () => {
      window.removeEventListener('pointerup', releaseMatchingMove);
      window.removeEventListener('pointerup', releaseMatchingFire);
      window.removeEventListener('pointercancel', releaseMatchingMove);
      window.removeEventListener('pointercancel', cancelMatchingFire);
      window.removeEventListener('blur', clearBreakthroughControls);
      window.removeEventListener('pagehide', clearBreakthroughControls);
    };
  }, [clearBreakthroughControls, releaseFire, releaseMovePad]);

  useEffect(() => {
    const tick = (time: number) => {
      if (pausedRef.current) {
        lastTime.current = time;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const last = lastTime.current ?? time;
      const dt = Math.min(34, time - last);
      lastTime.current = time;

      if (statusRef.current === 'playing') {
        let currentPlayer = { ...playerRef.current };
        const stageConfig = stageConfigRef.current;
        const stats = breakthroughCharacterStats[currentPlayer.character];
        const upgrades = upgradeStateRef.current;
        const moveMs = breakthroughEffectiveMoveMs(stats, upgrades);
        const stepMs = breakthroughStepMs(stats, upgrades);
        const playerPoisoned = breakthroughInsidePoison(currentPlayer.row, currentPlayer.col, poisonCloudsRef.current, time);
        const playerPace = playerPoisoned ? cityPoisonSlowScale : 1;
        const heldIntent = heldDirectionRef.current;
        if (heldIntent && time >= nextMoveAtRef.current) {
          const moved = moveIntent(heldIntent);
          currentPlayer = { ...playerRef.current };
          nextMoveAtRef.current = time + (moved ? stepMs / playerPace : cityTurnRetryMs / playerPace);
        }

        currentPlayer.cooldown -= dt * playerPace;
        if (firePressedRef.current && fireChargeStartedAtRef.current !== null) {
          const chargeLevel = breakthroughEffectiveUpgradeLevel(stats, upgrades, 'charge');
          const nextChargeStage = breakthroughChargeStageForDuration(time - fireChargeStartedAtRef.current, chargeLevel);
          if (nextChargeStage !== chargeStageRef.current) {
            chargeStageRef.current = nextChargeStage;
            setChargeStage(nextChargeStage);
            if (nextChargeStage > 0) playGameSfx('powerup');
          }
        }
        const chargeToFire = pendingChargeShotRef.current;
        if (chargeToFire !== null && currentPlayer.cooldown <= 0) {
          pendingChargeShotRef.current = null;
          const vector = cityDirectionVector(currentPlayer.dir);
          const side = citySideVector(currentPlayer.dir);
          const rapidLevel = breakthroughEffectiveUpgradeLevel(stats, upgrades, 'rapid');
          const pierceLevel = breakthroughEffectiveUpgradeLevel(stats, upgrades, 'pierce');
          const spreadLevel = breakthroughEffectiveUpgradeLevel(stats, upgrades, 'spread');
          const doubleLevel = breakthroughEffectiveUpgradeLevel(stats, upgrades, 'double');
          const powerLevel = breakthroughEffectiveUpgradeLevel(stats, upgrades, 'power');
          const chargeLevel = breakthroughEffectiveUpgradeLevel(stats, upgrades, 'charge');
          const charged = chargeToFire > 0;
          const piercing = pierceLevel > 0 || chargeToFire === 2 || (charged && chargeLevel >= 2);
          const overcharged = charged && (chargeToFire === 2 || powerLevel >= 3 || chargeLevel >= 3);
          const big = Boolean(stats.big || powerLevel >= 2 || chargeToFire === 2 || (charged && chargeLevel >= 2));
          const shotSpeed = stats.shotSpeed * (1 + rapidLevel * 0.075 + (charged ? 0.06 + chargeLevel * 0.025 : 0));
          const baseDamage = stats.damage + Math.floor((powerLevel + 1) / 2) + (charged ? chargeToFire + chargeLevel + Math.floor(pierceLevel / 2) : 0);
          const baseRange = charged
            ? 7.4 + chargeToFire * 1.25 + chargeLevel * 0.35 + pierceLevel * 0.22
            : 5.8 + pierceLevel * 0.36 + rapidLevel * 0.16;
          const maxRange = charged ? 10.6 : 7.6;
          const makeShot = (
            sideOffset: number,
            sideVelocity: number,
            tags: Pick<BreakthroughShot, 'spread' | 'double' | 'overcharged'> = {},
            damageValue = baseDamage,
            speedScale = 1,
            rangeScale = 1,
          ): BreakthroughShot => ({
            id: nextId.current++,
            side: 'ally',
            x: currentPlayer.x + vector.x * 0.58 + side.x * sideOffset,
            y: currentPlayer.y + vector.y * 0.58 + side.y * sideOffset,
            vx: vector.x * shotSpeed * speedScale + side.x * sideVelocity,
            vy: vector.y * shotSpeed * speedScale + side.y * sideVelocity,
            dir: currentPlayer.dir,
            damage: damageValue,
            rangeLeft: clamp(baseRange * rangeScale, 3.8, maxRange),
            piercing,
            big,
            chargeStage: charged ? chargeToFire : undefined,
            ...tags,
          });
          const nextShots = [makeShot(0, 0, { overcharged })];
          if (charged) {
            const sideBoltDamage = Math.max(1, baseDamage - 1);
            const shardDamage = Math.max(1, Math.ceil(baseDamage * 0.58));
            if (doubleLevel >= 1) {
              const offset = 0.24 + doubleLevel * 0.08;
              nextShots.push(
                makeShot(offset, 0, { double: true, overcharged }, sideBoltDamage, 0.96, 0.92),
                makeShot(-offset, 0, { double: true, overcharged }, sideBoltDamage, 0.96, 0.92),
              );
            }
            if (spreadLevel >= 1) {
              const spreadSpeed = 0.0046 + spreadLevel * 0.0016 + chargeLevel * 0.0008;
              nextShots.push(
                makeShot(0, spreadSpeed, { spread: true, overcharged }, shardDamage, 0.94, 0.82),
                makeShot(0, -spreadSpeed, { spread: true, overcharged }, shardDamage, 0.94, 0.82),
              );
              if (spreadLevel >= 3) {
                nextShots.push(
                  makeShot(0.18, spreadSpeed * 1.35, { spread: true, overcharged }, shardDamage, 0.9, 0.74),
                  makeShot(-0.18, -spreadSpeed * 1.35, { spread: true, overcharged }, shardDamage, 0.9, 0.74),
                );
              }
            }
            if (chargeLevel >= 3 && rapidLevel >= 2) {
              nextShots.push(makeShot(0, 0, { overcharged: true }, Math.max(1, Math.ceil(baseDamage * 0.5)), 0.72, 0.72));
            }
          } else {
            if (doubleLevel >= 1) nextShots.push(makeShot(0.25, 0, { double: true }, baseDamage, 1, 0.92), makeShot(-0.25, 0, { double: true }, baseDamage, 1, 0.92));
            if (doubleLevel >= 3) nextShots.push(makeShot(0.48, 0, { double: true }, baseDamage, 1, 0.86), makeShot(-0.48, 0, { double: true }, baseDamage, 1, 0.86));
            if (spreadLevel >= 1) {
              const spreadSpeed = 0.0048 + spreadLevel * 0.0014;
              nextShots.push(makeShot(0, spreadSpeed, { spread: true }, baseDamage, 1, 0.8), makeShot(0, -spreadSpeed, { spread: true }, baseDamage, 1, 0.8));
              if (spreadLevel >= 3) nextShots.push(makeShot(0.18, spreadSpeed * 1.28, { spread: true }, baseDamage, 1, 0.72), makeShot(-0.18, -spreadSpeed * 1.28, { spread: true }, baseDamage, 1, 0.72));
            }
          }
          shotsRef.current = [...shotsRef.current, ...nextShots].slice(-72);
          currentPlayer.cooldown = charged
            ? (chargeToFire === 2 ? 860 : 680) * (1 - rapidLevel * 0.06 - chargeLevel * 0.035)
            : stats.cooldownMs * (1 - rapidLevel * 0.16) + spreadLevel * 28 + doubleLevel * 28;
          playGameSfx(charged || big ? 'blast' : 'shoot');
        }

        let nextObstacles = obstaclesRef.current;
        let obstaclesChanged = false;
        let nextEnemies = enemiesRef.current.map((enemy) => ({ ...enemy }));
        let nextPowerups = powerupsRef.current.filter((powerup) => powerup.expiresAt > time);
        let nextPoison = poisonCloudsRef.current.filter((cloud) => cloud.expiresAt > time);
        const enemyShots: BreakthroughShot[] = [];
        nextEnemies = nextEnemies.map((enemy) => {
          const active = enemy.y <= cameraRef.current.y + breakthroughViewRows + 5 && enemy.y >= cameraRef.current.y - 5;
          if (!active || enemy.hp <= 0) return enemy;
          const nextEnemy = { ...enemy };
          if ((nextEnemy.kind === 'tank' || nextEnemy.kind === 'urchin') && time >= nextEnemy.moveAt) {
            const preferred: CityDirection[] = nextEnemy.kind === 'urchin'
              ? (['up', 'down', 'left', 'right'] as CityDirection[])
              : [cityDirectionToward(nextEnemy, currentPlayer), 'down', 'left', 'right', 'up'];
            const directions = preferred.sort(() => Math.random() - 0.5);
            const blockers = nextEnemies.filter((other) => other.id !== nextEnemy.id && other.hp > 0);
            for (const direction of directions) {
              const vector = cityDirectionVector(direction);
              const row = clamp(Math.round(nextEnemy.y) + vector.y, 0, breakthroughRows - 1);
              const col = clamp(Math.round(nextEnemy.x) + vector.x, 0, breakthroughCols - 1);
              if (!breakthroughCellBlocked(nextObstacles, blockers, row, col) && !(row === currentPlayer.row && col === currentPlayer.col)) {
                nextEnemy.row = row;
                nextEnemy.col = col;
                nextEnemy.x = col;
                nextEnemy.y = row;
                nextEnemy.dir = direction;
                break;
              }
            }
            nextEnemy.moveAt = time + (nextEnemy.kind === 'urchin' ? 820 + Math.random() * 460 : 980 + Math.random() * 620) * stageConfig.enemyMoveScale;
          }
          if (nextEnemy.kind === 'urchin' && (nextEnemy.poisonAt ?? 0) <= time) {
            nextPoison = [...nextPoison, {
              id: nextId.current++,
              row: Math.round(nextEnemy.y),
              col: Math.round(nextEnemy.x),
              expiresAt: time + breakthroughPoisonDurationMs,
            }].slice(-8);
            nextEnemy.poisonAt = time + 4500 + Math.random() * 2600;
          }
          if (nextEnemy.kind !== 'urchin') {
            nextEnemy.cooldown -= dt;
            if (nextEnemy.cooldown <= 0) {
              nextEnemy.dir = cityDirectionToward(nextEnemy, currentPlayer);
              const vector = cityDirectionVector(nextEnemy.dir);
              const speed = (nextEnemy.kind === 'boss' ? 0.011 : nextEnemy.kind === 'anemone' ? 0.01 : 0.009) * stageConfig.enemyShotSpeedScale;
              enemyShots.push({
                id: nextId.current++,
                side: 'enemy',
                x: nextEnemy.x + vector.x * 0.55,
                y: nextEnemy.y + vector.y * 0.55,
                vx: vector.x * speed,
                vy: vector.y * speed,
                dir: nextEnemy.dir,
                damage: nextEnemy.kind === 'boss' ? 2 : 1,
                rangeLeft: nextEnemy.kind === 'boss' ? 8.4 : 6.8,
                big: nextEnemy.kind === 'boss',
              });
              nextEnemy.cooldown = (nextEnemy.kind === 'boss' ? 940 + Math.random() * 520 : 1350 + Math.random() * 850) * stageConfig.enemyShotScale;
            }
          }
          return nextEnemy;
        });

        let nextHp = currentPlayer.hp;
        const movedShots = [...shotsRef.current, ...enemyShots]
          .map((shot) => {
            const dx = shot.vx * dt;
            const dy = shot.vy * dt;
            return { ...shot, x: shot.x + dx, y: shot.y + dy, rangeLeft: shot.rangeLeft - Math.hypot(dx, dy) };
          })
          .filter((shot) => shot.rangeLeft > 0 && shot.x >= -1 && shot.x <= breakthroughCols + 1 && shot.y >= -2 && shot.y <= breakthroughRows + 2);
        const resolvedShots: BreakthroughShot[] = [];
        const canceledShots = new Set<number>();
        for (let i = 0; i < movedShots.length; i += 1) {
          if (canceledShots.has(movedShots[i].id)) continue;
          for (let j = i + 1; j < movedShots.length; j += 1) {
            if (canceledShots.has(movedShots[j].id) || movedShots[i].side === movedShots[j].side) continue;
            const cancelRadius = movedShots[i].overcharged || movedShots[j].overcharged ? 0.86 : movedShots[i].big || movedShots[j].big ? 0.72 : 0.5;
            if (Math.hypot(movedShots[i].x - movedShots[j].x, movedShots[i].y - movedShots[j].y) < cancelRadius) {
              canceledShots.add(movedShots[i].id);
              canceledShots.add(movedShots[j].id);
              break;
            }
          }
        }
        movedShots.forEach((shot) => {
          if (canceledShots.has(shot.id)) return;
          const row = clamp(Math.round(shot.y), 0, breakthroughRows - 1);
          const col = clamp(Math.round(shot.x), 0, breakthroughCols - 1);
          const obstacleIndex = nextObstacles.findIndex((obstacle) => obstacle.row === row && obstacle.col === col && obstacle.hp > 0);
          if (obstacleIndex >= 0) {
            const obstacle = nextObstacles[obstacleIndex];
            if (shot.side === 'ally' && breakthroughObstacleBreaks(obstacle)) {
              if (!obstaclesChanged) nextObstacles = [...nextObstacles];
              const nextObstacleHp = obstacle.hp - shot.damage;
              if (nextObstacleHp <= 0) nextObstacles.splice(obstacleIndex, 1);
              else nextObstacles[obstacleIndex] = { ...obstacle, hp: nextObstacleHp };
              obstaclesChanged = true;
            }
            if (shot.side === 'ally' && shot.piercing && breakthroughObstacleBreaks(obstacle)) resolvedShots.push(shot);
            return;
          }
          if (shot.side === 'ally') {
            const radius = shot.overcharged ? 0.96 : shot.big ? 0.78 : 0.48;
            const target = nextEnemies.find((enemy) => enemy.hp > 0 && Math.hypot(enemy.x - shot.x, enemy.y - shot.y) < radius);
            if (target) {
              target.hp -= shot.damage;
              if (target.hp <= 0) {
                runScoreRef.current += target.kind === 'boss' ? 720 : target.kind === 'anemone' ? 120 : target.kind === 'urchin' ? 130 : 95;
                playGameSfx(target.kind === 'boss' ? 'level' : 'blast');
                if (target.kind !== 'boss' && Math.random() < stageConfig.dropChance) {
                  nextPowerups = [...nextPowerups, {
                    id: nextId.current++,
                    kind: randomBreakthroughPowerupKind(),
                    row: Math.round(target.y),
                    col: Math.round(target.x),
                    x: target.x,
                    y: target.y,
                    expiresAt: time + breakthroughPowerupDurationMs,
                  }].slice(-8);
                }
              }
              if (shot.piercing) resolvedShots.push(shot);
              return;
            }
          } else if (Math.hypot(currentPlayer.x - shot.x, currentPlayer.y - shot.y) < (shot.big ? 0.72 : 0.52)) {
            nextHp -= shot.damage;
            playGameSfx('hit');
            showNotice('damage', `體力 -${shot.damage}`);
            return;
          }
          resolvedShots.push(shot);
        });

        nextEnemies = nextEnemies.filter((enemy) => enemy.hp > 0);
        nextPowerups = nextPowerups.filter((powerup) => {
          if (Math.hypot(powerup.x - currentPlayer.x, powerup.y - currentPlayer.y) > 0.8) return true;
          const upgrade = breakthroughUpgradeFromPowerup(powerup.kind);
          if (upgrade) {
            const nextUpgradeState = breakthroughRaiseUpgrade(upgradeStateRef.current, upgrade);
            setBreakthroughUpgrades(nextUpgradeState);
            showNotice(powerup.kind, `${breakthroughUpgradeLabels[upgrade]} LV${nextUpgradeState[upgrade]}`);
          } else if (powerup.kind === 'armor' || powerup.kind === 'repair') {
            nextHp = Math.min(currentPlayer.maxHp, nextHp + 1);
            showNotice(powerup.kind, breakthroughPowerupMessages[powerup.kind]);
          } else if (powerup.kind === 'blast') {
            nextEnemies = nextEnemies
              .map((enemy) => ({ ...enemy, hp: enemy.hp - (enemy.kind === 'boss' ? 2 : 1) }))
              .filter((enemy) => enemy.hp > 0);
            showNotice(powerup.kind, breakthroughPowerupMessages[powerup.kind]);
          } else if (powerup.kind === 'freeze') {
            nextEnemies = nextEnemies.map((enemy) => ({ ...enemy, moveAt: enemy.moveAt + 1800, cooldown: enemy.cooldown + 1200 }));
            showNotice(powerup.kind, breakthroughPowerupMessages[powerup.kind]);
          } else if (powerup.kind === 'shield') {
            nextHp = Math.min(currentPlayer.maxHp, nextHp + 2);
            showNotice(powerup.kind, breakthroughPowerupMessages[powerup.kind]);
          } else if (powerup.kind === 'jam') {
            nextEnemies = nextEnemies.map((enemy) => ({ ...enemy, cooldown: enemy.cooldown + 1800 }));
            showNotice(powerup.kind, breakthroughPowerupMessages[powerup.kind]);
          } else if (powerup.kind === 'fortify') {
            nextHp = Math.min(currentPlayer.maxHp, nextHp + 1);
            showNotice(powerup.kind, breakthroughPowerupMessages[powerup.kind]);
          }
          runScoreRef.current += 40;
          playGameSfx('powerup');
          return false;
        });

        currentPlayer.hp = nextHp;
        playerRef.current = currentPlayer;
        obstaclesRef.current = nextObstacles;
        enemiesRef.current = nextEnemies;
        shotsRef.current = resolvedShots.slice(-56);
        powerupsRef.current = nextPowerups;
        poisonCloudsRef.current = nextPoison;
        const nextVisualPlayer = breakthroughSmoothCell(visualPlayerRef.current, currentPlayer, dt, moveMs);
        const visualEnemyLookup = new Map(visualEnemiesRef.current.map((enemy) => [enemy.id, enemy]));
        const nextVisualEnemies = nextEnemies.map((enemy) => breakthroughSmoothCell(visualEnemyLookup.get(enemy.id), enemy, dt, 170));
        const targetCamera = breakthroughCameraWithDeadZone(cameraRef.current, nextVisualPlayer.x + 0.5, nextVisualPlayer.y + 0.5);
        const nextCamera = breakthroughSmoothCamera(cameraRef.current, targetCamera, dt);
        visualPlayerRef.current = nextVisualPlayer;
        visualEnemiesRef.current = nextVisualEnemies;
        cameraRef.current = nextCamera;
        if (obstaclesChanged) setObstacles(nextObstacles);
        setPlayer(currentPlayer);
        setVisualPlayer(nextVisualPlayer);
        setEnemies(nextEnemies);
        setVisualEnemies(nextVisualEnemies);
        setCamera(nextCamera);
        setShots(shotsRef.current);
        setPowerups(nextPowerups);
        setPoisonClouds(nextPoison);

        const bossAlive = nextEnemies.some((enemy) => enemy.kind === 'boss');
        if (nextHp <= 0) {
          statusRef.current = 'lost';
          setStatus('lost');
          setBreakthroughUpgrades(breakthroughBaseUpgrades(currentPlayer.character));
          showNotice('damage', '突圍失敗，武裝失效');
        } else if (!bossAlive && currentPlayer.row <= breakthroughGoalRow) {
          if (stageRef.current < breakthroughMaxStage) {
            const nextStage = stageRef.current + 1;
            const nextConfig = breakthroughLevelConfig(nextStage);
            startRun(currentPlayer.character, {
              stage: nextStage,
              carryUpgrades: upgradeStateRef.current,
              carryHp: Math.min(currentPlayer.maxHp, currentPlayer.hp + 1),
              notice: `${nextConfig.title}展開`,
            });
          } else {
            statusRef.current = 'won';
            setStatus('won');
            showNotice('win', '海底通路突破');
            if (!completionReported.current) {
              completionReported.current = true;
              const upgradeScore = Object.values(upgradeStateRef.current).reduce((sum, level) => sum + level, 0) * 150;
              onComplete(2600 + runScoreRef.current + currentPlayer.hp * 220 + upgradeScore);
            }
          }
        } else if (!bossAlive && currentPlayer.row <= 5 && !exitNoticeShownRef.current) {
          exitNoticeShownRef.current = true;
          showNotice('spawn', '出口開啟，繼續向上');
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [moveIntent, onComplete, setBreakthroughUpgrades, showNotice, startRun]);

  const cellPx = Math.max(20, Math.min((arenaSize.width || 360) / breakthroughViewCols, (arenaSize.height || 540) / breakthroughViewRows));
  const viewportStyle: CSSProperties = {
    width: `${cellPx * breakthroughViewCols}px`,
    height: `${cellPx * breakthroughViewRows}px`,
    ['--breakthrough-cell-px' as string]: `${cellPx}px`,
  };
  const worldStyle: CSSProperties = {
    width: `${cellPx * breakthroughCols}px`,
    height: `${cellPx * breakthroughRows}px`,
    transform: `translate3d(${-camera.x * cellPx}px, ${-camera.y * cellPx}px, 0)`,
    ['--city-powerup-size' as string]: `${cellPx * 0.92}px`,
  };
  const tokenStyle = (x: number, y: number): CSSProperties => ({
    ['--bt-x' as string]: `${(x + 0.5) * cellPx}px`,
    ['--bt-y' as string]: `${(y + 0.5) * cellPx}px`,
  });
  const cellStyle = (row: number, col: number): CSSProperties => ({ left: `${col * cellPx}px`, top: `${row * cellPx}px`, width: `${cellPx}px`, height: `${cellPx}px` });
  const bossAlive = enemies.some((enemy) => enemy.kind === 'boss');
  const selectedDef = lightBombCharacterDef(selectedCharacter);
  const selectedStats = breakthroughCharacterStats[selectedCharacter];
  const currentConfig = breakthroughLevelConfig(stage);
  const playerPoisoned = breakthroughInsidePoison(player.row, player.col, poisonClouds, performance.now());
  const upgradeSummary = breakthroughUpgradeSummary(upgradeState);
  const chargeLabel = chargeStage === 2 ? '二段' : chargeStage === 1 ? '一段' : fireActive ? '集氣' : '射擊';
  const padStyle: CSSProperties = {
    ['--pad-x' as string]: `${padVector.x}px`,
    ['--pad-y' as string]: `${padVector.y}px`,
  };
  const debugItems: GridDebugItem[] = [
    { label: 'cell', value: breakthroughKey(player.row, player.col) },
    { label: 'camera', value: `${camera.x.toFixed(1)},${camera.y.toFixed(1)}` },
    { label: 'intent', value: directionPadIntentLabel(heldDirectionRef.current) },
    { label: 'shots', value: shots.length },
    { label: 'enemies', value: enemies.length },
    { label: 'upgrade', value: upgradeSummary },
  ];

  if (status === 'select') {
    return (
      <section className="screen breakthrough-screen breakthrough-select-screen">
        <div className="city-nav">
          <button className="icon-button" onClick={onBack} aria-label="返回">
            <ChevronLeft size={20} />
          </button>
        </div>
        <div className="breakthrough-select">
          <strong>海底突圍</strong>
          <div className="breakthrough-roster">
            {lightBombCharacters.map((character) => (
              <button
                className={`breakthrough-card ${selectedCharacter === character.id ? 'selected' : ''}`}
                key={character.id}
                onClick={() => setSelectedCharacter(character.id)}
              >
                <img src={breakthroughHeroImage(character.id, 'down')} alt="" />
                <span>{character.name}</span>
                <small>{breakthroughCharacterAbilityText[character.id]}</small>
              </button>
            ))}
          </div>
          <div className="breakthrough-selected">
            <img src={breakthroughHeroImage(selectedCharacter, 'down')} alt="" />
            <span>{selectedDef.name}</span>
            <small>體力 {selectedStats.hp} · {breakthroughCharacterAbilityText[selectedCharacter]} · {breakthroughUpgradeSummary(breakthroughBaseUpgrades(selectedCharacter))}</small>
          </div>
          <button className="primary-action" onClick={() => startRun(selectedCharacter)}>開始突圍</button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen breakthrough-screen">
      <div className="city-nav">
        <button className="icon-button" onClick={onBack} aria-label="返回">
          <ChevronLeft size={20} />
        </button>
        <button className="icon-button" onClick={restart} aria-label="重新開始">
          <RotateCcw size={20} />
        </button>
      </div>
      <div className="breakthrough-arena" ref={arenaRef}>
        <div className="breakthrough-viewport" style={viewportStyle}>
          <div className="breakthrough-world" style={worldStyle}>
            <span className={`breakthrough-goal ${bossAlive ? 'locked' : 'open'}`} style={cellStyle(breakthroughGoalRow, breakthroughBossStart.col)} />
            {obstacles.map((obstacle) => (
              <span className={`breakthrough-tile ${obstacle.kind} hp-${obstacle.hp}`} key={obstacle.id} style={cellStyle(obstacle.row, obstacle.col)} />
            ))}
            {poisonClouds.map((cloud) => (
              <span className="breakthrough-poison" key={cloud.id} style={{ left: `${(cloud.col - 1.5) * cellPx}px`, top: `${(cloud.row - 1.5) * cellPx}px`, width: `${cellPx * 4}px`, height: `${cellPx * 4}px` }} />
            ))}
            {powerups.map((powerup) => (
              <div className={`city-powerup breakthrough-powerup ${powerup.kind}`} key={powerup.id} style={tokenStyle(powerup.x, powerup.y)} />
            ))}
            {visualEnemies.map((enemy) => (
              <div className={`breakthrough-enemy ${enemy.kind} dir-${enemy.dir}`} key={enemy.id} style={tokenStyle(enemy.x, enemy.y)}>
                <img src={enemy.kind === 'boss' || enemy.kind === 'anemone' ? assets.cityUnits.anemone : enemy.kind === 'urchin' ? assets.cityUnits.urchin[enemy.dir] : assets.cityUnits.enemy[enemy.dir]} alt="" />
                <i style={{ width: `${clamp(enemy.hp / enemy.maxHp, 0, 1) * 100}%` }} />
              </div>
            ))}
            <div className={`breakthrough-player ${visualPlayer.character} dir-${visualPlayer.dir} ${playerPoisoned ? 'poisoned' : ''} ${fireActive ? `charging charge-${Math.max(0, chargeStage)}` : ''} ${Object.entries(upgradeState).filter(([, level]) => level > 0).map(([upgrade]) => `weapon-${upgrade}`).join(' ')}`} style={tokenStyle(visualPlayer.x, visualPlayer.y)}>
              <img src={breakthroughHeroImage(visualPlayer.character, visualPlayer.dir)} alt="" />
            </div>
            {shots.map((shot) => (
              <span className={`breakthrough-shot ${shot.side} dir-${shot.dir} ${shot.big ? 'big' : ''} ${shot.piercing ? 'piercing' : ''} ${shot.spread ? 'spread' : ''} ${shot.double ? 'double' : ''} ${shot.overcharged ? 'overcharged' : ''} ${shot.chargeStage ? `charged charge-${shot.chargeStage}` : ''}`} key={shot.id} style={tokenStyle(shot.x, shot.y)} />
            ))}
          </div>
          <div className="breakthrough-hud">
            <span>{currentConfig.title}</span>
            <span>體力 {player.hp}/{player.maxHp}</span>
            <span>高度 {Math.max(0, breakthroughStart.row - player.row)}</span>
            <span>{bossAlive ? '守門未破' : '出口開啟'}</span>
          </div>
          <div className="breakthrough-upgrades">
            <span>{lightBombCharacterDef(player.character).name}</span>
            <span>{upgradeSummary}</span>
            <span>{chargeLabel}</span>
          </div>
          <div className="breakthrough-minimap">
            <span
              className="view"
              style={{
                left: `${(camera.x / breakthroughCols) * 100}%`,
                top: `${(camera.y / breakthroughRows) * 100}%`,
                width: `${(breakthroughViewCols / breakthroughCols) * 100}%`,
                height: `${(breakthroughViewRows / breakthroughRows) * 100}%`,
              }}
            />
            <span className="goal" style={{ left: `${((breakthroughBossStart.col + 0.5) / breakthroughCols) * 100}%`, top: `${((breakthroughGoalRow + 0.5) / breakthroughRows) * 100}%` }} />
            <span className="player" style={{ left: `${((visualPlayer.x + 0.5) / breakthroughCols) * 100}%`, top: `${((visualPlayer.y + 0.5) / breakthroughRows) * 100}%` }} />
            {visualEnemies.map((enemy) => (
              <span className={`enemy ${enemy.kind}`} key={`breakthrough-mini-${enemy.id}`} style={{ left: `${((enemy.x + 0.5) / breakthroughCols) * 100}%`, top: `${((enemy.y + 0.5) / breakthroughRows) * 100}%` }} />
            ))}
          </div>
          {debugGrid && <GridDebugOverlay title="BREAKTHROUGH" items={debugItems} />}
          {notice && <div className={`city-notice ${notice.kind}`} key={notice.id}>{notice.text}</div>}
          <div
            className={`city-controls ${padDirection ? `active-${padDirection}` : ''}`}
            aria-label="方向控制"
            onPointerDown={(event) => {
              if (movePointerRef.current !== null) return;
              movePointerRef.current = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
              updateMovePad(event);
            }}
            onPointerMove={(event) => {
              if (movePointerRef.current === event.pointerId) updateMovePad(event);
            }}
            onPointerUp={releaseMovePad}
            onPointerCancel={releaseMovePad}
            onLostPointerCapture={releaseMovePad}
          >
            <span className="city-stick-base" />
            <span className="city-stick-arrow up"><ChevronUp size={14} /></span>
            <span className="city-stick-arrow left"><ChevronLeft size={14} /></span>
            <span className="city-stick-arrow right"><ChevronRight size={14} /></span>
            <span className="city-stick-arrow down"><ChevronDown size={14} /></span>
            <span className="city-stick" style={padStyle} />
          </div>
          <button
            className={`city-fire-control breakthrough-fire-control ${fireActive ? `charging charge-${Math.max(0, chargeStage)}` : ''}`}
            onPointerDown={pressFire}
            onPointerUp={releaseFire}
            onPointerCancel={(event) => releaseFire(event, false)}
            onPointerLeave={(event) => releaseFire(event, false)}
            aria-label="海光射擊"
          >
            <Zap size={22} />
            <small>{chargeLabel}</small>
          </button>
          {status !== 'playing' && (
            <div className="city-result breakthrough-result">
              <strong>{status === 'won' ? '突圍成功' : '突圍失敗'}</strong>
              <div className="row-actions">
                <button onClick={restart}>再闖一次</button>
                <button className="primary-action" onClick={onBack}>返回地圖</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LightBombMazeGame({ debugGrid, onBack, onComplete }: { debugGrid: boolean; onBack: () => void; onComplete: GameCompleteHandler }) {
  const firstLevel = useMemo(() => createLightBombLevel(lightBombLevelConfig(1)), []);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useGamePausedRef();
  const rafRef = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  const nextId = useRef(1000);
  const noticeId = useRef(0);
  const selectedCharacterRef = useRef<LightBombCharacterId>('prince');
  const stageRef = useRef(1);
  const playerRef = useRef<LightBombPlayer>(createLightBombPlayer('prince'));
  const tilesRef = useRef<LightBombTile[]>(firstLevel.tiles);
  const hiddenPowerupsRef = useRef<LightBombPowerup[]>(firstLevel.hiddenPowerups);
  const powerupsRef = useRef<LightBombPowerup[]>([]);
  const enemiesRef = useRef<LightBombEnemy[]>(firstLevel.enemies);
  const bombsRef = useRef<LightBombBomb[]>([]);
  const explosionsRef = useRef<LightBombExplosion[]>([]);
  const exitRef = useRef<LightBombExit>(firstLevel.exit);
  const exitRevealedRef = useRef(false);
  const statusRef = useRef<LightBombStatus>('select');
  const heldDirectionRef = useRef<LightBombPadIntent>(null);
  const movePointerRef = useRef<number | null>(null);
  const nextPlayerMoveAtRef = useRef(Number.POSITIVE_INFINITY);
  const lightBombMoveDebugRef = useRef({ last: 'ready', attempts: 0, committed: 0 });
  const actionPointerAtRef = useRef(0);
  const remoteTriggerRef = useRef<number | null>(null);
  const completionReported = useRef(false);
  const [arenaSize, setArenaSize] = useState({ width: 0, height: 0 });
  const [selectedCharacter, setSelectedCharacter] = useState<LightBombCharacterId | null>(null);
  const [stage, setStage] = useState(1);
  const [tiles, setTiles] = useState<LightBombTile[]>(firstLevel.tiles);
  const [player, setPlayer] = useState<LightBombPlayer>(() => createLightBombPlayer('prince'));
  const [enemies, setEnemies] = useState<LightBombEnemy[]>(firstLevel.enemies);
  const [bombs, setBombs] = useState<LightBombBomb[]>([]);
  const [explosions, setExplosions] = useState<LightBombExplosion[]>([]);
  const [powerups, setPowerups] = useState<LightBombPowerup[]>([]);
  const [exit, setExit] = useState<LightBombExit>(firstLevel.exit);
  const [exitFound, setExitFound] = useState(false);
  const [exitVisible, setExitVisible] = useState(false);
  const [status, setStatus] = useState<LightBombStatus>('select');
  const [padDirection, setPadDirection] = useState<CityDirection | null>(null);
  const [padVector, setPadVector] = useState<LightBombPadVector>({ x: 0, y: 0 });
  const [notice, setNotice] = useState<LightBombNotice>(null);

  const showNotice = useCallback((kind: NonNullable<LightBombNotice>['kind'], text: string) => {
    noticeId.current += 1;
    setNotice({ id: noticeId.current, kind, text });
  }, []);

  const applyLevel = useCallback((level: LightBombLevel, options: { stage: number; character: LightBombCharacterId; carryPlayer?: LightBombPlayer; notice?: string }) => {
    const nextStage = clamp(options.stage, 1, lightBombMaxStage);
    const config = lightBombLevelConfig(nextStage);
    const nextPlayer = createLightBombPlayer(options.character, options.carryPlayer);
    selectedCharacterRef.current = options.character;
    stageRef.current = nextStage;
    playerRef.current = nextPlayer;
    tilesRef.current = level.tiles;
    hiddenPowerupsRef.current = level.hiddenPowerups;
    powerupsRef.current = [];
    enemiesRef.current = level.enemies;
    bombsRef.current = [];
    explosionsRef.current = [];
    exitRef.current = level.exit;
    exitRevealedRef.current = false;
    statusRef.current = 'playing';
    heldDirectionRef.current = null;
    movePointerRef.current = null;
    nextPlayerMoveAtRef.current = Number.POSITIVE_INFINITY;
    lightBombMoveDebugRef.current = { last: 'ready', attempts: 0, committed: 0 };
    remoteTriggerRef.current = null;
    lastTime.current = null;
    nextId.current = 1000;
    setSelectedCharacter(options.character);
    setStage(nextStage);
    setTiles(level.tiles);
    setPlayer(nextPlayer);
    setEnemies(level.enemies);
    setBombs([]);
    setExplosions([]);
    setPowerups([]);
    setExit(level.exit);
    setExitFound(false);
    setExitVisible(false);
    setStatus('playing');
    setPadDirection(null);
    setPadVector({ x: 0, y: 0 });
    setOceanBgmIntensity(config.musicIntensity);
    showNotice('door', options.notice ?? config.title);
  }, [showNotice]);

  const startRun = useCallback((characterId: LightBombCharacterId) => {
    const config = lightBombLevelConfig(1);
    completionReported.current = false;
    playGameSfx('select');
    void startOceanBgm('lightbomb', config.musicIntensity);
    applyLevel(createLightBombLevel(config), {
      stage: 1,
      character: characterId,
      notice: `${lightBombCharacterDef(characterId).name}出擊`,
    });
  }, [applyLevel]);

  const restart = useCallback(() => {
    const characterId = selectedCharacterRef.current;
    startRun(characterId);
  }, [startRun]);

  const returnToSelect = useCallback(() => {
    statusRef.current = 'select';
    heldDirectionRef.current = null;
    movePointerRef.current = null;
    nextPlayerMoveAtRef.current = Number.POSITIVE_INFINITY;
    setStatus('select');
    setSelectedCharacter(null);
    setPadDirection(null);
    setPadVector({ x: 0, y: 0 });
    setNotice(null);
    setOceanBgmIntensity(1);
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

  const canEnterCell = useCallback((row: number, col: number, bombs: LightBombBomb[], enemies: LightBombEnemy[], ignoreEnemyId?: number) => {
    if (row < 0 || col < 0 || row >= lightBombRows || col >= lightBombCols) return false;
    if (lightBombBlocks(lightBombTileAt(tilesRef.current, row, col))) return false;
    if (bombs.some((bomb) => bomb.row === row && bomb.col === col)) return false;
    return !enemies.some((enemy) => enemy.id !== ignoreEnemyId && enemy.row === row && enemy.col === col);
  }, []);

  const lightBombBlockReason = useCallback((row: number, col: number, bombs: LightBombBomb[], enemies: LightBombEnemy[], ignoreEnemyId?: number) => {
    if (row < 0 || col < 0 || row >= lightBombRows || col >= lightBombCols) return 'edge';
    if (lightBombBlocks(lightBombTileAt(tilesRef.current, row, col))) return 'wall';
    if (bombs.some((bomb) => bomb.row === row && bomb.col === col)) return 'bomb';
    if (enemies.some((enemy) => enemy.id !== ignoreEnemyId && enemy.row === row && enemy.col === col)) return 'enemy';
    return 'clear';
  }, []);

  const tryKickBomb = useCallback((bomb: LightBombBomb, direction: CityDirection, bombs: LightBombBomb[], enemies: LightBombEnemy[]) => {
    if (!playerRef.current.kick) return bombs;
    const vector = cityDirectionVector(direction);
    const nextRow = bomb.row + vector.y;
    const nextCol = bomb.col + vector.x;
    if (!canEnterCell(nextRow, nextCol, bombs.filter((item) => item.id !== bomb.id), enemies)) return bombs;
    showNotice('kick', '滑行');
    playGameSfx('kick');
    return bombs.map((item) => (
      item.id === bomb.id
        ? { ...item, row: nextRow, col: nextCol, x: bomb.col, y: bomb.row, kickedDir: direction, moveAt: performance.now() + lightBombKickStepMs }
        : item
    ));
  }, [canEnterCell, showNotice]);

  const tryMovePlayer = useCallback((direction: CityDirection) => {
    if (statusRef.current !== 'playing') return false;
    const player = { ...playerRef.current, dir: direction };
    lightBombMoveDebugRef.current.attempts += 1;
    if (!gridDistanceSettled({ x: player.col, y: player.row }, { x: player.x, y: player.y }, 0.08)) {
      playerRef.current = player;
      lightBombMoveDebugRef.current.last = 'busy';
      return false;
    }
    const vector = cityDirectionVector(direction);
    const nextRow = player.row + vector.y;
    const nextCol = player.col + vector.x;
    const blockingBomb = bombsRef.current.find((bomb) => bomb.row === nextRow && bomb.col === nextCol);
    if (blockingBomb) {
      const nextBombs = tryKickBomb(blockingBomb, direction, bombsRef.current, enemiesRef.current);
      bombsRef.current = nextBombs;
      setBombs(nextBombs);
      if (nextBombs.some((bomb) => bomb.row === nextRow && bomb.col === nextCol)) {
        playerRef.current = player;
        lightBombMoveDebugRef.current.last = 'bomb';
        return false;
      }
    }
    if (canEnterCell(nextRow, nextCol, bombsRef.current, enemiesRef.current)) {
      player.row = nextRow;
      player.col = nextCol;
      playerRef.current = player;
      lightBombMoveDebugRef.current.committed += 1;
      lightBombMoveDebugRef.current.last = 'moved';
      return true;
    }
    playerRef.current = player;
    lightBombMoveDebugRef.current.last = lightBombBlockReason(nextRow, nextCol, bombsRef.current, enemiesRef.current);
    return false;
  }, [canEnterCell, lightBombBlockReason, tryKickBomb]);

  const placeOrTriggerBomb = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    const now = performance.now();
    const player = playerRef.current;
    const remoteBomb = bombsRef.current.find((bomb) => bomb.remote);
    if (remoteBomb && player.remoteUntil > now && bombsRef.current.length >= player.maxBombs) {
      remoteTriggerRef.current = remoteBomb.id;
      playGameSfx('select');
      return;
    }
    if (bombsRef.current.length >= player.maxBombs || bombsRef.current.some((bomb) => bomb.row === player.row && bomb.col === player.col)) return;
    const remote = player.remoteUntil > now;
    const nextBomb: LightBombBomb = {
      id: nextId.current++,
      row: player.row,
      col: player.col,
      x: player.col,
      y: player.row,
      range: player.range,
      remote,
      piercing: player.pierceBombs,
      explodeAt: now + (remote ? 8000 : 2350),
      moveAt: 0,
    };
    bombsRef.current = [...bombsRef.current, nextBomb];
    setBombs(bombsRef.current);
    playGameSfx('bomb');
  }, []);

  const inputFromPad = useCallback((clientX: number, clientY: number, target: HTMLElement): LightBombPadInput => {
    const rect = target.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const size = Math.min(rect.width, rect.height);
    const distance = Math.hypot(dx, dy);
    if (distance < size * 0.13) return { intent: null, vector: { x: 0, y: 0 } };
    const maxOffset = size * 0.28;
    const vectorScale = distance > maxOffset ? maxOffset / distance : 1;
    const vector = { x: dx * vectorScale, y: dy * vectorScale };
    const horizontal: CityDirection = dx > 0 ? 'right' : 'left';
    const vertical: CityDirection = dy > 0 ? 'down' : 'up';
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    let intent: LightBombPadIntent;
    if (absX > absY * 1.8) intent = { primary: horizontal };
    else if (absY > absX * 1.8) intent = { primary: vertical };
    else intent = absX >= absY
      ? { primary: horizontal, secondary: vertical }
      : { primary: vertical, secondary: horizontal };
    return { intent, vector };
  }, []);

  const tryMoveIntent = useCallback((intent: LightBombPadIntent) => {
    if (!intent) return false;
    if (tryMovePlayer(intent.primary)) return true;
    if (intent.secondary) return tryMovePlayer(intent.secondary);
    return false;
  }, [tryMovePlayer]);

  const holdDirection = useCallback((intent: LightBombPadIntent, vector: LightBombPadVector = { x: 0, y: 0 }) => {
    const wasHolding = heldDirectionRef.current !== null;
    const sameIntent = directionPadIntentsEqual(heldDirectionRef.current, intent);
    heldDirectionRef.current = intent;
    setPadDirection(intent?.primary ?? null);
    setPadVector(intent ? vector : { x: 0, y: 0 });
    if (!intent) {
      nextPlayerMoveAtRef.current = Number.POSITIVE_INFINITY;
      return;
    }
    if (!wasHolding) {
      const moved = tryMoveIntent(intent);
      nextPlayerMoveAtRef.current = gridNextStepAt(performance.now(), moved, {
        stepMs: lightBombHoldStepMs(playerRef.current),
        retryMs: lightBombTurnRetryMs,
        turnBufferMs: lightBombTurnBufferMs,
      });
    } else if (!sameIntent) {
      nextPlayerMoveAtRef.current = gridTurnBufferAt(nextPlayerMoveAtRef.current, performance.now(), {
        stepMs: lightBombHoldStepMs(playerRef.current),
        retryMs: lightBombTurnRetryMs,
        turnBufferMs: lightBombTurnBufferMs,
      });
    }
  }, [tryMoveIntent]);

  const updatePad = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const input = inputFromPad(event.clientX, event.clientY, event.currentTarget);
    holdDirection(input.intent, input.vector);
  }, [inputFromPad, holdDirection]);

  const releasePad = useCallback((event?: ReactPointerEvent<HTMLDivElement>) => {
    if (event && movePointerRef.current !== null && movePointerRef.current !== event.pointerId) return;
    movePointerRef.current = null;
    holdDirection(null);
  }, [holdDirection]);

  useGlobalControlReset(releasePad);

  const pressBombAction = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    actionPointerAtRef.current = performance.now();
    placeOrTriggerBomb();
  }, [placeOrTriggerBomb]);

  const clickBombAction = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    if (performance.now() - actionPointerAtRef.current < 420) {
      event.preventDefault();
      return;
    }
    placeOrTriggerBomb();
  }, [placeOrTriggerBomb]);

  useEffect(() => {
    const releaseMatchingPad = (event: PointerEvent) => {
      if (movePointerRef.current === event.pointerId) releasePad();
    };
    const clearPad = () => releasePad();
    window.addEventListener('pointerup', releaseMatchingPad);
    window.addEventListener('pointercancel', releaseMatchingPad);
    window.addEventListener('blur', clearPad);
    window.addEventListener('pagehide', clearPad);
    return () => {
      window.removeEventListener('pointerup', releaseMatchingPad);
      window.removeEventListener('pointercancel', releaseMatchingPad);
      window.removeEventListener('blur', clearPad);
      window.removeEventListener('pagehide', clearPad);
    };
  }, [releasePad]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const direction = event.key === 'ArrowUp' || key === 'w' ? 'up' : event.key === 'ArrowDown' || key === 's' ? 'down' : event.key === 'ArrowLeft' || key === 'a' ? 'left' : event.key === 'ArrowRight' || key === 'd' ? 'right' : null;
      if (direction) {
        if (statusRef.current === 'playing') holdDirection({ primary: direction }, lightBombPadVectorFromDirection(direction));
        event.preventDefault();
      }
      if (event.key === ' ' || key === 'j' || key === 'k') {
        placeOrTriggerBomb();
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const direction = event.key === 'ArrowUp' || key === 'w' ? 'up' : event.key === 'ArrowDown' || key === 's' ? 'down' : event.key === 'ArrowLeft' || key === 'a' ? 'left' : event.key === 'ArrowRight' || key === 'd' ? 'right' : null;
      if (direction && heldDirectionRef.current?.primary === direction) holdDirection(null);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [holdDirection, placeOrTriggerBomb]);

  useEffect(() => {
    const tick = (time: number) => {
      if (pausedRef.current) {
        lastTime.current = time;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const last = lastTime.current ?? time;
      const dt = Math.min(34, time - last);
      lastTime.current = time;

      if (statusRef.current === 'playing') {
        const levelConfig = lightBombLevelConfig(stageRef.current);
        const held = heldDirectionRef.current;
        if (held && time >= nextPlayerMoveAtRef.current) {
          const moved = tryMoveIntent(held);
          nextPlayerMoveAtRef.current = gridNextStepAt(time, moved, {
            stepMs: lightBombHoldStepMs(playerRef.current),
            retryMs: lightBombTurnRetryMs,
            turnBufferMs: lightBombTurnBufferMs,
          });
        }

        let currentPlayer = { ...playerRef.current };
        currentPlayer.x = lightBombVisualStep(currentPlayer.x, currentPlayer.col, dt, currentPlayer.moveMs);
        currentPlayer.y = lightBombVisualStep(currentPlayer.y, currentPlayer.row, dt, currentPlayer.moveMs);

        let nextTiles = tilesRef.current;
        let nextHidden = hiddenPowerupsRef.current;
        let nextPowerups = powerupsRef.current;
        let nextBombs = bombsRef.current;
        let nextExplosions = explosionsRef.current.filter((explosion) => explosion.expiresAt > time);
        let nextEnemies = enemiesRef.current.map((enemy) => ({ ...enemy }));
        let exitRevealed = exitRevealedRef.current;
        const wasExitVisible = exitRevealedRef.current && enemiesRef.current.length === 0;
        const explodeQueue = nextBombs.filter((bomb) => bomb.explodeAt <= time || bomb.id === remoteTriggerRef.current).map((bomb) => bomb.id);
        remoteTriggerRef.current = null;

        const revealCell = (row: number, col: number) => {
          const powerupIndex = nextHidden.findIndex((powerup) => powerup.row === row && powerup.col === col);
          if (powerupIndex >= 0) {
            nextPowerups = [...nextPowerups, { ...nextHidden[powerupIndex], id: nextId.current++ }];
            nextHidden = nextHidden.filter((_, index) => index !== powerupIndex);
          }
          if (exitRef.current.row === row && exitRef.current.col === col) {
            exitRevealed = true;
            playGameSfx('door');
            showNotice('door', '門印浮現');
          }
        };

        const explodeBomb = (bombId: number) => {
          const bomb = nextBombs.find((item) => item.id === bombId);
          if (!bomb) return;
          playGameSfx('blast');
          nextBombs = nextBombs.filter((item) => item.id !== bomb.id);
          const cells = [{ row: bomb.row, col: bomb.col }];
          lightBombDirections.forEach((direction) => {
            const vector = cityDirectionVector(direction);
            for (let step = 1; step <= bomb.range; step += 1) {
              const row = bomb.row + vector.y * step;
              const col = bomb.col + vector.x * step;
              const tile = lightBombTileAt(nextTiles, row, col);
              if (tile?.kind === 'solid') break;
              cells.push({ row, col });
              const chained = nextBombs.find((item) => item.row === row && item.col === col);
              if (chained) explodeQueue.push(chained.id);
              if (tile?.kind === 'soft') {
                nextTiles = nextTiles.filter((item) => item.id !== tile.id);
                revealCell(row, col);
                if (!bomb.piercing) break;
              }
            }
          });
          nextExplosions = [
            ...nextExplosions,
            ...cells.map((cell) => ({ id: nextId.current++, row: cell.row, col: cell.col, expiresAt: time + 430 })),
          ].slice(-80);
        };

        while (explodeQueue.length) explodeBomb(explodeQueue.shift() ?? -1);

        const canSlideBombTo = (row: number, col: number, bombId: number) => {
          if (row < 0 || col < 0 || row >= lightBombRows || col >= lightBombCols) return false;
          if (lightBombBlocks(lightBombTileAt(nextTiles, row, col))) return false;
          if (nextBombs.some((bomb) => bomb.id !== bombId && bomb.row === row && bomb.col === col)) return false;
          if (currentPlayer.row === row && currentPlayer.col === col) return false;
          return !nextEnemies.some((enemy) => enemy.row === row && enemy.col === col);
        };

        nextBombs = nextBombs.map((bomb) => {
          let nextBomb = { ...bomb };
          nextBomb.x = lightBombVisualStep(nextBomb.x, nextBomb.col, dt, lightBombKickStepMs);
          nextBomb.y = lightBombVisualStep(nextBomb.y, nextBomb.row, dt, lightBombKickStepMs);
          const settled = Math.abs(nextBomb.x - nextBomb.col) + Math.abs(nextBomb.y - nextBomb.row) < 0.05;
          if (nextBomb.kickedDir && settled && time >= nextBomb.moveAt) {
            const vector = cityDirectionVector(nextBomb.kickedDir);
            const slideRow = nextBomb.row + vector.y;
            const slideCol = nextBomb.col + vector.x;
            if (canSlideBombTo(slideRow, slideCol, nextBomb.id)) {
              nextBomb = { ...nextBomb, row: slideRow, col: slideCol, moveAt: time + lightBombKickStepMs };
            } else {
              nextBomb = { ...nextBomb, x: nextBomb.col, y: nextBomb.row, kickedDir: undefined, moveAt: 0 };
            }
          }
          return nextBomb;
        });

        nextEnemies = nextEnemies.map((enemy) => {
          const nextEnemy = { ...enemy };
          const settled = Math.abs(nextEnemy.x - nextEnemy.col) + Math.abs(nextEnemy.y - nextEnemy.row) < 0.05;
          if (settled && time >= nextEnemy.moveAt) {
            const towardPlayer: CityDirection[] = Math.abs(currentPlayer.col - nextEnemy.col) > Math.abs(currentPlayer.row - nextEnemy.row)
              ? [currentPlayer.col > nextEnemy.col ? 'right' : 'left', currentPlayer.row > nextEnemy.row ? 'down' : 'up']
              : [currentPlayer.row > nextEnemy.row ? 'down' : 'up', currentPlayer.col > nextEnemy.col ? 'right' : 'left'];
            const choices = nextEnemy.kind === 'squid' && Math.random() < 0.72 ? towardPlayer : lightBombShuffle(lightBombDirections);
            const direction = choices.find((choice) => {
              const vector = cityDirectionVector(choice);
              return canEnterCell(nextEnemy.row + vector.y, nextEnemy.col + vector.x, nextBombs, nextEnemies, nextEnemy.id);
            });
            if (direction) {
              const vector = cityDirectionVector(direction);
              nextEnemy.row += vector.y;
              nextEnemy.col += vector.x;
              nextEnemy.dir = direction;
            }
            nextEnemy.moveAt = time + lightBombEnemyDelays[nextEnemy.kind] * levelConfig.enemyDelayScale + Math.random() * 220 * levelConfig.enemyDelayScale;
          }
          const moveMs = lightBombEnemyDelays[nextEnemy.kind] * 0.75 * levelConfig.enemyDelayScale;
          nextEnemy.x = lightBombVisualStep(nextEnemy.x, nextEnemy.col, dt, moveMs);
          nextEnemy.y = lightBombVisualStep(nextEnemy.y, nextEnemy.row, dt, moveMs);
          return nextEnemy;
        });

        const explosionHits = (row: number, col: number) => nextExplosions.some((explosion) => explosion.row === row && explosion.col === col);
        nextEnemies = nextEnemies.filter((enemy) => !explosionHits(enemy.row, enemy.col));
        nextPowerups = nextPowerups.filter((powerup) => {
          if (!lightBombCellsEqual(powerup, currentPlayer)) return true;
          const player = currentPlayer;
          if (powerup.kind === 'flame') player.range = Math.min(7, player.range + 1);
          if (powerup.kind === 'bomb') player.maxBombs = Math.min(5, player.maxBombs + 1);
          if (powerup.kind === 'speed') player.moveMs = Math.max(112, player.moveMs - 18);
          if (powerup.kind === 'kick') player.kick = true;
          if (powerup.kind === 'remote') player.remoteUntil = time + 20000;
          if (powerup.kind === 'shield') player.shieldUntil = time + 7000;
          playGameSfx('powerup');
          showNotice(powerup.kind, lightBombPowerupText[powerup.kind]);
          currentPlayer = player;
          return false;
        });

        const protectedByShield = currentPlayer.shieldUntil > time;
        if (!protectedByShield && (explosionHits(currentPlayer.row, currentPlayer.col) || nextEnemies.some((enemy) => lightBombCellsEqual(enemy, currentPlayer)))) {
          statusRef.current = 'lost';
          setStatus('lost');
          playGameSfx('hit');
          showNotice('hit', '再挑戰');
        }

        const visibleExit = exitRevealed && nextEnemies.length === 0;
        if (visibleExit && !wasExitVisible) {
          playGameSfx('door');
          showNotice('door', '出口開啟');
        }
        if (visibleExit && lightBombCellsEqual(currentPlayer, exitRef.current)) {
          playGameSfx('door');
          if (stageRef.current < lightBombMaxStage) {
            const nextStage = stageRef.current + 1;
            const nextConfig = lightBombLevelConfig(nextStage);
            applyLevel(createLightBombLevel(nextConfig), {
              stage: nextStage,
              character: selectedCharacterRef.current,
              carryPlayer: currentPlayer,
              notice: `${nextConfig.title}展開`,
            });
            rafRef.current = requestAnimationFrame(tick);
            return;
          } else {
            statusRef.current = 'won';
            setStatus('won');
            showNotice('door', '三層通路開啟');
            if (!completionReported.current) {
              completionReported.current = true;
              onComplete(2400 + stageRef.current * 280 + currentPlayer.range * 70 + currentPlayer.maxBombs * 120 + (currentPlayer.kick ? 110 : 0) + (currentPlayer.pierceBombs ? 110 : 0));
            }
          }
        }

        playerRef.current = currentPlayer;
        tilesRef.current = nextTiles;
        hiddenPowerupsRef.current = nextHidden;
        powerupsRef.current = nextPowerups;
        bombsRef.current = nextBombs;
        explosionsRef.current = nextExplosions;
        enemiesRef.current = nextEnemies;
        exitRevealedRef.current = exitRevealed;
        setPlayer(currentPlayer);
        setTiles(nextTiles);
        setPowerups(nextPowerups);
        setBombs(nextBombs);
        setExplosions(nextExplosions);
        setEnemies(nextEnemies);
        setExitFound(exitRevealed);
        setExitVisible(visibleExit);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [applyLevel, canEnterCell, onComplete, showNotice, tryMoveIntent]);

  const cellPx = Math.max(17, Math.min((arenaSize.width || 360) / lightBombViewCols, (arenaSize.height || 520) / lightBombViewRows));
  const worldPx = cellPx * lightBombCols;
  const camera = {
    x: clamp(player.x - lightBombViewCols / 2, 0, lightBombCols - lightBombViewCols),
    y: clamp(player.y - lightBombViewRows / 2, 0, lightBombRows - lightBombViewRows),
  };
  const viewportStyle: CSSProperties = {
    width: `${cellPx * lightBombViewCols}px`,
    height: `${cellPx * lightBombViewRows}px`,
    ['--bomb-cell-px' as string]: `${cellPx}px`,
  };
  const worldStyle: CSSProperties = {
    width: `${worldPx}px`,
    height: `${worldPx}px`,
    transform: `translate(${-camera.x * cellPx}px, ${-camera.y * cellPx}px)`,
  };
  const lightBombRenderTime = performance.now();
  const shielded = player.shieldUntil > lightBombRenderTime;
  const remote = player.remoteUntil > lightBombRenderTime;
  const padStickStyle: CSSProperties = {
    ['--pad-x' as string]: `${padVector.x}px`,
    ['--pad-y' as string]: `${padVector.y}px`,
  };
  const currentLevelConfig = lightBombLevelConfig(stage);
  const currentCharacter = lightBombCharacterDef(player.character);
  const lightBombDebugItems: GridDebugItem[] = [
    { label: 'logic', value: gridCellLabel(player.col, player.row) },
    { label: 'visual', value: `${player.x.toFixed(2)},${player.y.toFixed(2)}` },
    { label: 'intent', value: directionPadIntentLabel(heldDirectionRef.current) },
    { label: 'busy', value: !gridDistanceSettled({ x: player.col, y: player.row }, { x: player.x, y: player.y }, 0.08) },
    { label: 'next', value: Number.isFinite(nextPlayerMoveAtRef.current) ? Math.max(0, Math.round(nextPlayerMoveAtRef.current - lightBombRenderTime)) : 'idle' },
    { label: 'last', value: lightBombMoveDebugRef.current.last },
    { label: 'moves', value: `${lightBombMoveDebugRef.current.committed}/${lightBombMoveDebugRef.current.attempts}` },
  ];

  if (status === 'select') {
    return (
      <section className="screen lightbomb-screen">
        <div className="lightbomb-nav">
          <button className="icon-button" onClick={onBack} aria-label="返回">
            <ChevronLeft size={20} />
          </button>
          <button className="icon-button" onClick={returnToSelect} aria-label="重新選角">
            <RotateCcw size={20} />
          </button>
        </div>
        <div className="lightbomb-select">
          <div className="lightbomb-select-title">
            <strong>海光迷宮</strong>
            <span>選擇出戰角色</span>
          </div>
          <div className="lightbomb-roster">
            {lightBombCharacters.map((character) => (
              <button
                className={`lightbomb-character-card ${selectedCharacter === character.id ? 'selected' : ''}`}
                key={character.id}
                onClick={() => startRun(character.id)}
              >
                <img src={character.image} alt="" loading="lazy" decoding="async" />
                <strong>{character.name}</strong>
                <span>{character.ability}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="screen lightbomb-screen">
      <div className="lightbomb-nav">
        <button className="icon-button" onClick={onBack} aria-label="返回">
          <ChevronLeft size={20} />
        </button>
        <button className="icon-button" onClick={restart} aria-label="重新開始">
          <RotateCcw size={20} />
        </button>
      </div>
      <div className="lightbomb-arena" ref={arenaRef}>
        <div className="lightbomb-viewport" style={viewportStyle}>
          <div className="lightbomb-world" style={worldStyle}>
            {tiles.map((tile) => <span className={`lightbomb-tile ${tile.kind}`} key={tile.id} style={lightBombCellStyle(tile.row, tile.col)} />)}
            {exitFound && <span className={`lightbomb-exit ${exitVisible ? 'open' : 'locked'}`} style={lightBombTokenStyle(exit.col, exit.row)} />}
            {powerups.map((powerup) => (
              <span className={`lightbomb-powerup ${powerup.kind}`} key={powerup.id} style={lightBombTokenStyle(powerup.col, powerup.row)}>
                {lightBombPowerupLabels[powerup.kind]}
              </span>
            ))}
            {bombs.map((bomb) => (
              <span className={`lightbomb-bomb ${bomb.remote ? 'remote' : ''} ${bomb.piercing ? 'piercing' : ''} ${bomb.kickedDir ? 'sliding' : ''}`} key={bomb.id} style={lightBombTokenStyle(bomb.x, bomb.y)} />
            ))}
            {explosions.map((explosion) => <span className="lightbomb-explosion" key={explosion.id} style={lightBombCellStyle(explosion.row, explosion.col)} />)}
            {enemies.map((enemy) => (
              <span className={`lightbomb-enemy ${enemy.kind} dir-${enemy.dir}`} key={enemy.id} style={lightBombTokenStyle(enemy.x, enemy.y)}>
                <img src={assets.lightBombHeads[enemy.kind]} alt="" />
              </span>
            ))}
            <span className={`lightbomb-player dir-${player.dir} ${shielded ? 'shielded' : ''}`} style={lightBombTokenStyle(player.x, player.y)}>
              <img src={assets.lightBombHeads[player.character]} alt="" />
            </span>
          </div>
          <div className="lightbomb-hud">
            <span>{currentLevelConfig.title}</span>
            <span>{currentCharacter.name}</span>
            <span>敵 {enemies.length}</span>
            <span>光爆 {bombs.length}/{player.maxBombs}</span>
            <span>火力 {player.range}</span>
          </div>
          <div className="lightbomb-minimap">
            <span
              className="view"
              style={{
                left: `${(camera.x / lightBombCols) * 100}%`,
                top: `${(camera.y / lightBombRows) * 100}%`,
                width: `${(lightBombViewCols / lightBombCols) * 100}%`,
                height: `${(lightBombViewRows / lightBombRows) * 100}%`,
              }}
            />
            {exitFound && <span className={`goal ${exitVisible ? 'open' : ''}`} style={{ left: `${((exit.col + 0.5) / lightBombCols) * 100}%`, top: `${((exit.row + 0.5) / lightBombRows) * 100}%` }} />}
            <span className="player" style={{ left: `${((player.x + 0.5) / lightBombCols) * 100}%`, top: `${((player.y + 0.5) / lightBombRows) * 100}%` }} />
            {enemies.map((enemy) => (
              <span className={`enemy ${enemy.kind}`} key={`lightbomb-mini-${enemy.id}`} style={{ left: `${((enemy.x + 0.5) / lightBombCols) * 100}%`, top: `${((enemy.y + 0.5) / lightBombRows) * 100}%` }} />
            ))}
            {powerups.slice(0, 10).map((powerup) => (
              <span className="food" key={`lightbomb-mini-power-${powerup.id}`} style={{ left: `${((powerup.col + 0.5) / lightBombCols) * 100}%`, top: `${((powerup.row + 0.5) / lightBombRows) * 100}%` }} />
            ))}
          </div>
          {debugGrid && <GridDebugOverlay title="BOMB GRID" items={lightBombDebugItems} />}
          {notice && <div className={`lightbomb-notice ${notice.kind}`} key={notice.id}>{notice.text}</div>}
          <div
            className={`lightbomb-controls ${padDirection ? `active-${padDirection}` : ''}`}
            aria-label="方向控制"
            onPointerDown={(event) => {
              if (movePointerRef.current !== null) return;
              movePointerRef.current = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
              updatePad(event);
            }}
            onPointerMove={(event) => {
              if (movePointerRef.current === event.pointerId) updatePad(event);
            }}
            onPointerUp={releasePad}
            onPointerCancel={releasePad}
            onLostPointerCapture={releasePad}
          >
            <span className="lightbomb-stick-base" />
            <span className="lightbomb-stick-arrow up"><ChevronUp size={14} /></span>
            <span className="lightbomb-stick-arrow left"><ChevronLeft size={14} /></span>
            <span className="lightbomb-stick-arrow right"><ChevronRight size={14} /></span>
            <span className="lightbomb-stick-arrow down"><ChevronDown size={14} /></span>
            <span className="lightbomb-stick" style={padStickStyle} />
          </div>
          <button
            className={`lightbomb-action ${remote ? 'remote' : ''}`}
            onPointerDown={pressBombAction}
            onClick={clickBombAction}
            aria-label="放置海光爆彈"
          >
            <Sparkles size={24} />
          </button>
          {status !== 'playing' && (
            <div className="lightbomb-result">
              <strong>{status === 'won' ? '三層通路開啟' : '光爆失誤'}</strong>
              <div className="row-actions">
                <button onClick={status === 'won' ? returnToSelect : restart}>{status === 'won' ? '重新選角' : '重新挑戰'}</button>
                <button className="primary-action" onClick={onBack}>返回地圖</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AncientRevelationGame({ onBack, onComplete }: { onBack: () => void; onComplete: GameCompleteHandler }) {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useGamePausedRef();
  const rafRef = useRef<number | null>(null);
  const movePointerRef = useRef<number | null>(null);
  const claimPointerRef = useRef<number | null>(null);
  const moveIntentRef = useRef<DirectionPadIntent>(null);
  const claimHeldRef = useRef(false);
  const retractPathRef = useRef<RevelationCell[]>([]);
  const lastTickRef = useRef(0);
  const remainingRef = useRef(revelationTimeLimitMs);
  const noticeIdRef = useRef(1);
  const shotIdRef = useRef(1);
  const noticeTimerRef = useRef<number | null>(null);
  const claimedRef = useRef<boolean[][]>(createRevelationClaimed());
  const playerRef = useRef<RevelationPlayer>(createRevelationPlayer());
  const enemiesRef = useRef<RevelationEnemy[]>(createRevelationEnemies(claimedRef.current));
  const shotsRef = useRef<RevelationShot[]>([]);
  const powerupsRef = useRef<RevelationPowerup[]>(createRevelationPowerups(claimedRef.current, enemiesRef.current));
  const trailRef = useRef<RevelationCell[]>([]);
  const statusRef = useRef<RevelationStatus>('ready');
  const livesRef = useRef(3);
  const completionReported = useRef(false);

  const [claimed, setClaimed] = useState(() => claimedRef.current);
  const [player, setPlayer] = useState(() => playerRef.current);
  const [enemies, setEnemies] = useState(() => enemiesRef.current);
  const [shots, setShots] = useState<RevelationShot[]>([]);
  const [powerups, setPowerups] = useState(() => powerupsRef.current);
  const [trail, setTrail] = useState<RevelationCell[]>([]);
  const [status, setStatus] = useState<RevelationStatus>('ready');
  const [lives, setLives] = useState(3);
  const [remaining, setRemaining] = useState(revelationTimeLimitMs);
  const [notice, setNotice] = useState<RevelationNotice>(null);
  const [camera, setCamera] = useState({ x: Math.max(0, revelationStart.col - 5.5), y: Math.max(0, revelationStart.row - 15) });
  const [arenaSize, setArenaSize] = useState({ width: 0, height: 0 });
  const [padDirection, setPadDirection] = useState<CityDirection | null>(null);
  const [padVector, setPadVector] = useState<DirectionPadVector>({ x: 0, y: 0 });
  const [claimPressed, setClaimPressed] = useState(false);

  const showNotice = useCallback((text: string, kind: RevelationNoticeKind = 'seal') => {
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    setNotice({ id: noticeIdRef.current++, text, kind });
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 1300);
  }, []);

  const syncGame = useCallback((next: {
    claimed?: boolean[][];
    player?: RevelationPlayer;
    enemies?: RevelationEnemy[];
    shots?: RevelationShot[];
    powerups?: RevelationPowerup[];
    trail?: RevelationCell[];
    status?: RevelationStatus;
    lives?: number;
    remaining?: number;
  }) => {
    if (next.claimed) {
      claimedRef.current = next.claimed;
      setClaimed(next.claimed);
    }
    if (next.player) {
      playerRef.current = next.player;
      setPlayer(next.player);
    }
    if (next.enemies) {
      enemiesRef.current = next.enemies;
      setEnemies(next.enemies);
    }
    if (next.shots) {
      shotsRef.current = next.shots;
      setShots(next.shots);
    }
    if (next.powerups) {
      powerupsRef.current = next.powerups;
      setPowerups(next.powerups);
    }
    if (next.trail) {
      trailRef.current = next.trail;
      setTrail(next.trail);
    }
    if (next.status) {
      statusRef.current = next.status;
      setStatus(next.status);
    }
    if (typeof next.lives === 'number') {
      livesRef.current = next.lives;
      setLives(next.lives);
    }
    if (typeof next.remaining === 'number') {
      remainingRef.current = next.remaining;
      setRemaining(next.remaining);
    }
  }, []);

  const keepEnemiesOpen = useCallback((grid: boolean[][], items: RevelationEnemy[], defeatedEnemyIds = new Set<number>()) => items.map((enemy) => {
    if (!defeatedEnemyIds.has(enemy.id) && !revelationEnemyBlocked(grid, enemy.x, enemy.y, enemy.size)) return enemy;
    const cell = randomRevelationOpenCell(grid, [], enemy.kind === 'jellyfish' ? 8 : 4);
    const velocity = randomRevelationVelocity(Math.max(1.8, Math.hypot(enemy.vx, enemy.vy)));
    return {
      ...enemy,
      x: cell.col + 0.5,
      y: cell.row + 0.5,
      vx: velocity.vx,
      vy: velocity.vy,
      attackAt: enemy.kind === 'jellyfish' ? performance.now() + 1800 : undefined,
    };
  }), []);

  const restart = useCallback(() => {
    const nextClaimed = createRevelationClaimed();
    const nextEnemies = createRevelationEnemies(nextClaimed);
    const nextPlayer = createRevelationPlayer();
    completionReported.current = false;
    claimHeldRef.current = false;
    claimPointerRef.current = null;
    retractPathRef.current = [];
    syncGame({
      claimed: nextClaimed,
      player: nextPlayer,
      enemies: nextEnemies,
      powerups: createRevelationPowerups(nextClaimed, nextEnemies),
      shots: [],
      trail: [],
      status: 'ready',
      lives: 3,
      remaining: revelationTimeLimitMs,
    });
    moveIntentRef.current = null;
    setPadDirection(null);
    setPadVector({ x: 0, y: 0 });
    setClaimPressed(false);
    showNotice('封印板待命', 'seal');
  }, [showNotice, syncGame]);

  const beginTrailRetreat = useCallback((message = '封線回收') => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer.drawing && !currentPlayer.retracting) return;
    const trailCells = trailRef.current;
    const safeCell = revelationPositionCell(currentPlayer.safeX, currentPlayer.safeY);
    retractPathRef.current = trailCells.length > 0 ? [...trailCells].reverse() : [safeCell];
    syncGame({
      player: {
        ...currentPlayer,
        drawing: false,
        retracting: true,
      },
      trail: trailCells,
    });
    playGameSfx('select');
    showNotice(message, 'seal');
  }, [showNotice, syncGame]);

  const resetAfterHit = useCallback((time: number) => {
    const currentPlayer = playerRef.current;
    if (currentPlayer.shieldUntil > time) {
      const nextPlayer = {
        ...currentPlayer,
        x: currentPlayer.safeX,
        y: currentPlayer.safeY,
        drawing: false,
        retracting: false,
        shieldUntil: 0,
      };
      retractPathRef.current = [];
      syncGame({ player: nextPlayer, trail: [], shots: [] });
      playGameSfx('hit');
      showNotice('護盾擋下裂縫', 'shield');
      return;
    }
    const nextLives = livesRef.current - 1;
    const nextPlayer = {
      ...createRevelationPlayer(),
      orbitCharges: currentPlayer.orbitCharges,
      speedUntil: currentPlayer.speedUntil,
      freezeUntil: currentPlayer.freezeUntil,
      slowUntil: currentPlayer.slowUntil,
    };
    claimHeldRef.current = false;
    claimPointerRef.current = null;
    retractPathRef.current = [];
    syncGame({
      player: nextPlayer,
      trail: [],
      shots: [],
      lives: nextLives,
      status: nextLives > 0 ? 'ready' : 'lost',
    });
    moveIntentRef.current = null;
    setPadDirection(null);
    setPadVector({ x: 0, y: 0 });
    setClaimPressed(false);
    playGameSfx('hit');
    showNotice(nextLives > 0 ? '封線碎裂' : '封印失敗', 'hit');
  }, [showNotice, syncGame]);

  const applyCapturedPowerups = useCallback((capturedKeys: Set<string>, defeatedEnemyIds: Set<number>, baseGrid: boolean[][], baseEnemies: RevelationEnemy[], time: number) => {
    let nextGrid = baseGrid;
    let nextPlayer = playerRef.current;
    const collected = powerupsRef.current.filter((powerup) => capturedKeys.has(revelationCellKey(powerup.col, powerup.row)));
    collected.forEach((powerup) => {
      if (powerup.kind === 'speed') nextPlayer = { ...nextPlayer, speedUntil: Math.max(nextPlayer.speedUntil, time) + 16000 };
      if (powerup.kind === 'freeze') nextPlayer = { ...nextPlayer, orbitCharges: Math.min(revelationOrbitMax, nextPlayer.orbitCharges + 2) };
      if (powerup.kind === 'shield') nextPlayer = { ...nextPlayer, shieldUntil: Math.max(nextPlayer.shieldUntil, time) + 20000 };
      if (powerup.kind === 'slow') nextPlayer = { ...nextPlayer, slowUntil: Math.max(nextPlayer.slowUntil, time) + 18000 };
      if (powerup.kind === 'life') syncGame({ lives: Math.min(5, livesRef.current + 1) });
      if (powerup.kind === 'reveal') nextGrid = claimRevelationDots(nextGrid, baseEnemies);
      showNotice(revelationPowerText[powerup.kind], powerup.kind);
      playGameSfx('powerup');
    });
    if (defeatedEnemyIds.size > 0) {
      playGameSfx('hit');
      showNotice(`淨化怪物 x${defeatedEnemyIds.size}`, 'hit');
    }
    const nextEnemies = keepEnemiesOpen(nextGrid, baseEnemies, defeatedEnemyIds);
    const remainingPowerups = powerupsRef.current.filter((powerup) => !capturedKeys.has(revelationCellKey(powerup.col, powerup.row)));
    const refilled = [...remainingPowerups];
    while (refilled.length < 9) {
      const cell = randomRevelationOpenCell(nextGrid, nextEnemies, 4);
      refilled.push({
        id: Date.now() + refilled.length + Math.floor(Math.random() * 999),
        kind: revelationPowerKinds[randomInt(0, revelationPowerKinds.length - 1)],
        ...cell,
      });
    }
    return { grid: nextGrid, player: nextPlayer, enemies: nextEnemies, powerups: refilled };
  }, [keepEnemiesOpen, showNotice, syncGame]);

  useEffect(() => {
    const board = arenaRef.current;
    if (!board) return;
    const updateSize = () => {
      const rect = (viewportRef.current ?? board).getBoundingClientRect();
      setArenaSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(board);
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const tick = (time: number) => {
      if (pausedRef.current) {
        lastTickRef.current = time;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const last = lastTickRef.current || time;
      const dt = Math.min(0.05, (time - last) / 1000);
      lastTickRef.current = time;
      const currentStatus = statusRef.current;

      if (currentStatus === 'playing') {
        const nextRemaining = Math.max(0, remainingRef.current - dt * 1000);
        remainingRef.current = nextRemaining;
        setRemaining(nextRemaining);
        if (nextRemaining <= 0) {
          syncGame({ status: 'lost' });
          showNotice('時間耗盡', 'hit');
        }
      }

      if (statusRef.current === 'playing') {
        const grid = claimedRef.current;
        const intent = moveIntentRef.current;
        let currentPlayer = playerRef.current;
        const isFrozen = currentPlayer.freezeUntil > time;
        const enemyScale = isFrozen ? 0 : currentPlayer.slowUntil > time ? 0.46 : 1;
        let nextEnemies = enemiesRef.current.map((enemy) => {
          if (enemyScale === 0) return enemy;
          let nextEnemy = { ...enemy };
          const stepX = nextEnemy.vx * enemyScale * dt;
          const stepY = nextEnemy.vy * enemyScale * dt;
          if (!revelationEnemyBlocked(grid, nextEnemy.x + stepX, nextEnemy.y, nextEnemy.size)) nextEnemy.x += stepX;
          else nextEnemy.vx *= -1;
          if (!revelationEnemyBlocked(grid, nextEnemy.x, nextEnemy.y + stepY, nextEnemy.size)) nextEnemy.y += stepY;
          else nextEnemy.vy *= -1;
          return nextEnemy;
        });
        let nextShots = shotsRef.current
          .filter((shot) => shot.expiresAt > time)
          .map((shot) => ({
            ...shot,
            x: shot.x + shot.vx * dt,
            y: shot.y + shot.vy * dt,
          }))
          .filter((shot) => shot.x > -2 && shot.y > -2 && shot.x < revelationCols + 2 && shot.y < revelationRows + 2);

        nextEnemies = nextEnemies.map((enemy) => {
          if (enemy.kind !== 'jellyfish' || enemyScale === 0 || (enemy.attackAt ?? 0) > time) return enemy;
          const dx = currentPlayer.x - enemy.x;
          const dy = currentPlayer.y - enemy.y;
          const length = Math.max(0.001, Math.hypot(dx, dy));
          const baseX = dx / length;
          const baseY = dy / length;
          const shotSpeed = 9.2;
          [-0.22, 0, 0.22].forEach((angle) => {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            nextShots.push({
              id: shotIdRef.current++,
              x: enemy.x,
              y: enemy.y,
              vx: (baseX * cos - baseY * sin) * shotSpeed,
              vy: (baseX * sin + baseY * cos) * shotSpeed,
              size: 0.72,
              expiresAt: time + 3200,
            });
          });
          return { ...enemy, attackAt: time + 2100 };
        });

        if (currentPlayer.drawing && !claimHeldRef.current) {
          beginTrailRetreat('封線回收');
          syncGame({ enemies: nextEnemies, shots: nextShots });
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        if (currentPlayer.retracting) {
          const path = retractPathRef.current;
          const targetCell = path[0] ?? revelationPositionCell(currentPlayer.safeX, currentPlayer.safeY);
          const target = revelationCellCenter(targetCell);
          const dx = target.x - currentPlayer.x;
          const dy = target.y - currentPlayer.y;
          const distance = Math.hypot(dx, dy);
          const step = revelationRetractSpeed * dt;
          if (distance <= step) {
            currentPlayer = { ...currentPlayer, x: target.x, y: target.y };
            path.shift();
            if (path.length === 0) {
              currentPlayer = {
                ...currentPlayer,
                x: currentPlayer.safeX,
                y: currentPlayer.safeY,
                drawing: false,
                retracting: false,
              };
              retractPathRef.current = [];
              syncGame({ player: currentPlayer, trail: [], enemies: nextEnemies, shots: nextShots });
            } else {
              syncGame({ player: currentPlayer, trail: [...path], enemies: nextEnemies, shots: nextShots });
            }
          } else {
            currentPlayer = {
              ...currentPlayer,
              x: currentPlayer.x + (dx / distance) * step,
              y: currentPlayer.y + (dy / distance) * step,
            };
            syncGame({ player: currentPlayer, trail: [...path], enemies: nextEnemies, shots: nextShots });
          }
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const spendOrbitGuard = () => {
          if (currentPlayer.orbitCharges <= 0) return false;
          const remainingOrbs = currentPlayer.orbitCharges - 1;
          currentPlayer = { ...currentPlayer, orbitCharges: remainingOrbs };
          const guardRadius = 4.4;
          nextShots = nextShots.filter((shot) => Math.hypot(shot.x - currentPlayer.x, shot.y - currentPlayer.y) > guardRadius);
          nextEnemies = nextEnemies.map((enemy) => {
            const dx = enemy.x - currentPlayer.x;
            const dy = enemy.y - currentPlayer.y;
            const distance = Math.max(0.001, Math.hypot(dx, dy));
            if (distance > guardRadius + enemy.size * 0.45) return enemy;
            const nx = dx / distance;
            const ny = dy / distance;
            const speed = Math.max(2.2, Math.hypot(enemy.vx, enemy.vy));
            const pushedX = enemy.x + nx * 1.8;
            const pushedY = enemy.y + ny * 1.8;
            const canPush = !revelationEnemyBlocked(grid, pushedX, pushedY, enemy.size);
            return {
              ...enemy,
              x: canPush ? pushedX : enemy.x,
              y: canPush ? pushedY : enemy.y,
              vx: nx * speed,
              vy: ny * speed,
              attackAt: enemy.kind === 'jellyfish' ? time + 1500 : enemy.attackAt,
            };
          });
          syncGame({ player: currentPlayer, enemies: nextEnemies, shots: nextShots });
          playGameSfx('blast');
          showNotice(remainingOrbs > 0 ? `護身光彈 ${remainingOrbs}` : '光彈耗盡', 'freeze');
          return true;
        };

        const shotHitPlayer = currentPlayer.drawing && nextShots.some((shot) => Math.hypot(shot.x - currentPlayer.x, shot.y - currentPlayer.y) < shot.size * 0.5 + 0.38);
        const shotHitTrail = currentPlayer.drawing && trailRef.current.some((cell) => (
          nextShots.some((shot) => Math.hypot(shot.x - (cell.col + 0.5), shot.y - (cell.row + 0.5)) < shot.size * 0.5 + 0.3)
        ));
        if (shotHitPlayer || shotHitTrail) {
          if (!spendOrbitGuard()) resetAfterHit(time);
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        if (intent?.primary) {
          const direction = intent.primary;
          const vector = cityDirectionVector(direction);
          const speed = (currentPlayer.speedUntil > time ? 10.3 : 7.2) * dt;
          const proposedX = clamp(currentPlayer.x + vector.x * speed, 0.5, revelationCols - 0.5);
          const proposedY = clamp(currentPlayer.y + vector.y * speed, 0.5, revelationRows - 0.5);
          const nextCell = revelationPositionCell(proposedX, proposedY);
          const nextSafe = revelationCellIsClaimed(grid, nextCell.col, nextCell.row);
          const currentCell = revelationPositionCell(currentPlayer.x, currentPlayer.y);
          const currentBoundary = revelationCellIsBoundary(grid, currentCell.col, currentCell.row);
          let nextTrail = trailRef.current;
          let moved = false;

          if (!currentPlayer.drawing) {
            if (nextSafe) {
              if (revelationCellIsBoundary(grid, nextCell.col, nextCell.row)) {
                currentPlayer = { ...currentPlayer, safeX: proposedX, safeY: proposedY, dir: direction };
                moved = true;
              } else {
                currentPlayer = { ...currentPlayer, dir: direction };
              }
            } else if (claimHeldRef.current && currentBoundary) {
              const startCell = revelationPositionCell(currentPlayer.x, currentPlayer.y);
              nextTrail = [startCell, nextCell];
              currentPlayer = { ...currentPlayer, drawing: true, retracting: false, dir: direction };
              moved = true;
            } else {
              currentPlayer = { ...currentPlayer, dir: direction };
            }
          } else if (nextSafe) {
            const capture = resolveRevelationCapture(grid, [...nextTrail, nextCell], nextEnemies);
            const applied = applyCapturedPowerups(capture.capturedKeys, capture.defeatedEnemyIds, capture.grid, nextEnemies, time);
            nextEnemies = applied.enemies;
            const percent = revelationClaimedPercent(applied.grid);
            currentPlayer = {
              ...applied.player,
              x: proposedX,
              y: proposedY,
              safeX: proposedX,
              safeY: proposedY,
              dir: direction,
              drawing: false,
              retracting: false,
            };
            syncGame({
              claimed: applied.grid,
              player: currentPlayer,
              enemies: nextEnemies,
              shots: nextShots,
              powerups: applied.powerups,
              trail: [],
              status: percent >= revelationTargetPercent ? 'won' : 'playing',
            });
            playGameSfx(percent >= revelationTargetPercent ? 'door' : 'powerup');
            if (percent >= revelationTargetPercent) {
              showNotice('王女解封', 'seal');
              if (!completionReported.current) {
                completionReported.current = true;
                onComplete(2600 + Math.round(percent * 22) + livesRef.current * 160 + Math.ceil(remainingRef.current / 1000) * 10);
              }
            }
            rafRef.current = requestAnimationFrame(tick);
            return;
          } else {
            const lastTrail = nextTrail[nextTrail.length - 1];
            const nextKey = revelationCellKey(nextCell.col, nextCell.row);
            const previousTrail = new Set(nextTrail.slice(0, -2).map((cell) => revelationCellKey(cell.col, cell.row)));
            if (previousTrail.has(nextKey)) {
              beginTrailRetreat('封線回收');
              syncGame({ enemies: nextEnemies, shots: nextShots });
              rafRef.current = requestAnimationFrame(tick);
              return;
            }
            if (!lastTrail || lastTrail.col !== nextCell.col || lastTrail.row !== nextCell.row) nextTrail = [...nextTrail, nextCell];
            currentPlayer = { ...currentPlayer, dir: direction };
            moved = true;
          }

          if (moved) currentPlayer = { ...currentPlayer, x: proposedX, y: proposedY };
          syncGame({ player: currentPlayer, trail: nextTrail });
        }

        const currentTrail = trailRef.current;
        currentPlayer = playerRef.current;
        if (currentPlayer.drawing) {
          const playerHit = nextEnemies.some((enemy) => Math.hypot(enemy.x - currentPlayer.x, enemy.y - currentPlayer.y) < enemy.size * 0.42 + 0.25);
          const trailHit = currentTrail.some((cell) => nextEnemies.some((enemy) => Math.hypot(enemy.x - (cell.col + 0.5), enemy.y - (cell.row + 0.5)) < enemy.size * 0.45));
          if (playerHit || trailHit) {
            if (!spendOrbitGuard()) resetAfterHit(time);
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
        }
        syncGame({ enemies: nextEnemies, shots: nextShots });
      }

      const currentPlayer = playerRef.current;
      const cellPx = Math.max(18, Math.min((arenaSize.width || 360) / 11, (arenaSize.height || 560) / 18));
      const viewCols = Math.max(1, (arenaSize.width || cellPx * 11) / cellPx);
      const viewRows = Math.max(1, (arenaSize.height || cellPx * 18) / cellPx);
      const targetCamera = {
        x: clamp(currentPlayer.x - viewCols / 2, 0, Math.max(0, revelationCols - viewCols)),
        y: clamp(currentPlayer.y - viewRows / 2, 0, Math.max(0, revelationRows - viewRows)),
      };
      setCamera((previous) => ({
        x: previous.x + (targetCamera.x - previous.x) * 0.16,
        y: previous.y + (targetCamera.y - previous.y) * 0.16,
      }));

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [applyCapturedPowerups, arenaSize.height, arenaSize.width, beginTrailRetreat, onComplete, resetAfterHit, showNotice, syncGame]);

  const updatePad = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const input = directionPadInputFromPointer(event.clientX, event.clientY, event.currentTarget);
    moveIntentRef.current = input.intent;
    setPadDirection(input.intent?.primary ?? null);
    setPadVector(input.intent ? input.vector : { x: 0, y: 0 });
    if (input.intent && statusRef.current === 'ready') syncGame({ status: 'playing' });
  }, [syncGame]);

  const releasePad = useCallback((event?: ReactPointerEvent<HTMLDivElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (event && movePointerRef.current !== null && event.pointerId !== movePointerRef.current) return;
    movePointerRef.current = null;
    moveIntentRef.current = null;
    setPadDirection(null);
    setPadVector({ x: 0, y: 0 });
  }, []);

  const pressClaim = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (claimPointerRef.current !== null) return;
    claimPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    claimHeldRef.current = true;
    setClaimPressed(true);
    if (statusRef.current === 'ready') syncGame({ status: 'playing' });
  }, [syncGame]);

  const releaseClaim = useCallback((event?: ReactPointerEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (event && claimPointerRef.current !== null && event.pointerId !== claimPointerRef.current) return;
    claimPointerRef.current = null;
    claimHeldRef.current = false;
    setClaimPressed(false);
    if (playerRef.current.drawing) beginTrailRetreat('封線回收');
  }, [beginTrailRetreat]);

  const releaseAllControls = useCallback(() => {
    releasePad();
    releaseClaim();
  }, [releaseClaim, releasePad]);

  useGlobalControlReset(releaseAllControls);

  useEffect(() => {
    const releaseMatchingPad = (event: PointerEvent) => {
      if (movePointerRef.current === event.pointerId) releasePad();
    };
    const releaseMatchingClaim = (event: PointerEvent) => {
      if (claimPointerRef.current === event.pointerId) releaseClaim();
    };
    const clearControls = () => releaseAllControls();
    window.addEventListener('pointerup', releaseMatchingPad);
    window.addEventListener('pointercancel', releaseMatchingPad);
    window.addEventListener('pointerup', releaseMatchingClaim);
    window.addEventListener('pointercancel', releaseMatchingClaim);
    window.addEventListener('blur', clearControls);
    window.addEventListener('pagehide', clearControls);
    return () => {
      window.removeEventListener('pointerup', releaseMatchingPad);
      window.removeEventListener('pointercancel', releaseMatchingPad);
      window.removeEventListener('pointerup', releaseMatchingClaim);
      window.removeEventListener('pointercancel', releaseMatchingClaim);
      window.removeEventListener('blur', clearControls);
      window.removeEventListener('pagehide', clearControls);
    };
  }, [releaseAllControls, releaseClaim, releasePad]);

  const cellPx = Math.max(18, Math.min((arenaSize.width || 360) / 11, (arenaSize.height || 560) / 18));
  const renderViewCols = Math.max(1, (arenaSize.width || cellPx * 11) / cellPx);
  const renderViewRows = Math.max(1, (arenaSize.height || cellPx * 18) / cellPx);
  const worldWidth = cellPx * revelationCols;
  const worldHeight = cellPx * revelationRows;
  const viewportStyle: CSSProperties = {
    ['--revelation-cell-px' as string]: `${cellPx}px`,
  };
  const worldStyle: CSSProperties = {
    width: `${worldWidth}px`,
    height: `${worldHeight}px`,
    transform: `translate3d(${-camera.x * cellPx}px, ${-camera.y * cellPx}px, 0)`,
  };
  const cellStyle = (cell: RevelationCell): CSSProperties => ({
    left: `${cell.col * cellPx}px`,
    top: `${cell.row * cellPx}px`,
    width: `${cellPx}px`,
    height: `${cellPx}px`,
  });
  const claimedCellStyle = (cell: RevelationCell): CSSProperties => ({
    ...cellStyle(cell),
    backgroundImage: `linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(118, 228, 255, 0.12)), url(${assets.revelation.frozen})`,
    backgroundSize: `${worldWidth}px ${worldHeight}px`,
    backgroundPosition: `-${cell.col * cellPx}px -${cell.row * cellPx}px`,
  });
  const tokenStyle = (x: number, y: number, size = 1): CSSProperties => ({
    left: `${x * cellPx}px`,
    top: `${y * cellPx}px`,
    width: `${cellPx * size}px`,
    height: `${cellPx * size}px`,
  });
  const claimedCells = useMemo(() => {
    const cells: RevelationCell[] = [];
    claimed.forEach((rowCells, row) => rowCells.forEach((isClaimed, col) => {
      if (isClaimed) cells.push({ col, row });
    }));
    return cells;
  }, [claimed]);
  const percent = revelationClaimedPercent(claimed);
  const remainingSec = Math.ceil(remaining / 1000);
  const revelationMode = player.retracting ? '回收' : player.drawing ? '開圖' : '邊界';
  const revelationModeClass = player.retracting ? 'retract' : player.drawing ? 'danger' : 'safe';
  const padStickStyle: CSSProperties = {
    ['--pad-x' as string]: `${padVector.x}px`,
    ['--pad-y' as string]: `${padVector.y}px`,
  };
  const enemyImage = (kind: RevelationEnemyKind) => {
    if (kind === 'jellyfish') return assets.revelation.jellyfish;
    if (kind === 'squid') return assets.lightBombHeads.squid;
    if (kind === 'urchin') return assets.lightBombHeads.urchin;
    return assets.lightBombHeads.anemone;
  };

  return (
    <section className="screen revelation-screen">
      <div className="revelation-nav">
        <button className="icon-button" onClick={onBack} aria-label="返回">
          <ChevronLeft size={20} />
        </button>
        <button className="icon-button" onClick={restart} aria-label="重新開始">
          <RotateCcw size={20} />
        </button>
      </div>
      <div className="revelation-arena" ref={arenaRef}>
        <div className={`revelation-viewport ${player.retracting ? 'retracting' : player.drawing ? 'drawing' : 'safe'}`} ref={viewportRef} style={viewportStyle}>
          <div className="revelation-world" style={worldStyle}>
            <img className="revelation-bg" src={assets.revelation.frozen} alt="" />
            <div className="revelation-frost" />
            {claimedCells.map((cell) => (
              <span className="revelation-claimed" key={revelationCellKey(cell.col, cell.row)} style={claimedCellStyle(cell)} />
            ))}
            {trail.map((cell, index) => (
              <span className="revelation-trail" key={`${cell.col}-${cell.row}-${index}`} style={cellStyle(cell)} />
            ))}
            {powerups.map((powerup) => (
              <span className={`revelation-powerup ${powerup.kind}`} key={powerup.id} style={tokenStyle(powerup.col + 0.5, powerup.row + 0.5, 0.92)}>
                {revelationPowerLabels[powerup.kind]}
              </span>
            ))}
            {enemies.map((enemy) => (
              <span className={`revelation-enemy ${enemy.kind} ${player.freezeUntil > performance.now() ? 'frozen' : ''}`} key={enemy.id} style={tokenStyle(enemy.x, enemy.y, enemy.size)}>
                <img src={enemyImage(enemy.kind)} alt="" />
              </span>
            ))}
            {shots.map((shot) => (
              <span className="revelation-shot" key={shot.id} style={tokenStyle(shot.x, shot.y, shot.size)} />
            ))}
            <span className={`revelation-player dir-${player.dir} ${player.drawing ? 'drawing' : ''} ${player.retracting ? 'retracting' : ''} ${player.shieldUntil > performance.now() ? 'shielded' : ''}`} style={tokenStyle(player.x, player.y, 1.14)}>
              <img src={assets.lightBombHeads.prince} alt="" />
              {Array.from({ length: Math.min(player.orbitCharges, revelationOrbitMax) }).map((_, index) => (
                <i className={`revelation-orb orb-${index}`} key={`revelation-orb-${index}`} />
              ))}
            </span>
          </div>
          <div className="revelation-hud">
            <span>封印 <strong>{percent}%</strong></span>
            <span className={revelationModeClass}>{revelationMode}</span>
            <span>目標 <strong>{revelationTargetPercent}%</strong></span>
            <span>時 <strong>{remainingSec}</strong></span>
            <span>彈 <strong>{player.orbitCharges}</strong> 命 <strong>{lives}</strong></span>
          </div>
          <div className="revelation-minimap">
            <span
              className="view"
              style={{
                left: `${(camera.x / revelationCols) * 100}%`,
                top: `${(camera.y / revelationRows) * 100}%`,
                width: `${(renderViewCols / revelationCols) * 100}%`,
                height: `${(renderViewRows / revelationRows) * 100}%`,
              }}
            />
            <span className="player" style={{ left: `${(player.x / revelationCols) * 100}%`, top: `${(player.y / revelationRows) * 100}%` }} />
            {enemies.map((enemy) => (
              <span className={`enemy ${enemy.kind}`} key={`revelation-mini-${enemy.id}`} style={{ left: `${(enemy.x / revelationCols) * 100}%`, top: `${(enemy.y / revelationRows) * 100}%` }} />
            ))}
            {powerups.slice(0, 9).map((powerup) => (
              <span className="food" key={`revelation-mini-power-${powerup.id}`} style={{ left: `${((powerup.col + 0.5) / revelationCols) * 100}%`, top: `${((powerup.row + 0.5) / revelationRows) * 100}%` }} />
            ))}
          </div>
          {notice && <div className={`revelation-notice ${notice.kind}`} key={notice.id}>{notice.text}</div>}
          {status === 'ready' && (
            <div className="revelation-ready">
              <strong>冰晶封印板</strong>
              <span>沿邊界移動，按住右下光印才出界開圖。</span>
            </div>
          )}
          {(status === 'won' || status === 'lost') && (
            <div className={`revelation-result ${status}`}>
              {status === 'won' && <img src={assets.revelation.released} alt="" />}
              <strong>{status === 'won' ? '冰晶王女解封' : '封印線崩解'}</strong>
              <div className="row-actions">
                <button onClick={restart}>{status === 'won' ? '再次啟示' : '重新挑戰'}</button>
                <button className="primary-action" onClick={onBack}>返回地圖</button>
              </div>
            </div>
          )}
        </div>
        <div
          className={`revelation-controls ${padDirection ? `active-${padDirection}` : ''}`}
          aria-label="方向控制"
          onPointerDown={(event) => {
            if (movePointerRef.current !== null) return;
            movePointerRef.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            updatePad(event);
          }}
          onPointerMove={(event) => {
            if (movePointerRef.current === event.pointerId) updatePad(event);
          }}
          onPointerUp={releasePad}
          onPointerCancel={releasePad}
          onLostPointerCapture={releasePad}
        >
          <span className="revelation-stick-base" />
          <span className="revelation-stick-arrow up"><ChevronUp size={14} /></span>
          <span className="revelation-stick-arrow left"><ChevronLeft size={14} /></span>
          <span className="revelation-stick-arrow right"><ChevronRight size={14} /></span>
          <span className="revelation-stick-arrow down"><ChevronDown size={14} /></span>
          <span className="revelation-stick" style={padStickStyle} />
        </div>
        <button
          className={`revelation-action ${claimPressed || player.drawing ? 'charged' : ''}`}
          onPointerDown={pressClaim}
          onPointerUp={releaseClaim}
          onPointerCancel={releaseClaim}
          onLostPointerCapture={releaseClaim}
          aria-label="按住開圖"
        >
          <Sparkles size={24} />
          <small>{claimPressed || player.drawing ? '開圖' : '按住'}</small>
        </button>
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
            <img src={character.poster} alt={`${character.name}角色海報`} loading="lazy" decoding="async" />
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

function VideoLeadIn({
  leadIn,
  backLabel,
  onBack,
  onComplete,
}: {
  leadIn: VideoLeadInConfig;
  backLabel: string;
  onBack: () => void;
  onComplete: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const stopVideoPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }, []);

  const handleBack = useCallback(() => {
    stopVideoPlayback();
    onBack();
  }, [onBack, stopVideoPlayback]);

  const handleComplete = useCallback(() => {
    stopVideoPlayback();
    onComplete();
  }, [onComplete, stopVideoPlayback]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
    return () => {
      video.pause();
      video.currentTime = 0;
    };
  }, [leadIn.src]);

  return (
    <section className="screen video-screen">
      <button className="icon-button video-back-button" onClick={handleBack} aria-label={backLabel}>
        <ChevronLeft size={21} />
      </button>
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
        onEnded={handleComplete}
      />
      <div className="video-actions">
        <button onClick={() => videoRef.current?.play()}>
          <Play size={18} />
          看影片
        </button>
        <button className="primary-action" onClick={handleComplete}>
          {leadIn.actionLabel}
        </button>
      </div>
    </section>
  );
}

function CombatStage({ onVictory, onExit }: { onVictory: () => void; onExit: () => void }) {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useGamePausedRef();
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

  const clearCombatControls = useCallback(() => {
    keysRef.current = { left: false, right: false, up: false, down: false };
  }, []);

  useGlobalControlReset(clearCombatControls);

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
      if (pausedRef.current) {
        lastTime.current = time;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
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

