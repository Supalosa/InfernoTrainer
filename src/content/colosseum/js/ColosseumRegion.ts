"use strict";

import { Region, Viewport, Settings, Player, Unit, CardinalDirection, ImageLoader, Trainer, CanvasSpriteModel, CollisionType, LineOfSightMask, Entity } from "osrs-sdk";
import type { Loadout } from "osrs-sdk";


import ColosseumMapImage from "../assets/images/map.png";

import { colosseumLoadout, configureColosseumPlayer } from "./ColosseumLoadout";
import { ColosseumScene } from "./ColosseumScene";
import { Attacks, SolHeredit as SolHeredit } from "./mobs/SolHeredit";

import { WallMan } from "./entities/WallMan";
import { colosseumSettings } from "./ColosseumSettings";
import { SolarFlareOrb } from "./entities/SolarFlareOrb";
import { SolarFlareTile } from "./entities/SolarFlareTile";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SOLAR_FLARE_PATHS = [
  { location: { x: 21, y: 20 }, startAtIndex: 2 },
  { location: { x: 28, y: 20 }, startAtIndex: 3 },
  { location: { x: 21, y: 27 }, startAtIndex: 1 },
  { location: { x: 28, y: 27 }, startAtIndex: 0 },
];

// Temporary scene-extraction aid. It is deliberately URL-gated so normal
// Colosseum sessions retain their collision blockers and UI.
const sceneDebug = new URLSearchParams(window.location.search).get("scene-debug") === "1";

/** A camera-facing, moving coordinate label used only by ?scene-debug=1. */
class SceneCoordinateLabel extends Entity {
  constructor(region: Region, private readonly player: Player, private readonly dx: number, private readonly dy: number) {
    super(region, { x: 0, y: 0 });
  }

  get collisionType() { return CollisionType.NONE; }
  get lineOfSight() { return LineOfSightMask.NONE; }
  get color() { return "#00000000"; }
  get drawOutline() { return false; }
  getPerceivedLocation() { return { x: this.player.location.x + this.dx, y: this.player.location.y + this.dy, z: 1 }; }
  getTrueLocation() { return this.getPerceivedLocation(); }
  draw(_tickPercent: number, context: OffscreenCanvasRenderingContext2D, _offset = { x: 0, y: 0 }, scale = 1) {
    const { x, y } = this.getPerceivedLocation();
    context.fillStyle = "#ffff00";
    context.font = `8px OSRS`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`${x},${y}`, scale / 2, scale / 2 + 6);
  }
  create3dModel() { return CanvasSpriteModel.forRenderable(this); }
}

export class ColosseumRegion extends Region {
  constructor(loadouts: Loadout[] = [colosseumLoadout]) {
    super(loadouts);
  }

  mapImage: HTMLImageElement = ImageLoader.createImage(ColosseumMapImage);

  get initialFacing() {
    return CardinalDirection.NORTH;
  }

  getName() {
    return "Fortis Colosseum";
  }

  get width(): number {
    return 51;
  }

  get height(): number {
    return 57;
  }

  rightClickActions(): any[] {
    return [];
  }

  drawWorldBackground(context: OffscreenCanvasRenderingContext2D, scale: number) {
    context.fillStyle = "black";
    context.fillRect(0, 0, 10000000, 10000000);
    if (this.mapImage) {
      const ctx = context as any;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.mozImageSmoothingEnabled = false;
      context.imageSmoothingEnabled = false;

      context.fillStyle = "white";

      context.drawImage(this.mapImage, 0, 0, this.width * scale, this.height * scale);

      ctx.webkitImageSmoothingEnabled = true;
      ctx.mozImageSmoothingEnabled = true;
      context.imageSmoothingEnabled = true;
    }
  }

  drawDefaultFloor() {
    // replaced by an Entity in 3d view
    return !Settings.use3dView;
  }

  initialiseRegion() {
    // create player
    const player = new Player(this, {
      x: 27,
      y: 29,
    });

    this.addPlayer(player);

    if (sceneDebug) {
      const coordinates = document.createElement("div");
      coordinates.style.cssText = "position:fixed;top:8px;left:8px;z-index:10000;padding:6px 8px;background:#000c;color:#0f0;font:14px monospace;pointer-events:none";
      document.body.appendChild(coordinates);
      const updateCoordinates = () => {
        coordinates.textContent = `scene debug — player: ${player.location.x}, ${player.location.y}`;
        requestAnimationFrame(updateCoordinates);
      };
      updateCoordinates();

      // 21 × 21 labels: every tile up to ten tiles from the player. The
      // labels follow the player rather than being fixed to the spawn point.
      for (let dx = -10; dx <= 10; dx++) for (let dy = -10; dy <= 10; dy++) {
        this.addEntity(new SceneCoordinateLabel(this, player, dx, dy));
      }
    }
    
    player.freeze(this.world.getReadyTimer);
    // TODO: reset the camera too

    // NE 34,18
    // NW 19,18
    // SE 34,33
    // SW 19,33
    const wallModelAt = (x: number, y: number) => {
      // Corner pillars overlap the perimeter at x 19..20 / 33..34 and
      // y 18..19 / 32..33. Keep every blocker in those footprints invisible:
      // the cache scene already supplies the pillar geometry, including the
      // outer corner tiles reached by both perimeter loops.
      const inCornerPillar = (x <= 20 || x >= 33) && (y <= 19 || y >= 32);
      return inCornerPillar ? null : (x + y) % 2 === 0 ? 50963 : 50964;
    };

    if (!sceneDebug) {
      for (let xx = 19; xx <= 34; ++xx) {
        const wallModel = wallModelAt(xx, 18);
        this.addEntity(new WallMan(this, { x: xx, y: 18 }, wallModel));
        this.addEntity(new WallMan(this, { x: xx, y: 33 }, wallModelAt(xx, 33)));
      }

      for (let yy = 18; yy <= 33; ++yy) {
        this.addEntity(new WallMan(this, { x: 19, y: yy }, wallModelAt(19, yy)));
        this.addEntity(new WallMan(this, { x: 34, y: yy }, wallModelAt(34, yy)));
      }
      // Additional blockers sit just inside the corner pillars and remain
      // invisible; only the open perimeter needs cache-rendered models.
      this.addEntity(new WallMan(this, { x: 33, y: 19 }, null));
      this.addEntity(new WallMan(this, { x: 20, y: 19 }, null));
      this.addEntity(new WallMan(this, { x: 33, y: 32 }, null));
      this.addEntity(new WallMan(this, { x: 20, y: 32 }, null));
    }

    const sol = new SolHeredit(this, { x: 25, y: 24 }, { aggro: player });
    this.addMob(sol);
    this.setBoss(sol);

    // Add 3d scene
    if (Settings.use3dView) {
      this.addEntity(new ColosseumScene(this, { x: 0, y: 0 }));
    }

    this.updateSolarFlares();
    this.updateSolarFlareTiles();
    return {
      player: player,
    };
  }

  override reset(startWorld = true) {
    const reset = super.reset(startWorld);
    configureColosseumPlayer(reset.player);
    return reset;
  }

  setSolarFlareLevel(level: number) {
    colosseumSettings.set({ solarFlareLevel: level });
    this.updateSolarFlares();
  }

  setShowSolarFlareTiles(show: boolean) {
    colosseumSettings.set({ showSolarFlareTiles: show });
    this.updateSolarFlareTiles();
  }

  private updateSolarFlares() {
    const { solarFlareLevel } = colosseumSettings.getSnapshot();
    if (solarFlareLevel === 0) {
      this.despawnSolarFlares();
      return;
    }
    if (this.entities.filter((entity) => entity instanceof SolarFlareOrb).length === 0) {
      SOLAR_FLARE_PATHS.forEach(({ location, startAtIndex }) => {
        this.addEntity(new SolarFlareOrb(this, { ...location }, solarFlareLevel, startAtIndex));
      });
    } else {
      this.entities
        .filter((entity) => entity instanceof SolarFlareOrb)
        .forEach((entity) => {
          (entity as SolarFlareOrb).setLevel(solarFlareLevel);
        });
    }
  }

  private despawnSolarFlares() {
    this.entities
      .filter((entity) => entity instanceof SolarFlareOrb)
      .forEach((entity) => {
        entity.dying = 0;
        this.removeEntity(entity);
      });
  }

  private updateSolarFlareTiles() {
    if (!colosseumSettings.getSnapshot().showSolarFlareTiles) {
      this.despawnSolarFlareTiles();
      return;
    }
    if (this.entities.some((entity) => entity instanceof SolarFlareTile)) {
      return;
    }
    SOLAR_FLARE_PATHS.forEach(({ location }) => {
      this.addEntity(new SolarFlareTile(this, { ...location }));
    });
  }

  private despawnSolarFlareTiles() {
    this.entities
      .filter((entity) => entity instanceof SolarFlareTile)
      .forEach((entity) => {
        entity.dying = 0;
        this.removeEntity(entity);
      });
  }

  private enableReplay = false;
  override onUnitDeath(unit: Unit) {
    if (unit instanceof Player) {
      this.mobs.forEach((mob) => {
        if (mob instanceof SolHeredit) {
          mob.tauntPlayerDeath();
        }
      });
    }
  }

  private replayTick = 1;
  override postTick() {
    if (!this.enableReplay || this.world.getReadyTimer > 0) {
      return;
    }
    // replay mode for debug only
    const player = this.players[0];
    const boss = this.mobs[0] as SolHeredit;
    switch (this.replayTick) {
      case 1:
        boss.stunned = 4;
        player.inventory.find((i) => i.itemName === "Shark")?.inventoryLeftClick(player);
        player.setAggro(boss);
        break;
      case 3:
        player.inventory.find((i) => i.itemName === "Scythe of Vitur")?.inventoryLeftClick(player);
        player.moveTo(24, 22);
        break;
      case 5:
        boss.forceAttack = Attacks.SPEAR;
        player.setAggro(boss);
        break;
      case 7:
        player.moveTo(23, 22);
        break;
      case 8:
        player.setAggro(boss);
        break;
      case 9:
        player.moveTo(24, 21);
        break;
      case 10:
        player.setAggro(boss);
        break;
      case 12:
        boss.currentStats.hitpoint = 1337;
        break;
      case 14:
        player.moveTo(23, 22);
        break;
      case 15:
        player.moveTo(23, 23);
        break;
      case 16:
        player.setAggro(boss);
        break;
      case 17:
        player.moveTo(24, 25);
        break;
      case 18:
        player.moveTo(24, 26);
        break;
      case 19:
        player.moveTo(24, 27);
        break;
      case 20:
        player.moveTo(24, 28);
        break;
      case 21:
        player.setAggro(boss);
        break;
      case 23:
        player.moveTo(25, 29);
        break;
      case 25:
        player.setAggro(boss);
        break;
      case 28:
        player.moveTo(26, 29);
        break;
      case 29:
        player.moveTo(26, 30);
        break;
      case 30:
        player.setAggro(boss);
        break;
      case 31:
        boss.forceAttack = Attacks.SHIELD;
        break;
    }
    ++this.replayTick;
  }

}
