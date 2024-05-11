"use strict";

import { Assets, Mob, EntityNames, MeleeWeapon, Sound, UnitBonuses, Location, GLTFModel, RangedWeapon, LocationUtils, Collision, UnitTypes, Player } from "@supalosa/oldschool-trainer-sdk";

import MeleerImage from "../../assets/images/meleer.png";
import MeleerSound from "../../assets/sounds/meleer.ogg";

const MeleerModel = Assets.getAssetUrl("models/verzik.glb");

enum VerzikAnimations {
  Idle,
  Move,
  Melee,
  Range
}

class VerzikMelee extends RangedWeapon {
  constructor() {
    super({
      sound: new Sound(MeleerSound, 0.6),
    });
  }

  override get isAreaAttack() {
    // can be fired even under the boss
    return true;
  }
}

class VerzikRanged extends RangedWeapon {
  constructor() {
    super({
      sound: new Sound(MeleerSound, 0.6),
    });
  }

  override get isAreaAttack() {
    // can be fired even under the boss
    return true;
  }
}

const DEFAULT_ATTACK_SPEED = 7;

export class VerzikVitur extends Mob {
  private _attackSpeed = DEFAULT_ATTACK_SPEED;

  constructor(region, location, options) {
    super(region, location, options);
    this.attackDelay = this._attackSpeed;
  }

  mobName() {
    return "Verzik Vitur";
  }

  get combatLevel() {
    return 240;
  }

  dead() {
    super.dead();
  }

  setStats() {
    this.stunned = 1;

    this.weapons = {
      slash: new MeleeWeapon({
        sound: new Sound(MeleerSound, 0.6),
        setDelay: 3,
      }),
      range: new VerzikRanged(),
    };

    // non boosted numbers
    this.stats = {
      attack: 400,
      strength: 400,
      defence: 150,
      range: 300,
      magic: 300,
      hitpoint: 3250,
    };

    // with boosts
    this.currentStats = JSON.parse(JSON.stringify(this.stats));
  }

  get bonuses(): UnitBonuses {
    return {
      attack: {
        stab: 80,
        slash: 80,
        crush: 80,
        magic: 80,
        range: 80,
      },
      defence: {
        stab: 70,
        slash: 30,
        crush: 70,
        magic: 100,
        range: 5,
      },
      other: {
        meleeStrength: 30,
        rangedStrength: 5,
        magicDamage: 5,
        prayer: 0,
      },
    };
  }

  setAttackSpeed(ticks: number) {
    this._attackSpeed = ticks;
  }

  get attackSpeed() {
    return this._attackSpeed;
  }

  override setHasLOS() {
    // verzik always has LOS
    this.hasLOS = true;
  }

  override canMove() {
    // verzik can move even with LOS but won't move if in melee range
    return !this.isInMeleeRange() && !this.isFrozen() && !this.isStunned() && !this.isDying();
  }

  isInMeleeRange() {
    if (!this.aggro) {
      return false;
    }
    const targetLocation = this.aggro.location;
    return Collision.collisionMath(this.location.x - 1, this.location.y + 1, this.size + 2, targetLocation.x, targetLocation.y, 1) && !Collision.collisionMath(this.location.x, this.location.y, this.size,  targetLocation.x, targetLocation.y, 1);
  }

  // verzik attacks on a timer
  override canAttack() {
    return false;
  }

  override timerStep() {
    // verzik attacks on timer, which happens before movement step
    if (this.attackDelay <= 0) {
      if (this.isInMeleeRange()) {
        this.attackMelee();
      } else {
        this.attackRanged();
      }
      this.attackDelay = this.attackSpeed;
    }
  }

  attackMelee() {
    this.playAnimation(VerzikAnimations.Melee);
  }

  attackRanged() {
    this.playAnimation(VerzikAnimations.Range);
  }

  get attackRange() {
    return 30;
  }

  get clickboxHeight() {
    return 3;
  }

  get size() {
    return 7;
  }

  get height() {
    return 3;
  }

  get image() {
    return MeleerImage;
  }

  get color() {
    return "#ACFF5633";
  }

  attackAnimation(tickPercent: number, context) {
    context.transform(1, 0, Math.sin(-tickPercent * Math.PI * 2) / 2, 1, 0, 0);
  }

  create3dModel() {
    return GLTFModel.forRenderable(this, MeleerModel, 0.0075);
  }

  get deathAnimationLength() {
    return 6;
  }

  get attackAnimationId() {
    const style = this.attackStyleForNewAttack();
    return style === "slash" ? 2 : 3;
  }

  override get deathAnimationId() {
    return VerzikAnimations.Move; // TODO
  }
}
