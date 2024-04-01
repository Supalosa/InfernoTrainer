"use strict";
import { Settings } from "./Settings";
import { ClickController } from "./ClickController";
import { Chrome } from "./Chrome";
import { Player } from "./Player";
import { ContextMenu } from "./ContextMenu";
import { World } from "./World";
import { ControlPanelController } from "./ControlPanelController";
import { MapController } from "./MapController";
import { XpDropController } from "./XpDropController";
import { ImageLoader } from "./utils/ImageLoader";
import ButtonActiveIcon from "../assets/images/interface/button_active.png";
import { Region } from "./Region";
import { Viewport3d } from "./Viewport3d";
import { Location } from "./Location";
import { Mob } from "./Mob";
import { Item } from "./Item";
import { Viewport2d } from "./Viewport2d";

type ViewportEntitiesClick = {
  type: "entities";
  mobs: Mob[];
  players: Player[];
  groundItems: Item[];
};

type ViewportCoordinateClick = {
  type: "coordinate";
  location: Location;
};

type ViewportClickResult =
  | ViewportEntitiesClick
  | ViewportCoordinateClick
  | null;

type ViewportDrawResult = {
  // game canvas
  canvas: OffscreenCanvas;
  // drawn on top of the game canvas. optional, not used for 2d view
  uiCanvas: OffscreenCanvas | null;
  flip: boolean;
  offsetX: number;
  offsetY: number;
};

export interface ViewportDelegate {
  draw(world: World, region: Region): ViewportDrawResult;

  // translate the click (relative to the viewport) to a location in the world or something that got clicked
  translateClick(
    offsetX: number,
    offsetY: number,
    world: World,
    viewport: Viewport
  ): ViewportClickResult;
}

export class Viewport {
  static viewport = new Viewport(new Viewport3d());

  activeButtonImage: HTMLImageElement =
    ImageLoader.createImage(ButtonActiveIcon);
  contextMenu: ContextMenu = new ContextMenu();

  clickController: ClickController;
  canvas: HTMLCanvasElement;
  player: Player;
  width: number;
  height: number;

  constructor(private delegate: ViewportDelegate) {}

  translateClick(
    offsetX: number,
    offsetY: number,
    world: World
  ): ViewportClickResult {
    return this.delegate.translateClick(offsetX, offsetY, world, this);
  }

  get context() {
    return this.canvas.getContext("2d");
  }

  setPlayer(player: Player) {
    this.player = player;
    window.addEventListener("orientationchange", () =>
      this.calculateViewport()
    );
    window.addEventListener("resize", () => this.calculateViewport());
    window.addEventListener("wheel", () => this.calculateViewport());
    window.addEventListener("resize", () => this.calculateViewport());
    this.canvas = document.getElementById("world") as HTMLCanvasElement;
    this.calculateViewport();
    this.canvas.width = Settings._tileSize * 2 * this.width;
    this.canvas.height = Settings._tileSize * 2 * this.height;
    this.clickController = new ClickController(this);
    this.clickController.registerClickActions();
  }

  calculateViewport() {
    const { width, height } = Chrome.size();
    Settings._tileSize = width / this.player.region.width;
    this.width = width / Settings.tileSize;
    this.height = height / Settings.tileSize;
  }

  getViewport(tickPercent: number) {
    if (this.player.dying > -1) {
      tickPercent = 0;
    }
    const { x, y } = this.player.getPerceivedLocation(tickPercent);
    const viewportX = x + 0.5 - this.width / 2;
    const viewportY = y + 0.5 - this.height / 2;
    return { viewportX, viewportY };
  }

  drawText(text: string, x: number, y: number) {
    x = Math.floor(x);
    y = Math.floor(y);
    this.context.fillStyle = "#000";
    this.context.fillText(text, x - 2, y - 2);
    this.context.fillText(text, x + 2, y - 2);
    this.context.fillText(text, x, y);
    this.context.fillText(text, x, y - 4);
    this.context.fillStyle = "#FFFFFF";
    this.context.fillText(text, x, y - 2);
  }

  tick() {
    if (MapController.controller && this.player) {
      MapController.controller.updateOrbsMask(
        this.player.currentStats,
        this.player.stats
      );
    }
  }

  draw(world: World) {
    this.context.globalAlpha = 1;
    this.context.fillStyle = "#3B3224";
    this.context.restore();
    this.context.save();
    this.context.fillStyle = "black";
    const { width, height } = Chrome.size();
    this.context.fillRect(0, 0, width, height);
    const { canvas, uiCanvas, flip, offsetX, offsetY } = this.delegate.draw(
      world,
      this.player.region
    );
    if (flip) {
      this.context.rotate(Math.PI);
      this.context.translate(-width, -height);
    }
    this.context.drawImage(canvas, offsetX, offsetY);
    if (uiCanvas) {
      this.context.drawImage(uiCanvas, offsetX, offsetY);
    }
    this.context.restore();
    this.context.save();

    if (Settings.mobileCheck()) {
      this.context.fillStyle = "#FFFF00";
      this.context.font = 16 + "px OSRS";
      this.context.textAlign = "center";

      this.context.drawImage(
        this.activeButtonImage,
        20,
        20,
        this.activeButtonImage.width,
        this.activeButtonImage.height
      );
      this.context.fillText("RESET", 40, 45);
    }

    // draw control panel
    ControlPanelController.controller.draw();
    XpDropController.controller.draw(
      this.context,
      width -
        140 -
        MapController.controller.width -
        (Settings.menuVisible ? 232 : 0),
      0,
      world.tickPercent
    );
    MapController.controller.draw(this.context);
    this.contextMenu.draw();

    if (this.clickController.clickAnimation) {
      this.clickController.clickAnimation.draw();
    }

    this.context.restore();
    this.context.save();

    this.context.textAlign = "left";
    if (world.getReadyTimer > 0) {
      this.context.font = "72px OSRS";
      this.context.textAlign = "center";
      this.drawText(
        `GET READY...${world.getReadyTimer}`,
        width / 2,
        height / 2 - 50
      );
    }
  }
}
