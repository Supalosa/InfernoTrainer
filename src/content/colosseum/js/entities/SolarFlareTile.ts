"use strict";

import { CollisionType, Entity, LineOfSightMask } from "osrs-sdk";

import { SolarFlareTileModel } from "../rendering/SolarFlareModel";

export class SolarFlareTile extends Entity {
  create3dModel() {
    return new SolarFlareTileModel(this.location);
  }

  get collisionType() {
    return CollisionType.NONE;
  }

  get lineOfSight() {
    return LineOfSightMask.NONE;
  }

  get drawOutline() {
    return false;
  }

  draw() {
    // force empty draw
  }

  get color() {
    return "#000000";
  }
}
