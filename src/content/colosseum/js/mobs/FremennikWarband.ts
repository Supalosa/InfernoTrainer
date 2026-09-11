import {
  CacheRenderModel,
  CacheRenderReferences,
  Collision,
  IncomingAttackRoll,
  IncomingAttackRollModifiers,
  Location,
  MagicWeapon,
  MeleeWeapon,
  Mob,
  Pathing,
  RangedWeapon,
  UnitBonuses,
} from "osrs-sdk";

import { COLOSSEUM_ASSETS } from "../../../../assets";

export enum FremennikWarbandAnimations {
  Idle = 0,
  Walk = 1,
  Attack = 2,
  Defend = 3,
  Death = 4,
}

class FixedMaxMeleeWeapon extends MeleeWeapon {
  constructor(private readonly fixedMaxHit: number) {
    super();
  }

  override _maxHit() {
    return this.fixedMaxHit;
  }
}

class FixedMaxRangedWeapon extends RangedWeapon {
  constructor(private readonly fixedMaxHit: number) {
    super({ visuals: { spotAnim: { id: COLOSSEUM_ASSETS.spotAnims.fremennikArcherProjectile.id } } });
  }

  override _maxHit() {
    return this.fixedMaxHit;
  }
}

class FixedMaxMagicWeapon extends MagicWeapon {
  constructor(private readonly fixedMaxHit: number) {
    super({ visuals: { spotAnim: { id: COLOSSEUM_ASSETS.spotAnims.fremennikSeerProjectile.id } } });
  }

  override _maxHit() {
    return this.fixedMaxHit;
  }
}

/** Shared two-tile smart pathing and fixed-cycle combat for the warband. */
abstract class FremennikWarbander extends Mob {
  private movedThisTick = false;

  protected abstract get preferredTargetOffset(): Location;

  override get size() {
    return 1;
  }

  override get canRun() {
    return true;
  }

  /** Warbanders may stack with and move through other NPCs. */
  override get consumesSpace() {
    return null;
  }

  override get attackSpeed() {
    return 6;
  }

  override movementStep() {
    const previous = { ...this.location };
    super.movementStep();
    this.movedThisTick = previous.x !== this.location.x || previous.y !== this.location.y;
  }

  override canAttack() {
    return !this.movedThisTick && super.canAttack();
  }

  override canMove() {
    if (!this.aggro || this.isFrozen() || this.isStunned() || this.isDying()) return false;
    const preferred = {
      x: this.aggro.location.x + this.preferredTargetOffset.x,
      y: this.aggro.location.y + this.preferredTargetOffset.y,
    };
    return this.location.x !== preferred.x || this.location.y !== preferred.y;
  }

  override attackStep() {
    const attackWasDue = this.attackDelay <= 1;
    super.attackStep();
    // Warbanders keep their six-tick phase even when movement, range, a
    // freeze, or a stun prevents an attack on the scheduled tick.
    if (attackWasDue && this.attackDelay <= 0) this.attackDelay = this.attackSpeed;
  }

  override getNextMovementStep() {
    if (!this.aggro) return { dx: this.location.x, dy: this.location.y };

    const seekingTiles: Location[] = [];
    for (let offset = 0; offset < this.aggro.size; offset++) {
      for (const side of [-1, this.aggro.size]) {
        const horizontal = { x: this.aggro.location.x + offset, y: this.aggro.location.y - side };
        const vertical = { x: this.aggro.location.x + side, y: this.aggro.location.y - offset };
        if (!Collision.collidesWithAnyEntities(this.region, horizontal.x, horizontal.y, 1)) {
          seekingTiles.push(horizontal);
        }
        if (!Collision.collidesWithAnyEntities(this.region, vertical.x, vertical.y, 1)) {
          seekingTiles.push(vertical);
        }
      }
    }

    const origin = { ...this.location };
    const preferred = {
      x: this.aggro.location.x + this.preferredTargetOffset.x,
      y: this.aggro.location.y + this.preferredTargetOffset.y,
    };
    let pathResult = Pathing.constructPaths(this.region, origin, [preferred]);
    if (!pathResult.destination || pathResult.destination.x !== preferred.x || pathResult.destination.y !== preferred.y) {
      pathResult = Pathing.constructPaths(this.region, origin, seekingTiles);
    }
    const { path } = pathResult;
    if (path.length === 0) return { dx: origin.x, dy: origin.y };

    const step = path.length <= 2 ? path[0] : path[path.length - 3];
    return { dx: step.x, dy: step.y };
  }

  override get idlePoseId() {
    return FremennikWarbandAnimations.Idle;
  }

  override get walkingPoseId() {
    return FremennikWarbandAnimations.Walk;
  }

  override get attackAnimationId() {
    return FremennikWarbandAnimations.Attack;
  }

  override get deathAnimationId() {
    return FremennikWarbandAnimations.Death;
  }
}

export class FremennikWarbandArcher extends FremennikWarbander {
  static readonly NPC_ID = COLOSSEUM_ASSETS.npcs.fremennikWarbandArcher.id;

  protected override get preferredTargetOffset(): Location {
    return { x: -1, y: 0 };
  }

  override mobName() {
    return "Fremennik warband archer";
  }

  override get combatLevel() {
    return 104;
  }

  override setStats() {
    this.weapons = { range: new FixedMaxRangedWeapon(14) };
    this.stats = { attack: 110, strength: 110, defence: 80, range: 110, magic: 110, hitpoint: 50 };
    this.currentStats = { ...this.stats };
  }

  override get bonuses(): UnitBonuses {
    return {
      attack: { stab: 0, slash: 0, crush: 0, magic: 0, range: 150 },
      defence: { stab: 0, slash: 0, crush: 0, magic: 75, range: 0 },
      other: { meleeStrength: 0, rangedStrength: 10, magicDamage: 1, prayer: 0 },
    };
  }

  override get attackRange() {
    return this.isFrozen() ? 2 : 1;
  }

  override attackStyleForNewAttack() {
    return "range";
  }

  override incomingAttackRollModifiers(attack: IncomingAttackRoll): IncomingAttackRollModifiers {
    const modifiers = super.incomingAttackRollModifiers(attack);
    return attack.weapon instanceof MeleeWeapon
      ? { ...modifiers, guaranteedHit: true, maxDamage: true }
      : modifiers;
  }

  override create3dModel() {
    return CacheRenderModel.forRenderable(this, CacheRenderReferences.npc(FremennikWarbandArcher.NPC_ID));
  }
}

export class FremennikWarbandSeer extends FremennikWarbander {
  static readonly NPC_ID = COLOSSEUM_ASSETS.npcs.fremennikWarbandSeer.id;

  protected override get preferredTargetOffset(): Location {
    return { x: 1, y: 0 };
  }

  override mobName() {
    return "Fremennik warband seer";
  }

  override get combatLevel() {
    return 104;
  }

  override setStats() {
    this.weapons = { magic: new FixedMaxMagicWeapon(12) };
    this.stats = { attack: 110, strength: 110, defence: 80, range: 110, magic: 110, hitpoint: 50 };
    this.currentStats = { ...this.stats };
  }

  override get bonuses(): UnitBonuses {
    return {
      attack: { stab: 0, slash: 0, crush: 0, magic: 150, range: 0 },
      defence: { stab: 50, slash: 50, crush: 50, magic: 30, range: 0 },
      other: { meleeStrength: 0, rangedStrength: 0, magicDamage: 1, prayer: 0 },
    };
  }

  override get attackRange() {
    return this.isFrozen() ? 2 : 1;
  }

  override attackStyleForNewAttack() {
    return "magic";
  }

  override incomingAttackRollModifiers(attack: IncomingAttackRoll): IncomingAttackRollModifiers {
    const modifiers = super.incomingAttackRollModifiers(attack);
    return attack.weapon instanceof RangedWeapon
      ? { ...modifiers, guaranteedHit: true, maxDamage: true }
      : modifiers;
  }

  override create3dModel() {
    return CacheRenderModel.forRenderable(this, CacheRenderReferences.npc(FremennikWarbandSeer.NPC_ID));
  }
}

export class FremennikWarbandBerserker extends FremennikWarbander {
  static readonly NPC_ID = COLOSSEUM_ASSETS.npcs.fremennikWarbandBerserker.id;

  protected override get preferredTargetOffset(): Location {
    return { x: 0, y: -1 };
  }

  override mobName() {
    return "Fremennik warband berserker";
  }

  override get combatLevel() {
    return 103;
  }

  override setStats() {
    this.weapons = { stab: new FixedMaxMeleeWeapon(29) };
    this.stats = { attack: 110, strength: 110, defence: 80, range: 110, magic: 110, hitpoint: 48 };
    this.currentStats = { ...this.stats };
  }

  override get bonuses(): UnitBonuses {
    return {
      attack: { stab: 0, slash: 0, crush: 0, magic: 0, range: 0 },
      defence: { stab: 50, slash: 50, crush: 50, magic: 0, range: 0 },
      other: { meleeStrength: 90, rangedStrength: 0, magicDamage: 1, prayer: 0 },
    };
  }

  override get attackRange() {
    return 1;
  }

  override attackStyleForNewAttack() {
    return "stab";
  }

  override incomingAttackRollModifiers(attack: IncomingAttackRoll): IncomingAttackRollModifiers {
    const modifiers = super.incomingAttackRollModifiers(attack);
    return attack.weapon instanceof MagicWeapon
      ? { ...modifiers, guaranteedHit: true, maxDamage: true }
      : modifiers;
  }

  override create3dModel() {
    return CacheRenderModel.forRenderable(this, CacheRenderReferences.npc(FremennikWarbandBerserker.NPC_ID));
  }
}
