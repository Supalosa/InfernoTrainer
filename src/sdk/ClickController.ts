import { filter } from "lodash";
import { TileMarker } from "../content/TileMarker";
import { ClickAnimation } from "./ClickAnimation";
import { MenuOption } from "./ContextMenu";
import { Entity } from "./Entity";
import { EntityNames } from "./EntityName";
import { Item } from "./Item";
import { Pathing } from "./Pathing";
import { Settings } from "./Settings";
import type { Unit } from "./Unit";
import { Viewport } from "./Viewport";
import { MapController } from "./MapController";
import { ControlPanelController } from "./ControlPanelController";
import { Player } from "./Player";
import { Mob } from "./Mob";
import { World } from "./World";
import { Region } from "./Region";
import { InputController } from "./Input";
import { Trainer } from "./Trainer";

export class ClickController {
  clickAnimation?: ClickAnimation = null;
  viewport: Viewport;

  constructor(viewport: Viewport) {
    this.viewport = viewport;
  }

  eventListeners: ((e: MouseEvent) => void)[] = [];

  unload() {
    this.viewport.canvas.removeEventListener("mousedown", this.eventListeners[0]);
    this.viewport.canvas.removeEventListener("mouseup", this.eventListeners[1]);
    this.viewport.canvas.removeEventListener("mousemove", this.eventListeners[2]);
    this.viewport.canvas.removeEventListener("mousemove", this.eventListeners[3]);
    this.viewport.canvas.removeEventListener("mousemove", this.eventListeners[4]);
    this.viewport.canvas.removeEventListener("mousemove", this.eventListeners[5]);
    this.viewport.canvas.removeEventListener("wheel", this.eventListeners[6]);
  }

  registerClickActions() {
    this.viewport.canvas.addEventListener("mousedown", (this.eventListeners[0] = this.clickDown.bind(this)));
    this.viewport.canvas.addEventListener("mouseup", (this.eventListeners[1] = this.leftClickUp.bind(this)));
    this.viewport.canvas.addEventListener(
      "mousemove",
      (this.eventListeners[2] = (e: MouseEvent) => ControlPanelController.controller.cursorMovedTo(e)),
    );
    this.viewport.canvas.addEventListener(
      "mousemove",
      (this.eventListeners[3] = (e: MouseEvent) => MapController.controller.cursorMovedTo(e)),
    );
    this.viewport.canvas.addEventListener(
      "mousemove",
      (this.eventListeners[4] = (e) => Viewport.viewport.contextMenu.cursorMovedTo(e.clientX, e.clientY)),
    );
    this.viewport.canvas.addEventListener("mousemove", (this.eventListeners[5] = this.mouseMoved.bind(this)));
    this.viewport.canvas.addEventListener("wheel", (this.eventListeners[6] = this.wheel.bind(this)));
  }

  wheel(e: WheelEvent) {
    Settings.zoomScale -= e.deltaY / 500;

    if (Settings.zoomScale < 0.5) {
      Settings.zoomScale = 0.5;
    }

    if (Settings.zoomScale > 2) {
      Settings.zoomScale = 2;
    }

    Settings.persistToStorage();
  }

  leftClickUp(e: MouseEvent) {
    if (e.button !== 0) {
      return;
    }

    const intercepted = ControlPanelController.controller.controlPanelClickUp(e);
    if (intercepted) {
      return;
    }
  }

  private recentlySelectedMobs: Mob[] = [];

  hasSelectedMob() {
    return this.recentlySelectedMobs.length > 0;
  }

  mouseMoved(e: MouseEvent) {

    const scale = Settings.maxUiScale;
    if (this.viewport.components.some((component) => component.onMouseMove(e.offsetX / scale, e.offsetY / scale))) {
      return;
    }
    const world = Trainer.player.region.world;
    const hoveredOn = Viewport.viewport.translateClick(e.offsetX, e.offsetY, world);
    this.recentlySelectedMobs.forEach((mob) => {
      mob.selected = false;
    });
    this.recentlySelectedMobs = [];
    if (hoveredOn && hoveredOn.type === "entities") {
      const firstMob = hoveredOn.mobs.find(() => true);
      if (firstMob) {
        firstMob.selected = true;
        this.recentlySelectedMobs.push(firstMob);
      }
    }
  }

  private getClickedOn(e: MouseEvent, world: World, region: Region) {
    const xAlign =
      Viewport.viewport.contextMenu.location.x - Viewport.viewport.contextMenu.width / 2 < e.offsetX &&
      e.offsetX < Viewport.viewport.contextMenu.location.x + Viewport.viewport.contextMenu.width / 2;
    const yAlign =
      Viewport.viewport.contextMenu.location.y < e.offsetY &&
      e.offsetY < Viewport.viewport.contextMenu.location.y + Viewport.viewport.contextMenu.height;

    if (Viewport.viewport.contextMenu.isActive && xAlign && yAlign) {
      Viewport.viewport.contextMenu.clicked(e.offsetX, e.offsetY);
      Viewport.viewport.contextMenu.setInactive();
      return;
    }

    const intercepted = MapController.controller.leftClickDown(e);
    if (intercepted) {
      return;
    }

    const controlPanelIntercepted = ControlPanelController.controller.controlPanelClickDown(e);
    if (controlPanelIntercepted) {
      return;
    }

    const scale = Settings.maxUiScale;
    if (this.viewport.components.some((component) => component.onPanelClick(e.offsetX / scale, e.offsetY / scale))) {
      return;
    }

    const clickedOn = Viewport.viewport.translateClick(e.offsetX, e.offsetY, world);
    if (!clickedOn) {
      return null;
    }
    const { x, y } = clickedOn.location;

    const mobs: Mob[] = [];
    const players: Player[] = [];
    const groundItems: Item[] = [];
    if (clickedOn.type === "entities") {
      mobs.push(...clickedOn.mobs);
      players.push(...clickedOn.players);
      groundItems.push(...clickedOn.groundItems);
    }
    return { mobs, players, groundItems, x, y };
  }

  clickDown(e: MouseEvent) {
    if (e.button === 2) {
      this.rightClickDown(e);
    }

    if (e.button !== 0) {
      return;
    }
    const region = Trainer.player.region;
    const world = Trainer.player.region.world;
    const player = Trainer.player;

    Viewport.viewport.contextMenu.cursorMovedTo(e.clientX, e.clientY);
    const clickedOn = this.getClickedOn(e, world, region);

    if (!clickedOn) {
      return;
    }

    const { mobs, players, groundItems, x, y } = clickedOn;

    Trainer.player.interruptCombat();

    const inputController = InputController.controller;
    if (!e.shiftKey && mobs.length && mobs[0].canBeAttacked()) {
      this.redClick();
      inputController.queueAction(() => this.playerAttackClick(mobs[0]));
    } else if (!e.shiftKey && players.length) {
      this.redClick();
      inputController.queueAction(() => this.playerAttackClick(players[0]));
    } else if (!e.shiftKey && groundItems.length) {
      this.redClick();

      inputController.queueAction(() => player.setSeekingItem(groundItems[0]));
    } else if (x !== null && y !== null) {
      this.yellowClick();
      inputController.queueAction(() => this.playerWalkClick(x, y));
    }
    Viewport.viewport.contextMenu.setInactive();
  }

  rightClickDown(e: MouseEvent) {
    const region = Trainer.player.region;
    const world = Trainer.player.region.world;

    Viewport.viewport.contextMenu.setPosition({ x: e.offsetX, y: e.offsetY });

    if (ControlPanelController.controller.controlPanelRightClick(e)) {
      return;
    }

    if (MapController.controller.rightClick(e)) {
      return;
    }

    const clickedOn = this.getClickedOn(e, world, region);

    if (!clickedOn) {
      return;
    }

    const { mobs, players, groundItems, x, y } = clickedOn;

    Viewport.viewport.contextMenu.destinationLocation = {
      x: Math.floor(x),
      y: Math.floor(y),
    };

    /* gather options */
    let menuOptions: MenuOption[] = [];

    mobs.forEach((mob) => {
      menuOptions = menuOptions.concat(mob.contextActions(region, x, y));
    });
    players.forEach((player) => {
      if (player !== Trainer.player) {
        menuOptions = menuOptions.concat(player.contextActions(region, x, y));
      }
    });
    groundItems.forEach((item: Item) => {
      menuOptions.push({
        text: [
          { text: "Take ", fillStyle: "white" },
          { text: item.itemName, fillStyle: "#FF911F" },
        ],
        action: () => InputController.controller.queueAction(() => Trainer.player.setSeekingItem(item)),
      });
    });

    menuOptions.push(
      {
        text: [{ text: `Walk Here`, fillStyle: "white" }],
        action: () => {
          this.yellowClick();
          const x = Viewport.viewport.contextMenu.destinationLocation.x;
          const y = Viewport.viewport.contextMenu.destinationLocation.y;
          InputController.controller.queueAction(() => this.playerWalkClick(x, y));
        },
      },
      {
        text: [{ text: "Mark / Unmark Tile", fillStyle: "white" }],
        action: () => {
          this.yellowClick();
          const x = Viewport.viewport.contextMenu.destinationLocation.x;
          const y = Viewport.viewport.contextMenu.destinationLocation.y;

          let removed = false;
          const entitiesAtPoint = Pathing.entitiesAtPoint(region, x, y, 1);
          entitiesAtPoint.forEach((entity: TileMarker) => {
            if (entity.entityName() === EntityNames.TILE_MARKER && entity.saveable) {
              region.removeEntity(entity);
              removed = true;
            }
          });

          if (!removed) {
            region.addEntity(new TileMarker(Trainer.player.region, { x, y }, "#FF0000"));
          }

          Settings.tile_markers = filter(
            filter(region.entities, (entity: Entity) => entity.entityName() === EntityNames.TILE_MARKER),
            (tileMarker: TileMarker) => tileMarker.saveable,
          ).map((entity: Entity) => entity.location);

          Settings.persistToStorage();
        },
      },
    );

    menuOptions = menuOptions.concat(region.rightClickActions());

    Viewport.viewport.contextMenu.setMenuOptions(menuOptions);
    Viewport.viewport.contextMenu.setActive();
  }

  playerAttackClick(mob: Unit) {
    Trainer.player.setAggro(mob);
  }

  playerWalkClick(x: number, y: number) {
    Trainer.player.moveTo(Math.floor(x), Math.floor(y));
  }

  redClick() {
    this.clickAnimation = new ClickAnimation(
      "red",
      Viewport.viewport.contextMenu.cursorPosition.x,
      Viewport.viewport.contextMenu.cursorPosition.y,
    );
  }
  yellowClick() {
    this.clickAnimation = new ClickAnimation(
      "yellow",
      Viewport.viewport.contextMenu.cursorPosition.x,
      Viewport.viewport.contextMenu.cursorPosition.y,
    );
  }
}
