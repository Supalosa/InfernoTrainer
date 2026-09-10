import {
  CacheRenderModel,
  CacheRenderReferences,
  MagicWeapon,
  Mob,
  UnitBonuses,
} from "osrs-sdk";

import { COLOSSEUM_ASSETS } from "../../../../assets";

/** Semantic pose indices mapped to the cache sequences extracted for NPC 12811. */
export enum SerpentShamanAnimations {
  Idle = 0,
  Walk = 1,
  Attack = 2,
  Death = 3,
}

export class SerpentShaman extends Mob {
  static readonly NPC_ID = COLOSSEUM_ASSETS.npcs.serpentShaman.id;

  override mobName() {
    return "Serpent shaman";
  }

  override get combatLevel() {
    return 161;
  }

  override setStats() {
    this.weapons = { magic: new MagicWeapon() };
    this.stats = {
      attack: 1,
      strength: 1,
      defence: 90,
      range: 1,
      magic: 220,
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
    return 10;
  }

  override attackStyleForNewAttack() {
    return "magic";
  }

  override magicMaxHit() {
    return 27;
  }

  override get idlePoseId() {
    return SerpentShamanAnimations.Idle;
  }

  override get walkingPoseId() {
    return SerpentShamanAnimations.Walk;
  }

  override get attackAnimationId() {
    return SerpentShamanAnimations.Attack;
  }

  override get deathAnimationId() {
    return SerpentShamanAnimations.Death;
  }

  override create3dModel() {
    return CacheRenderModel.forRenderable(this, CacheRenderReferences.npc(SerpentShaman.NPC_ID));
  }
}
