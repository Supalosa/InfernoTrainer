import {
  CacheRenderModel,
  CacheRenderReferences,
  MeleeWeapon,
  Mob,
  UnitBonuses,
} from "osrs-sdk";

import { COLOSSEUM_ASSETS } from "../../../../assets";

/** Semantic pose indices for NPC 12810 plus its human attack/death sequences. */
export enum JaguarWarriorAnimations {
  Idle = 0,
  Walk = 1,
  Attack = 2,
  Death = 3,
}

export class JaguarWarrior extends Mob {
  static readonly NPC_ID = COLOSSEUM_ASSETS.npcs.jaguarWarrior.id;

  override mobName() {
    return "Jaguar warrior";
  }

  override get combatLevel() {
    return 234;
  }

  override setStats() {
    this.weapons = { slash: new MeleeWeapon() };
    this.stats = {
      attack: 125,
      strength: 125,
      defence: 125,
      range: 1,
      magic: 100,
      hitpoint: 125,
    };
    this.currentStats = JSON.parse(JSON.stringify(this.stats));
  }

  override get bonuses(): UnitBonuses {
    return {
      attack: { stab: 0, slash: 100, crush: 0, magic: 0, range: 0 },
      defence: { stab: 0, slash: 0, crush: 0, magic: 0, range: 0 },
      other: { meleeStrength: 160, rangedStrength: 0, magicDamage: 1, prayer: 0 },
    };
  }

  override get attackSpeed() {
    return 5;
  }

  override get attackRange() {
    return 1;
  }

  override get size() {
    return 2;
  }

  override attackStyleForNewAttack() {
    return "slash";
  }

  override attack() {
    // Its claw attack makes three independent accuracy and damage rolls.
    let attacked = false;
    for (let hit = 0; hit < 3; hit++) attacked = super.attack() || attacked;
    return attacked;
  }

  override get idlePoseId() {
    return JaguarWarriorAnimations.Idle;
  }

  override get walkingPoseId() {
    return JaguarWarriorAnimations.Walk;
  }

  override get attackAnimationId() {
    return JaguarWarriorAnimations.Attack;
  }

  override get deathAnimationId() {
    return JaguarWarriorAnimations.Death;
  }

  override create3dModel() {
    return CacheRenderModel.forRenderable(this, CacheRenderReferences.npc(JaguarWarrior.NPC_ID));
  }
}
