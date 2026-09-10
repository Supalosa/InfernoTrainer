import { Manticore, Player, Settings, TileMarker } from "osrs-sdk";
import type { Loadout } from "osrs-sdk";

import { colosseumLoadout } from "./ColosseumLoadout";
import { ColosseumRegion } from "./ColosseumRegion";
import { ColosseumScene } from "./ColosseumScene";
import { colosseumSettings } from "./ColosseumSettings";
import {
  JavelinColossus,
  LineOfSightPillar1x1,
  LineOfSightPillar3x3,
  Minotaur,
  SerpentShaman,
  ShockwaveColossus,
} from "./mobs";

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

/** Visual sandbox for the NPCs used by ordinary Colosseum waves. */
export class WavesRegion extends ColosseumRegion {
  constructor(loadouts: Loadout[] = [colosseumLoadout]) {
    super(loadouts);
  }

  override getName() {
    return "Fortis Colosseum Waves";
  }

  override initialiseRegion() {
    const player = new Player(this, { x: 17, y: 24 });
    this.addPlayer(player);
    player.freeze(this.world.getReadyTimer);

    const mobOptions = {
      cooldown: 3 + 1, // 3 intended, and 1 because it gets decremented immediately on unhiding
      ...(colosseumSettings.getSnapshot().npcsAggressive ? { aggro: player } : {}),
    };
    this.addMob(new Manticore(this, { x: 21, y: 24 }, mobOptions));
    this.addMob(new Manticore(this, { x: 29, y: 19 }, mobOptions));
    this.addMob(new Minotaur(this, { x: 29, y: 24 }, mobOptions));
    this.addMob(new SerpentShaman(this, { x: 23, y: 30 }, mobOptions));
    this.addMob(new JavelinColossus(this, { x: 20, y: 30 }, mobOptions));
    this.addMob(new ShockwaveColossus(this, { x: 29, y: 32 }, mobOptions));

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
    const reset = super.reset(false);
    // Mob.visible() and World.tickRegion() both observe this countdown, so the
    // wave NPCs remain hidden and inactive for exactly five game ticks.
    this.world.getReadyTimer = 5;
    reset.player.frozen = 5;
    if (startWorld) this.world.startTicking();
    return reset;
  }
}
