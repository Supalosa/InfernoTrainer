import { CanvasSpriteModel, Entity, Settings } from "osrs-sdk";

const RENDER_LINE_OF_SIGHT_BLOCKERS = false;

/**
 * Invisible entity used to model a Colosseum pillar's movement and line-of-sight
 * footprint. The black border keeps its occupied tiles visible in the 2d view.
 */
abstract class LineOfSightPillar extends Entity {
  override entityName() {
    return "Line-of-sight pillar";
  }

  override get color() {
    return "#00000000";
  }

  override draw(
    _tickPercent: number,
    context: OffscreenCanvasRenderingContext2D,
  ) {
    if (!RENDER_LINE_OF_SIGHT_BLOCKERS) return;

    context.strokeStyle = "#000000";
    context.lineWidth = 1;
    context.strokeRect(
      this.location.x * Settings.tileSize,
      (this.location.y - this.size + 1) * Settings.tileSize,
      this.size * Settings.tileSize,
      this.size * Settings.tileSize,
    );
  }

  override create3dModel() {
    return RENDER_LINE_OF_SIGHT_BLOCKERS
      ? CanvasSpriteModel.forRenderable(this)
      : null;
  }
}

/** A one-tile line-of-sight pillar. Defined for wave layouts; not placed by default. */
export class LineOfSightPillar1x1 extends LineOfSightPillar {}

/** A 3x3 line-of-sight pillar. */
export class LineOfSightPillar3x3 extends LineOfSightPillar {
  override get size() {
    return 3;
  }
}
