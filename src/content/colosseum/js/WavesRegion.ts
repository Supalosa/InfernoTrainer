import { cacheSound, Manticore, Player, Random, Settings, Sound, SoundCache, TileMarker, Viewport } from "osrs-sdk";
import type { Loadout, Mob } from "osrs-sdk";

import { colosseumLoadout } from "./ColosseumLoadout";
import { ColosseumRegion } from "./ColosseumRegion";
import { ColosseumScene } from "./ColosseumScene";
import { colosseumSettings } from "./ColosseumSettings";
import { COLOSSEUM_ASSETS } from "../../../assets";
import {
  JavelinColossus,
  LineOfSightPillar1x1,
  LineOfSightPillar3x3,
  SerpentShaman,
  ShockwaveColossus,
} from "./mobs";

export const WAVE_COMPOSITIONS = {
  1: { shaman: 1, javelin: 0, manticore: 0, shockwave: 0 },
  2: { shaman: 1, javelin: 1, manticore: 0, shockwave: 0 },
  3: { shaman: 1, javelin: 2, manticore: 0, shockwave: 0 },
  4: { shaman: 1, javelin: 0, manticore: 1, shockwave: 0 },
  5: { shaman: 1, javelin: 1, manticore: 1, shockwave: 0 },
  6: { shaman: 1, javelin: 2, manticore: 1, shockwave: 0 },
  7: { shaman: 0, javelin: 1, manticore: 1, shockwave: 1 },
  8: { shaman: 0, javelin: 2, manticore: 1, shockwave: 1 },
  9: { shaman: 0, javelin: 1, manticore: 2, shockwave: 0 },
  10: { shaman: 0, javelin: 2, manticore: 2, shockwave: 0 },
  11: { shaman: 0, javelin: 1, manticore: 2, shockwave: 1 },
} as const;

export type WaveNumber = keyof typeof WAVE_COMPOSITIONS;

// Perimeter tiles derived from osrs-colosseum's blockedTileRanges. Only the
// inaccessible tiles bordering an accessible tile are retained. Coordinates
// are translated from the solver into this region by (+10, +9).
const EDGE_BLOCKER_X_BY_Y: ReadonlyArray<readonly [number, readonly number[]]> = [
  [9, [19, 20, 21, 22, 25, 26, 27, 28, 31, 32, 33, 34]],
  [10, [17, 18, 35, 36]],
  [11, [16, 37, 38]],
  [12, [15, 39]],
  [13, [13, 14, 39, 40]],
  [14, [12, 41]],
  [15, [12, 41]],
  [16, [11, 42]],
  [17, [11, 42]],
  [18, [10, 43]],
  [19, [10, 43]],
  [20, [10, 42]],
  [21, [10, 41]],
  [22, [41]],
  [23, [41]],
  [24, [10, 41]],
  [25, [10, 41]],
  [26, [10, 41]],
  [27, [10, 41]],
  [28, [41]],
  [29, [41]],
  [30, [10, 41]],
  [31, [10, 42]],
  [32, [10, 43]],
  [33, [10, 43]],
  [34, [11, 42]],
  [35, [11, 42]],
  [36, [12, 41]],
  [37, [12, 41]],
  [38, [13, 14, 39, 40]],
  [39, [14, 39]],
  [40, [15, 16, 37, 38]],
  [41, [17, 18, 35, 36]],
  [42, [19, 20, 21, 22, 25, 26, 27, 28, 31, 32, 33, 34]],
];

// osrs-colosseum relies on its canvas bounds behind these gate recesses. Put
// the closing tiles one step outside the visible inner edge so the notches are
// retained in this larger Region.
const OUTER_GATE_BLOCKERS = [
  { x: 23, y: 8 }, { x: 24, y: 8 },
  { x: 29, y: 8 }, { x: 30, y: 8 },
  { x: 23, y: 43 }, { x: 24, y: 43 },
  { x: 29, y: 43 }, { x: 30, y: 43 },
  { x: 9, y: 22 }, { x: 9, y: 23 },
  { x: 9, y: 28 }, { x: 9, y: 29 },
] as const;

export const COLOSSEUM_SPAWN_POINTS = [
  { x: 13, y: 28 },
  { x: 19, y: 26 },
  { x: 13, y: 23 },
  { x: 23, y: 23 },
  { x: 29, y: 23 },
  { x: 27, y: 18 },
  { x: 23, y: 29 },
  { x: 29, y: 29 },
  { x: 26, y: 33 },
  { x: 34, y: 25 },
  { x: 38, y: 23 },
  { x: 38, y: 28 },
] as const;

// spawns that lead to double souths
const SOUTH_SPAWN_1 = { x: 26, y: 33 } as const;
const SOUTH_SPAWN_2 = { x: 23, y: 29 } as const;

function shuffle<T>(values: readonly T[]): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Random.get() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function isWithinTiles(first: { x: number; y: number }, second: { x: number; y: number }, distance: number) {
  return Math.max(Math.abs(first.x - second.x), Math.abs(first.y - second.y)) <= distance;
}

function sameLocation(first: { x: number; y: number }, second: { x: number; y: number }) {
  return first.x === second.x && first.y === second.y;
}

function npcOrder(mob: Mob) {
  if (mob instanceof Manticore) return 0;
  if (mob instanceof SerpentShaman) return 1;
  if (mob instanceof JavelinColossus) return 2;
  if (mob instanceof ShockwaveColossus) return 3;
  return Number.MAX_SAFE_INTEGER;
}

/** Visual sandbox for the NPCs used by ordinary Colosseum waves. */
export class WavesRegion extends ColosseumRegion {
  private pendingMobs: Mob[] = [];
  private waveMobPool: Record<"shaman" | "javelin" | "manticore" | "shockwave", Mob[]> = {
    shaman: [], javelin: [], manticore: [], shockwave: [],
  };
  private selectedWave: WaveNumber;
  private wavePhase: "waiting" | "countdown" | "active" = "waiting";
  private waveStartRequested = false;
  private waveSpawnTicks = 0;
  private spawnEligibilityPlayerLocation: { x: number; y: number } | null = null;
  private waveStateListeners = new Set<() => void>();

  constructor(loadouts: Loadout[] = [colosseumLoadout]) {
    super(loadouts);
    this.selectedWave = colosseumSettings.getSnapshot().waveNumber as WaveNumber;
  }

  override getName() {
    return "Fortis Colosseum Waves";
  }

  override initialiseRegion() {
    const player = new Player(this, { x: 17, y: 24 });
    this.addPlayer(player);

    const mobOptions = {
      cooldown: 3,
    };
    this.waveMobPool = {
      shaman: [new SerpentShaman(this, { x: 23, y: 30 }, mobOptions)],
      javelin: [
        new JavelinColossus(this, { x: 20, y: 30 }, mobOptions),
        new JavelinColossus(this, { x: 29, y: 24 }, mobOptions),
      ],
      manticore: [
        new Manticore(this, { x: 21, y: 24 }, mobOptions),
        new Manticore(this, { x: 29, y: 19 }, mobOptions),
      ],
      shockwave: [new ShockwaveColossus(this, { x: 29, y: 32 }, mobOptions)],
    };
    this.pendingMobs = [
      ...this.waveMobPool.shaman,
      ...this.waveMobPool.javelin,
      ...this.waveMobPool.manticore,
      ...this.waveMobPool.shockwave,
    ];

    // A 3x3 NPC is anchored at its southwest tile, one tile southwest of
    // each pillar's centre coordinate.
    this.addEntity(new LineOfSightPillar3x3(this, { x: 18, y: 19 }));
    this.addEntity(new LineOfSightPillar3x3(this, { x: 33, y: 19 }));
    this.addEntity(new LineOfSightPillar3x3(this, { x: 18, y: 34 }));
    this.addEntity(new LineOfSightPillar3x3(this, { x: 33, y: 34 }));

    EDGE_BLOCKER_X_BY_Y.forEach(([y, xs]) => {
      xs.forEach((x) => this.addEntity(new LineOfSightPillar1x1(this, { x, y })));
    });
    OUTER_GATE_BLOCKERS.forEach((location) => {
      this.addEntity(new LineOfSightPillar1x1(this, { ...location }));
    });

    // osrs-colosseum's canonical B5 tile is [7, 15], translated by (+10, +9).
    this.addEntity(new TileMarker(this, { x: 17, y: 24 }, "#00FF00", 1, false));

    if (Settings.use3dView) {
      this.addEntity(new ColosseumScene(this, { x: 0, y: 0 }));
    }

    return { player };
  }

  override reset(startWorld = true) {
    this.wavePhase = "waiting";
    this.waveStartRequested = false;
    this.waveSpawnTicks = 0;
    this.spawnEligibilityPlayerLocation = null;
    this.pendingMobs = [];
    const reset = super.reset(false);
    // The modal owns the wave-start gate. Keep the world live so the player
    // can move during the five ticks between modal close and NPC placement.
    this.world.getReadyTimer = 0;
    reset.player.frozen = 1;
    Viewport.viewport.rotateEast();
    this.notifyWaveStateChanged();
    if (startWorld) this.world.startTicking();
    return reset;
  }

  requestWaveStart() {
    if (this.wavePhase === "waiting") this.waveStartRequested = true;
  }

  readonly subscribeWaveState = (listener: () => void) => {
    this.waveStateListeners.add(listener);
    return () => this.waveStateListeners.delete(listener);
  };

  readonly isWaveStartModalOpen = () => this.wavePhase === "waiting";

  readonly getSelectedWave = () => this.selectedWave;

  setSelectedWave(wave: WaveNumber) {
    if (this.wavePhase !== "waiting" || wave === this.selectedWave) return;
    this.selectedWave = wave;
    colosseumSettings.set({ waveNumber: wave });
    this.notifyWaveStateChanged();
  }

  override postTick() {
    if (this.wavePhase === "waiting" && this.waveStartRequested) {
      // postTick is a server-tick boundary: close the modal here, then count
      // five complete ticks before placing the NPCs into the Region.
      this.wavePhase = "countdown";
      this.waveStartRequested = false;
      this.waveSpawnTicks = 5;
      SoundCache.play(new Sound(cacheSound(COLOSSEUM_ASSETS.sounds.waveStartAcknowledged.id), 0.1));
      this.notifyWaveStateChanged();
      return;
    }

    if (this.wavePhase === "waiting") {
      // Player movement is processed before postTick. Refreshing a one-tick
      // freeze here holds them until the server acknowledges Start, without
      // pausing the world or preventing camera input.
      this.players[0].freeze(1);
      return;
    }

    if (this.wavePhase !== "countdown") return;
    this.waveSpawnTicks--;
    if (this.waveSpawnTicks === 1) {
      this.spawnEligibilityPlayerLocation = { ...this.players[0].location };
    }
    if (this.waveSpawnTicks > 0) return;

    const player = this.players[0];
    const aggressive = colosseumSettings.getSnapshot().npcsAggressive;
    const composition = WAVE_COMPOSITIONS[this.selectedWave];
    const waveMobs = [
      ...this.waveMobPool.shaman.slice(0, composition.shaman),
      ...this.waveMobPool.javelin.slice(0, composition.javelin),
      ...this.waveMobPool.manticore.slice(0, composition.manticore),
      ...this.waveMobPool.shockwave.slice(0, composition.shockwave),
    ];

    const randomizedMobs = shuffle(waveMobs);
    const eligibilityPlayerLocation = this.spawnEligibilityPlayerLocation ?? player.location;
    const eligibleSpawns = COLOSSEUM_SPAWN_POINTS.filter(
      (spawn) => !isWithinTiles(spawn, eligibilityPlayerLocation, 4),
    );
    const forceDoubleSouth = colosseumSettings.getSnapshot().forceDoubleSouth;
    const forcedSpawns = forceDoubleSouth
      ? [SOUTH_SPAWN_1, SOUTH_SPAWN_2].slice(0, randomizedMobs.length)
      : [];
    const remainingSpawns = shuffle(eligibleSpawns.filter(
      (spawn) => !forcedSpawns.some((forced) => sameLocation(spawn, forced)),
    ));
    const allocatedSpawns = [...forcedSpawns, ...remainingSpawns];
    if (allocatedSpawns.length < randomizedMobs.length) {
      throw new Error("Not enough eligible Colosseum spawn points for this wave");
    }

    randomizedMobs.forEach((mob, index) => mob.setLocation(allocatedSpawns[index]));

    // NPC_INFO.id in osrs-colosseum defines server processing order. Location
    // allocation is random, but insertion into the Region must retain it.
    randomizedMobs.sort((first, second) => npcOrder(first) - npcOrder(second));
    randomizedMobs.forEach((mob) => {
      if (aggressive) mob.setAggro(player);
      this.addMob(mob);
    });
    this.pendingMobs = [];
    this.spawnEligibilityPlayerLocation = null;
    this.wavePhase = "active";
  }

  override async preload() {
    await Promise.all([
      super.preload(),
      ...this.pendingMobs.map((mob) => mob.preload()),
    ]);
  }

  private notifyWaveStateChanged() {
    this.waveStateListeners.forEach((listener) => listener());
  }
}
