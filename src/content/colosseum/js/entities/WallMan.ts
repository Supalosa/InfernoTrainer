"use strict"

import { CacheRenderModel, CacheRenderReferences, InvisibleMovementBlocker, TileMarkerModel } from "osrs-sdk";

export class WallMan extends InvisibleMovementBlocker {
    constructor(region, location, private readonly modelId: number | null = 50963) {
        super(region, location);
    }

    // The extracted wall-man payload maps semantic pose 0 to cache sequence
    // 7508 (the Dinhs Bulwark idle pose).
    override get animationIndex() {
        return this.modelId == null ? -1 : 0;
    }

    override getPerceivedRotation() {
        // Face directly into the arena. Coordinates use a north-positive Y
        // axis, while actor rotation uses the negated angle convention.
        if (this.location.y === 18) return -Math.PI / 2; // north wall -> south
        if (this.location.y === 33) return Math.PI / 2; // south wall -> north
        if (this.location.x === 19) return 0; // west wall -> east
        if (this.location.x === 34) return -Math.PI; // east wall -> west
        return 0;
    }

    override get color() {
        return "#00000000";
    }

    override get drawOutline() {
        return false;
    }

    override create3dModel() {
        if (this.modelId == null) return TileMarkerModel.forRenderable(this, null);
        return CacheRenderModel.forRenderable(this, CacheRenderReferences.model(this.modelId));
    }
}
