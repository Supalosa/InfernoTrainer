import {
  CacheRenderModel,
  CacheRenderReferences,
  MagicWeapon,
  Mob,
  UnitBonuses,
} from "osrs-sdk";

import { COLOSSEUM_ASSETS } from "../../../../assets";

/** Semantic pose indices mapped to the cache sequences extracted for NPC 12819. */
export enum ShockwaveColossusAnimations {
  Idle = 0,
  Walk = 1,
  Attack = 2,
  Death = 3,
}

export class ShockwaveColossus extends Mob {
  static readonly NPC_ID = COLOSSEUM_ASSETS.npcs.shockwaveColossus.id;

  override mobName() {
    return "Shockwave Colossus";
  }

  override get combatLevel() {
    return 239;
  }

  override setStats() {
    this.weapons = { magic: new MagicWeapon() };
    this.stats = {
      attack: 1,
      strength: 1,
      defence: 150,
      range: 1,
      magic: 350,
      hitpoint: 125,
    };
    this.currentStats = JSON.parse(JSON.stringify(this.stats));
  }

  override get bonuses(): UnitBonuses {
    return {
      attack: { stab: 0, slash: 0, crush: 0, magic: 0, range: 0 },
      defence: { stab: 0, slash: 0, crush: 0, magic: 0, range: 0 },
      other: { meleeStrength: 0, rangedStrength: 0, magicDamage: 1, prayer: 0 },
    };
  }

  override get attackSpeed() {
    return 5;
  }

  override get attackRange() {
    return 15;
  }

  override get size() {
    return 3;
  }

  override attackStyleForNewAttack() {
    return "magic";
  }

  override magicMaxHit() {
    return 56;
  }

  override get idlePoseId() {
    return ShockwaveColossusAnimations.Idle;
  }

  override get walkingPoseId() {
    return ShockwaveColossusAnimations.Walk;
  }

  override get attackAnimationId() {
    return ShockwaveColossusAnimations.Attack;
  }

  override get deathAnimationId() {
    return ShockwaveColossusAnimations.Death;
  }

  override create3dModel() {
    return CacheRenderModel.forRenderable(this, CacheRenderReferences.npc(ShockwaveColossus.NPC_ID));
  }
}
