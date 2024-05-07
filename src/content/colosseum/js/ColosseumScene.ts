"use strict";
import { Entity } from "../../../sdk/Entity";

import { CollisionType } from "../../../sdk/Collision";
import { Model } from "../../../sdk/rendering/Model";
import { LineOfSightMask } from "../../../sdk/LineOfSight";
import { GLTFModel } from "../../../sdk/rendering/GLTFModel";
import { Assets } from "../../../sdk/utils/Assets";

const SceneModel = Assets.getAssetUrl("models/colosseum_partial.glb");
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
    // one day we'll figure out the offsets used in the exporter...
    return new GLTFModel(this, [SceneModel], 1, -11.2, {
      x: -6.5,
      y: 12.5,
    });
  }
}
