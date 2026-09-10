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
    this.weapons = {
      magic: new MagicWeapon({
        visuals: { spotAnim: { id: COLOSSEUM_ASSETS.spotAnims.serpentShamanProjectile.id } },
      }),
    };
    this.stats = {
      attack: 100,
      strength: 90,
      defence: 90,
      range: 160,
      magic: 220,
      hitpoint: 125,
    };
    this.currentStats = JSON.parse(JSON.stringify(this.stats));
  }

  override get bonuses(): UnitBonuses {
    return {
      attack: { stab: 0, slash: 0, crush: 0, magic: 50, range: 0 },
      defence: { stab: 30, slash: 30, crush: 30, magic: 15, range: 50 },
      other: { meleeStrength: 0, rangedStrength: 0, magicDamage: 1.15, prayer: 0 },
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
    // Base damage 25 with the 15% magic-strength bonus yields max hit 28.
    return 25;
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
