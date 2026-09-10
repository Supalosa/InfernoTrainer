import {
  CacheRenderModel,
  CacheRenderReferences,
  MeleeWeapon,
  Mob,
  UnitBonuses,
} from "osrs-sdk";

import { COLOSSEUM_ASSETS } from "../../../../assets";

/** Semantic pose indices mapped to the cache sequences extracted for NPC 12812. */
export enum MinotaurAnimations {
  Idle = 0,
  Walk = 1,
  Defend = 2,
  Attack = 3,
  Heal = 4,
  Spawn = 5,
  Death = 6,
}

export class Minotaur extends Mob {
  static readonly NPC_ID = COLOSSEUM_ASSETS.npcs.minotaur.id;

  override mobName() {
    return "Minotaur";
  }

  override get combatLevel() {
    return 318;
  }

  override setStats() {
    // Melee projectiles otherwise resolve on the firing tick. The Minotaur's
    // hitsplat is observed one tick after its attack.
    this.weapons = { crush: new MeleeWeapon({ setDelay: 2 }) };
    this.stats = {
      attack: 300,
      strength: 300,
      defence: 190,
      range: 1,
      magic: 250,
      hitpoint: 225,
    };
    this.currentStats = JSON.parse(JSON.stringify(this.stats));
  }

  override get bonuses(): UnitBonuses {
    return {
      attack: { stab: 0, slash: 0, crush: 0, magic: 0, range: 0 },
      defence: { stab: 0, slash: 0, crush: 0, magic: 0, range: 0 },
      other: { meleeStrength: 72, rangedStrength: 0, magicDamage: 1, prayer: 0 },
    };
  }

  override get attackSpeed() {
    return 5;
  }

  override get attackRange() {
    return 1;
  }

  override get size() {
    return 3;
  }

  override attackStyleForNewAttack() {
    return "crush";
  }

  override get idlePoseId() {
    return MinotaurAnimations.Idle;
  }

  override get walkingPoseId() {
    return MinotaurAnimations.Walk;
  }

  override get attackAnimationId() {
    return MinotaurAnimations.Attack;
  }

  override get deathAnimationId() {
    return MinotaurAnimations.Death;
  }

  override create3dModel() {
    return CacheRenderModel.forRenderable(this, CacheRenderReferences.npc(Minotaur.NPC_ID));
  }
}
