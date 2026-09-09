"use strict";

import { Entity, CacheRenderSceneModel, CollisionType, Model, LineOfSightMask } from "osrs-sdk";

// Temporary integration shim. Keep the cache asset region-local and tune this
// at the trainer boundary until trainer coordinates adopt the cache origin.
const CacheSceneOffset = { x: -6, y: -3, elevation: -7.5 };

export class ColosseumScene extends Entity {
  get collisionType() {
    return CollisionType.NONE;
  }

  get size() {
    return 1;
  }

  get drawOutline() {
    return false;
  }

  draw() {
    // force empty draw
  }

  get color() {
    return "#222222";
  }

  get lineOfSight() {
    return LineOfSightMask.NONE;
  }

  getPerceivedRotation() {
    return -Math.PI / 2;
  }

  create3dModel(): Model {
    // Region 7216's playable floor is height 1360, while its cache origin is
    // 400. Cache model units are 1/128 world units, so the compiler's
    // origin-normalized terrain sits (1360 - 400) / 128 = 7.5 units above
    // trainer plane zero.
    return new CacheRenderSceneModel("region:7216", {
      elevation: CacheSceneOffset.elevation,
      originOffset: CacheSceneOffset,
    });
  }
}
