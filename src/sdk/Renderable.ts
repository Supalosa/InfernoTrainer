import { create } from "lodash";
import { Location, Location3 } from "./Location";

import { Model } from "./rendering/Model";

export abstract class Renderable {
  private _selected = false;
  private cachedModel: Model | null = null;

  abstract getPerceivedLocation(tickPercent: number): Location3;

  /**
   * return the angle of this renderable in radians.
   * West is zero degrees, and increasing values represent clockwise rotation.
   */
  abstract getPerceivedRotation(tickPercent: number): number;

  abstract get size(): number;

  get drawOutline(): boolean {
    return true;
  }

  get height(): number {
    return this.size;
  }

  abstract get color(): string;

  get colorHex() {
    return parseInt(this.color.replace("#", ""), 16);
  }

  get selectable(): boolean {
    return true;
  }

  get visible(): boolean {
    return true;
  }

  /**
   * Should remove from the scene
   */
  abstract shouldDestroy(): boolean;

  get selected(): boolean {
    return this._selected;
  }

  set selected(selected: boolean) {
    this._selected = selected;
  }

  drawUILayer(
    tickPercent: number,
    screenPosition: Location,
    context: OffscreenCanvasRenderingContext2D,
    scale: number,
    hitsplatAbove = true
  ) {
    // Override me
  }

  // draw in 2d mode
  draw(
    tickPercent: number,
    context: OffscreenCanvasRenderingContext2D,
    offset: Location = { x: 0, y: 0 },
    scale = 20,
    drawUnderTile = true
  ) {
    // Override me
  }

  /**
   * Return a new model for this renderable in 3d mode. it will be associated with the Renderable and destroyed when the renderable is
   * destroyed.
   */
  protected create3dModel(): Model | null {
    return null;
  }

  public get3dModel(): Model | null {
    return this.cachedModel ?? this.create3dModel();
  }

  getNewAnimation(): {
    index: number;
    priority: number;
    nonce?: number;
    nonceFallback?: number | null;
    speedScale?: number; // default 1
  } {
    // return the id of the animation that should start playing. If priority is higher than the current animation, will abort and start this one
    // if nonce is provided, will not play again with the same nonce value, and play nonceFallback instead - good for preventing loops
    // if nonceFallback is null, pause the last frame of the animation
    return { index: 0, priority: 0 };
  }

  async preload() {
    // Create an offscreen version of the model so that loading it is faster next time.
    this.cachedModel = this.create3dModel();
    if (this.cachedModel) {
      await this.cachedModel.preload();
    }
  }
}
