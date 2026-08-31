"use strict";

import { Assets, Entity, CacheRenderSceneModel, CollisionType, GLTFModel, Model, LineOfSightMask } from "osrs-sdk";

const SceneModel = Assets.getAssetUrl("models/colosseum_partial.glb");
export const useStaticScene = new URLSearchParams(window.location.search).get("static-scene") === "1";
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
    if (!useStaticScene) return new CacheRenderSceneModel("region:7216", { elevation: -7.5 });
    // one day we'll figure out the offsets used in the exporter...
    return new GLTFModel(this, [SceneModel], { scale: 1, verticalOffset: -11.2, 
      originOffset: {
      x: -6.5,
      y: 12.5,
    }});
  }
}
