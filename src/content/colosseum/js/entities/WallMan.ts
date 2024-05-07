"use strict"

import { TileMarkerModel } from "../../../../sdk/rendering/TileMarkerModel";
import { InvisibleMovementBlocker } from "../../../MovementBlocker";

export class WallMan extends InvisibleMovementBlocker {

    override get color() {
        return "#000000";
    }

    override create3dModel() {
        return TileMarkerModel.forRenderable(this, false);
    }
}