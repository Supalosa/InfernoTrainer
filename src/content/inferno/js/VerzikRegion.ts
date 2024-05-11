"use strict";
import { Region, CardinalDirection, Player, BrowserUtils, ImageLoader } from "@supalosa/oldschool-trainer-sdk";

import InfernoMapImage from "../assets/images/map.png";

import { VerzikVitur } from "./mobs/VerzikVitur";

import SidebarContent from "../sidebar.html";
import { VerzikLoadout } from "./VerzikLoadout";

/* eslint-disable @typescript-eslint/no-explicit-any */

export class VerzikRegion extends Region {
  mapImage: HTMLImageElement = ImageLoader.createImage(InfernoMapImage);

  preEnrage = true;

  get initialFacing() {
    return CardinalDirection.NORTH;
  }

  getName() {
    return "VerzikP3";
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

  initialiseRegion() {
    // create player
    const player = new Player(this, {
      x: parseInt(BrowserUtils.getQueryVar("x")) || 25,
      y: parseInt(BrowserUtils.getQueryVar("y")) || 30,
    });

    this.addPlayer(player);

    this.addMob(new VerzikVitur(this, { x: 25, y: 25 }, { aggro: player }));

    const loadout = new VerzikLoadout();
    loadout.setStats(player); // flip this around one day
    player.setUnitOptions(loadout.getLoadout());

    document
      .getElementById("pauseResumeLink")
      .addEventListener("click", () => (this.world.isPaused ? this.world.startTicking() : this.world.stopTicking()));

    document.getElementById("preEnrage").addEventListener("click", () => this.updatePreEnrage(true));
    document.getElementById("postEnrage").addEventListener("click", () => this.updatePreEnrage(false));
    this.updatePreEnrage(true);

    // Add 3d scene
    /*if (Settings.use3dView) {
      this.addEntity(new InfernoScene(this, { x: 0, y: 48 }));
    }*/

    return { player };
  }

  updatePreEnrage(preEnrage: boolean) {
    this.preEnrage = preEnrage;
    if (preEnrage) {
      document
        .getElementById("preEnrage")
        .classList.add("selected");
      document
        .getElementById("postEnrage")
        .classList.remove("selected");
    } else {
      document
        .getElementById("preEnrage")
        .classList.remove("selected");
      document
        .getElementById("postEnrage")
        .classList.add("selected");
    }
    this.world.regions.forEach((region) => {
      region.mobs.filter((mob): mob is VerzikVitur => mob.mobName() === "Verzik Vitur").forEach((mob) => {
        mob.setAttackSpeed(preEnrage ? 7 : 5);
      });
    });
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
    return true; // !Settings.use3dView;
  }

  getSidebarContent() {
    return SidebarContent;
  }
}
