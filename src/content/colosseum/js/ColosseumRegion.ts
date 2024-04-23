"use strict";

// TODO
import InfernoMapImage from "../../../content/inferno/assets/images/map.png";
import { Player } from "../../../sdk/Player";

import { CardinalDirection, Region } from "../../../sdk/Region";
import { Settings } from "../../../sdk/Settings";
import { ImageLoader } from "../../../sdk/utils/ImageLoader";
import { Viewport } from "../../../sdk/Viewport";
import { ColosseumLoadout } from "./ColosseumLoadout";
import { ColosseumScene } from "./ColosseumScene";
import { Attacks, SolHeredit as SolHeredit } from "./mobs/SolHeredit";

import SidebarContent from "../sidebar.html";
import { WallMan } from "./entities/WallMan";
import { ColosseumSettings } from "./ColosseumSettings";

/* eslint-disable @typescript-eslint/no-explicit-any */

export class ColosseumRegion extends Region {
  static ARENA_WEST = 19 as const;
  static ARENA_EAST = 34 as const;
  static ARENA_NORTH = 18 as const;
  static ARENA_SOUTH = 33 as const;

  wave: number;
  mapImage: HTMLImageElement = ImageLoader.createImage(InfernoMapImage);

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
    if (this.wave !== 0) {
      return [];
    }

    return [
      {
        text: [
          { text: "Spawn ", fillStyle: "white" },
          { text: "Mager", fillStyle: "red" },
        ],
        action: () => {
          Viewport.viewport.clickController.yellowClick();
          const x = Viewport.viewport.contextMenu.destinationLocation.x;
          const y = Viewport.viewport.contextMenu.destinationLocation.y;
          const mob = new SolHeredit(this, { x, y }, { aggro: Viewport.viewport.player });
          mob.removableWithRightClick = true;
          this.addMob(mob);
        },
      },
    ];
  }

  initializeAndGetLoadoutType() {
    const loadoutSelector = document.getElementById("loadouts") as HTMLInputElement;
    loadoutSelector.value = Settings.loadout;
    loadoutSelector.addEventListener("change", () => {
      Settings.loadout = loadoutSelector.value;
      Settings.persistToStorage();
    });

    return loadoutSelector.value;
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

    const loadout = new ColosseumLoadout("max_melee");
    loadout.setStats(player);
    player.setUnitOptions(loadout.getLoadout());

    // NE 34,18
    // NW 19,18
    // SE 34,33
    // SW 19,33

    for (let xx = 19; xx <= 34; ++xx) {
      this.addEntity(new WallMan(this, { x: xx, y: 18 }));
      this.addEntity(new WallMan(this, { x: xx, y: 33 }));
    }

    for (let yy = 18; yy <= 33; ++yy) {
      this.addEntity(new WallMan(this, { x: 19, y: yy }));
      this.addEntity(new WallMan(this, { x: 34, y: yy }));
    }
    this.addEntity(new WallMan(this, { x: 33, y: 19 }));
    this.addEntity(new WallMan(this, { x: 20, y: 19 }));
    this.addEntity(new WallMan(this, { x: 33, y: 32 }));
    this.addEntity(new WallMan(this, { x: 20, y: 32 }));

    this.addMob(new SolHeredit(this, { x: 25, y: 24 }, { aggro: player }));

    // Add 3d scene
    if (Settings.use3dView) {
      this.addEntity(new ColosseumScene(this, { x: 0, y: 48 }));
    }

    // setup UI and settings
    ColosseumSettings.readFromStorage();
    
    const setupAttackConfig = (elementId: string, field: keyof typeof ColosseumSettings) => {
      const checkbox = document.getElementById(elementId) as HTMLInputElement;
      checkbox.checked = ColosseumSettings[field] as boolean;
      checkbox.addEventListener("change", () => {
        (ColosseumSettings[field] as boolean) = checkbox.checked;
        ColosseumSettings.persistToStorage();
      });
    };
    setupAttackConfig("use_shield", "useShields");
    setupAttackConfig("use_spears", "useSpears");
    setupAttackConfig("use_triple_short", "useTripleShort");
    setupAttackConfig("use_triple_long", "useTripleLong");
    setupAttackConfig("use_grapple", "useGrapple");

    return {
      player: player,
    };
  }

  private enableReplay = false;
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
        //boss.stunned = 6; // TODO phase
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

  getSidebarContent() {
    return SidebarContent;
  }
}