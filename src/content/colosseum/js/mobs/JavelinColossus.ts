import {
  CacheRenderModel,
  CacheRenderReferences,
  Mob,
  RangedWeapon,
  UnitBonuses,
} from "osrs-sdk";
import type { Model } from "osrs-sdk";

import { COLOSSEUM_ASSETS } from "../../../../assets";

/** Semantic pose indices mapped to the cache sequences extracted for NPC 12817. */
export enum JavelinColossusAnimations {
  Idle = 0,
  Walk = 1,
  RangeAttack = 2,
  ArtilleryAttack = 3,
  Death = 4,
}

/** The Fortis Colosseum's Javelin Colossus (NPC definition 12817). */
export class JavelinColossus extends Mob {
  static readonly NPC_ID = COLOSSEUM_ASSETS.npcs.javelinColossus.id;

  override mobName() {
    return "Javelin Colossus";
  }

  override get combatLevel() {
    return 278;
  }

  override setStats() {
    this.weapons = { range: new RangedWeapon() };
    this.stats = {
      attack: 220,
      strength: 200,
      defence: 300,
      range: 190,
      magic: 225,
      hitpoint: 360,
    };
    this.currentStats = JSON.parse(JSON.stringify(this.stats));
  }

  override get bonuses(): UnitBonuses {
    return {
      attack: { stab: 0, slash: 0, crush: 0, magic: 0, range: 25 },
      defence: { stab: 15, slash: 15, crush: 15, magic: 20, range: 30 },
      other: { meleeStrength: 0, rangedStrength: 20, magicDamage: 1, prayer: 0 },
    };
  }

  override get attackSpeed() {
    return 5;
  }

  override get attackRange() {
    return 15;
  }

  override get maxHit() {
    return 48;
  }

  override get size() {
    return 3;
  }

  override attackStyleForNewAttack() {
    return "range";
  }

  override get idlePoseId() {
    return JavelinColossusAnimations.Idle;
  }

  override get walkingPoseId() {
    return JavelinColossusAnimations.Walk;
  }

  override get attackAnimationId() {
    return JavelinColossusAnimations.RangeAttack;
  }

  override get deathAnimationId() {
    return JavelinColossusAnimations.Death;
  }

  override create3dModel(): Model {
    return CacheRenderModel.forRenderable(this, CacheRenderReferences.npc(JavelinColossus.NPC_ID));
  }
}
