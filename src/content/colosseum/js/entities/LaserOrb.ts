import { COLOSSEUM_ASSETS } from "../../../../assets";
"use strict";

import {
  Entity,
  Region,
  CollisionType,
  LineOfSightMask,
  Viewport,
  Random,
  Projectile,
  Pathing,
  Location,
  Trainer,
  GraphicsObject,
  DelayedAction,
} from "osrs-sdk";

import _ from "lodash";

import { LaserOrbModel } from "../rendering/LaserOrbModel";
import { ColosseumConstants } from "../Constants";

export enum Edge {
  NORTH,
  EAST,
  SOUTH,
  WEST,
}

export const ORB_SHOOT_DIRECTIONS = {
  [Edge.NORTH]: { x: 0, y: 1 },
  [Edge.SOUTH]: { x: 0, y: -1 },
  [Edge.EAST]: { x: -1, y: 0 },
  [Edge.WEST]: { x: 1, y: 0 },
};

const EDGE_BOUNDARIES: { [edge in Edge]: [Location, Location] } = {
  [Edge.NORTH]: [
    { x: ColosseumConstants.ARENA_WEST + 2, y: ColosseumConstants.ARENA_NORTH + 1 },
    { x: ColosseumConstants.ARENA_EAST - 2, y: ColosseumConstants.ARENA_NORTH + 1 },
  ],
  [Edge.SOUTH]: [
    { x: ColosseumConstants.ARENA_WEST + 2, y: ColosseumConstants.ARENA_SOUTH - 1 },
    { x: ColosseumConstants.ARENA_EAST - 2, y: ColosseumConstants.ARENA_SOUTH - 1 },
  ],
  [Edge.EAST]: [
    { x: ColosseumConstants.ARENA_EAST - 1, y: ColosseumConstants.ARENA_NORTH + 2 },
    { x: ColosseumConstants.ARENA_EAST - 1, y: ColosseumConstants.ARENA_SOUTH - 2 },
  ],
  [Edge.WEST]: [
    { x: ColosseumConstants.ARENA_WEST + 1, y: ColosseumConstants.ARENA_NORTH + 2 },
    { x: ColosseumConstants.ARENA_WEST + 1, y: ColosseumConstants.ARENA_SOUTH - 2 },
  ],
};

const pickLocation = (edge: Edge): Location => {
  const boundaries = EDGE_BOUNDARIES[edge];
  const x = boundaries[0].x + Math.floor(Math.random() * (boundaries[1].x - boundaries[0].x));
  const y = boundaries[0].y + Math.floor(Math.random() * (boundaries[1].y - boundaries[0].y));
  return { x, y };
};

// Keep the first pass deliberately simple: each placed cache graphic starts
// two client cycles (about 40ms) after the prior tile, producing a slow sweep
// from the firing orb across the arena.
const VERTICAL_LASER_TILE_DELAY = 2;
// The orb's game-tick firing window starts the cache charge graphic first;
// begin the attack graphic roughly three game ticks later (90 client cycles),
// matching the old custom beam's first visible firing frame.
const VERTICAL_LASER_CHARGE_TO_FIRE_DELAY = 90;
const LASER_LENGTH = {
  vertical: ColosseumConstants.ARENA_SOUTH - ColosseumConstants.ARENA_NORTH - 1,
  horizontal: ColosseumConstants.ARENA_EAST - ColosseumConstants.ARENA_WEST - 1,
};

const LASER_SPOT_ANIMS: { [edge in Edge]: { charge: number; fire: number } } = {
  [Edge.SOUTH]: {
    charge: COLOSSEUM_ASSETS.spotAnims.laserSouthCharge.id,
    fire: COLOSSEUM_ASSETS.spotAnims.laserSouthFire.id,
  },
  [Edge.WEST]: {
    charge: COLOSSEUM_ASSETS.spotAnims.laserWestCharge.id,
    fire: COLOSSEUM_ASSETS.spotAnims.laserWestFire.id,
  },
  [Edge.NORTH]: {
    charge: COLOSSEUM_ASSETS.spotAnims.laserNorthCharge.id,
    fire: COLOSSEUM_ASSETS.spotAnims.laserNorthFire.id,
  },
  [Edge.EAST]: {
    charge: COLOSSEUM_ASSETS.spotAnims.laserEastCharge.id,
    fire: COLOSSEUM_ASSETS.spotAnims.laserEastFire.id,
  },
};

export class LaserOrb extends Entity {
  age = 0;
  moveTick = 4;
  direction = { x: 0, y: 0 };
  lastLocation: Location;
  firingFreeze = 0;
  private boundaries: [Location, Location];

  static onEdge(region: Region, edge: Edge) {
    const boundaries = pickLocation(edge);
    return new LaserOrb(region, boundaries, edge);
  }

  constructor(
    region: Region,
    location: Location,
    public edge: Edge,
  ) {
    super(region, location);
    const pick = Math.floor(Math.random() * 2);
    this.boundaries = EDGE_BOUNDARIES[edge];
    let moveTowards = this.boundaries[pick];
    if (moveTowards.x === this.location.x && moveTowards.y === this.location.y) {
      moveTowards = this.boundaries[(pick + 1) % 2];
    }
    this.direction = {
      x: Math.sign(moveTowards.x - this.location.x),
      y: Math.sign(moveTowards.y - this.location.y),
    };
    this.lastLocation = {
      x: this.location.x,
      y: this.location.y,
    };
  }

  create3dModel() {
    return LaserOrbModel.forLaserOrb(this);
  }

  opacity(tickPercent) {
    return 0.5;
  }

  get showBeam() {
    return this.firingFreeze >= 2 && this.firingFreeze <= 6;
  }

  beamPercent(tickPercent) {
    return _.clamp(6 - this.firingFreeze + tickPercent, 0, 1);
  }

  projectilePercent(tickPercent) {
    return _.clamp(2 - this.firingFreeze + tickPercent, 0, 1);
  }

  public fire() {
    this.firingFreeze = 9;
    const { charge, fire } = LASER_SPOT_ANIMS[this.edge];
    DelayedAction.registerDelayedAction(new DelayedAction(() => {
      this.spawnLaserLine(charge, 0);
    }, 3));
    DelayedAction.registerDelayedAction(new DelayedAction(() => {
        this.spawnLaserLine(fire, VERTICAL_LASER_CHARGE_TO_FIRE_DELAY);
    }, 4));
  }

  private spawnLaserLine(spotAnimId: number, delayOffset: number) {
    const direction = ORB_SHOOT_DIRECTIONS[this.edge];
    const length = this.edge === Edge.NORTH || this.edge === Edge.SOUTH
      ? LASER_LENGTH.vertical
      : LASER_LENGTH.horizontal;
    for (let index = 0; index < length; index++) {
      this.region.addEntity(new GraphicsObject(
        this.region,
        {
          x: this.location.x + direction.x * index,
          y: this.location.y + direction.y * index,
        },
        spotAnimId,
        {
          delay: delayOffset + index * VERTICAL_LASER_TILE_DELAY,
          height: 0.5,
        },
      ));
    }
  }

  get isFiring() {
    return this.firingFreeze > 0;
  }

  get color() {
    return "#FFFF66";
  }

  get collisionType() {
    return CollisionType.NONE;
  }

  get lineOfSight() {
    return LineOfSightMask.NONE;
  }

  get drawOutline() {
    return true;
  }

  get size() {
    return 1;
  }

  tick() {
    const player = Trainer.player;
    if (this.firingFreeze <= 0 && this.moveTick <= 0) {
      this.lastLocation = {
        x: this.location.x,
        y: this.location.y,
      };
      this.location.x += this.direction.x;
      this.location.y += this.direction.y;
      // reverse direction
      if (
        (this.location.x === this.boundaries[0].x && this.location.y === this.boundaries[0].y) ||
        (this.location.x === this.boundaries[1].x && this.location.y === this.boundaries[1].y)
      ) {
        this.direction = { x: -this.direction.x, y: -this.direction.y };
      }
      this.moveTick = 2;
    }
    if (this.firingFreeze === 3) {
      if (this.isInLineWithPlayer()) {
        const damage = 60 + Math.floor(Random.get() * 20);
        player.addProjectile(new Projectile(null, damage, player, player, "typeless", { setDelay: 0 }));
      }
    }

    --this.moveTick;
    --this.firingFreeze;
  }

  isInLineWithPlayer() {
    const player = Trainer.player;
    if ((this.edge === Edge.NORTH || this.edge === Edge.SOUTH) && player.location.x === this.location.x) {
      return true;
    }
    if ((this.edge === Edge.EAST || this.edge === Edge.WEST) && player.location.y === this.location.y) {
      return true;
    }
    return false;
  }

  getPerceivedLocation(tickPercent) {
    const percent = _.clamp((1 - this.moveTick + tickPercent) / 2, 0, 1);
    return {
      x: Pathing.linearInterpolation(this.lastLocation.x, this.location.x, percent),
      y: Pathing.linearInterpolation(this.lastLocation.y, this.location.y, percent),
      z: 0,
    };
  }
}
