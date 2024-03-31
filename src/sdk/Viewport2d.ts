"use strict";
import { Player } from "./Player";
import { World } from "./World";
import { Viewport, ViewportDelegate } from "./Viewport";
import { Region } from "./Region";
import { Chrome } from "./Chrome";
import { Settings } from "./Settings";

export class Viewport2d implements ViewportDelegate {
  draw(world: World, region: Region) {
    region.context.save();
    region.drawWorldBackground();
    region.drawGroundItems(region.context);

    // Draw all things on the map
    region.entities.forEach((entity) => entity.draw(world.tickPercent));

    if (world.getReadyTimer <= 0) {
      region.mobs.forEach((mob) => mob.draw(world.tickPercent));
      region.newMobs.forEach((mob) => mob.draw(world.tickPercent));
    }

    region.players.forEach((player: Player) => {
      player.draw(world.tickPercent);
    });

    region.entities.forEach((entity) => entity.drawUILayer(world.tickPercent));

    if (world.getReadyTimer === 0) {
      region.mobs.forEach((mob) => mob.drawUILayer(world.tickPercent));

      region.players.forEach((player: Player) => {
        player.drawUILayer(world.tickPercent);
      });
    }

    region.context.restore();

    const { viewportX, viewportY } = Viewport.viewport.getViewport(
      world.tickPercent
    );
    return {
      canvas: region.canvas,
      flip: Settings.rotated === "south",
      offsetX: -viewportX * Settings.tileSize,
      offsetY: -viewportY * Settings.tileSize,
    };
  }
}
