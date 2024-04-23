"use strict";

import _ from "lodash";

import { MeleeWeapon } from "../../../../sdk/weapons/MeleeWeapon";
import { Mob, AttackIndicators } from "../../../../sdk/Mob";
import { UnitBonuses } from "../../../../sdk/Unit";
import { Collision } from "../../../../sdk/Collision";
import { EntityName } from "../../../../sdk/EntityName";
import { Projectile } from "../../../../sdk/weapons/Projectile";
import { Sound, SoundCache } from "../../../../sdk/utils/SoundCache";
import { Location } from "../../../../sdk/Location";
import { GLTFModel } from "../../../../sdk/rendering/GLTFModel";
import { Assets } from "../../../../sdk/utils/Assets";
import { Random } from "../../../../sdk/Random";
import { DelayedAction } from "../../../../sdk/DelayedAction";
import { SolGroundSlam } from "../entities/SolGroundSlam";
import { RingBuffer } from "../utils/RingBuffer";
import { ColosseumSettings } from "../ColosseumSettings";
import { Pathing } from "../../../../sdk/Pathing";
import { EquipmentControls } from "../../../../sdk/controlpanels/EquipmentControls";
import { EquipmentTypes } from "../../../../sdk/Equipment";

export const SolHereditModel = Assets.getAssetUrl("models/sol.glb");

import SpearStart from "../../assets/sounds/8147_spear.ogg";
import SpearEnd from "../../assets/sounds/8047_spear_swing.ogg";
import ShieldStart from "../../assets/sounds/8150_shield_start.ogg";
import ShieldEnd from "../../assets/sounds/8145_shield_stomp.ogg";
import TripleStart from "../../assets/sounds/8211_triple_charge.ogg";
import TripleCharge1 from "../../assets/sounds/8317_triple_charge_1.ogg";
import TripleCharge2 from "../../assets/sounds/8274_triple_charge_2.ogg";
import TripleCharge3Short from "../../assets/sounds/8218_triple_charge_3_short.ogg";
import TripleCharge3Long from "../../assets/sounds/8113_triple_charge_3_long.ogg";
import TripleParry1 from "../../assets/sounds/8140_triple_parry_1.ogg";
import TripleParry2 from "../../assets/sounds/8171_triple_parry_2.ogg";
import TripleParry3 from "../../assets/sounds/8242_triple_parry_3.ogg";
import GrappleCharge from "../../assets/sounds/8329_grapple_charge.ogg";
import GrappleParry from "../../assets/sounds/8081_grapple_parry.ogg";
import PoolSpawn from "../../assets/sounds/8053_pool_spawn.ogg";
import PoolShriek from "../../assets/sounds/8093_pool_shriek.ogg";
import { SolSandPool } from "../entities/SolSandPool";
import { ColosseumRegion } from "../ColosseumRegion";

enum SolAnimations {
  Idle = 0,
  Walk = 1,
  SpearFast = 2,
  SpearSlow = 3,
  Grapple = 4,
  Shield = 5,
  TripleAttackLong = 6,
  TripleAttackShort = 7,
  Death = 8,
}

enum AttackDirection {
  West,
  East,
  North,
  South,
  NorthEast,
  NorthWest,
  SouthEast,
  SouthWest,
}

const DIRECTIONS = [
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: -1 },
  { dx: 1, dy: 1 },
  { dx: -1, dy: 1 },
];

const SPEAR_START = new Sound(SpearStart, 0.1);
const SPEAR_END = new Sound(SpearEnd, 0.1);
const SHIELD_START = new Sound(ShieldStart, 0.1);
const SHIELD_END = new Sound(ShieldEnd, 0.1);
const TRIPLE_START = new Sound(TripleStart, 0.1);
const TRIPLE_CHARGE_1 = new Sound(TripleCharge1, 0.1);
const TRIPLE_CHARGE_2 = new Sound(TripleCharge2, 0.1);
const TRIPLE_CHARGE_3_SHORT = new Sound(TripleCharge3Short, 0.1);
const TRIPLE_CHARGE_3_LONG = new Sound(TripleCharge3Long, 0.1);

const TRIPLE_PARRY_1 = new Sound(TripleParry1, 0.1);
const TRIPLE_PARRY_2 = new Sound(TripleParry2, 0.1);
const TRIPLE_PARRY_3 = new Sound(TripleParry3, 0.1);

const GRAPPLE_CHARGE = new Sound(GrappleCharge, 0.1);
const GRAPPLE_PARRY = new Sound(GrappleParry, 0.1);

const POOL_SPAWN = new Sound(PoolSpawn, 0.1);
const POOL_SHRIEK = new Sound(PoolShriek, 0.1);

export enum Attacks {
  SPEAR = "spear",
  SHIELD = "shield",
  TRIPLE_LONG = "triple_long",
  TRIPLE_SHORT = "triple_short",
  GRAPPLE = "grapple",
  PHASE_TRANSITION = "phase_transition",
}

export const PHASE_TRANSITION_POINTS: [number, string][] = [
  [1500, "Let's start by testing your footwork."],
  [1350, "Not bad. Let's try something else..."],
  [1110, "Impressive. Let's see how you handle this..."],
  [700, "You can't win!"],
  [350, "Ralos guides my hand!"],
  [110, "LET'S END THIS!"],
];

const GRAPPLE_SLOTS: { [slot in EquipmentTypes]?: string } = {
  [EquipmentTypes.CHEST]: "<col=ff0000>I'LL CRUSH YOUR </color><col=ffffff>BODY</color><col=ff0000>!</color>",
  [EquipmentTypes.BACK]: "<col=ff0000>I'LL BREAK YOUR </color><col=ffffff>BACK</color><col=ff0000>!</color>",
  [EquipmentTypes.GLOVES]: "<col=ff0000>I'LL TWIST YOUR </color><col=ffffff>HANDS</color><col=ff0000> OFF!</color>",
  [EquipmentTypes.LEGS]: "<col=ff0000>I'LL BREAK YOUR </color><col=ffffff>LEGS</color><col=ff0000>!</color>",
  [EquipmentTypes.FEET]: "<col=ff0000>I'LL CUT YOUR </color><col=ffffff>FEET</color><col=ff0000> OFF!</color>",
};

// used when the player messed up the parry
class ParryUnblockableWeapon extends MeleeWeapon {
  override isBlockable() {
    return false;
  }
}

export class SolHeredit extends Mob {
  shouldRespawnMobs: boolean;
  // public for testing
  firstSpear = true;
  firstShield = true;
  forceAttack: Attacks | null = null;

  lastLocation = { ...this.location };

  phaseId = -1;
  poolCache: {[xy: string]: boolean} = {};

  // melee prayer overhead history of target
  overheadHistory: RingBuffer = new RingBuffer(5);

  stationaryTimer = 0;

  mobName(): EntityName {
    return EntityName.SOL_HEREDIT;
  }

  shouldChangeAggro(projectile: Projectile) {
    return this.aggro != projectile.from && this.autoRetaliate;
  }

  get combatLevel() {
    return 1200;
  }

  get healthScale() {
    return this.stats.hitpoint;
  }

  visible() {
    return true;
  }

  dead() {
    super.dead();
  }

  setStats() {
    this.stunned = 4;
    this.weapons = {
      stab: new MeleeWeapon(),
    };

    this.stats = {
      attack: 350,
      strength: 400,
      defence: 200,
      range: 350,
      magic: 300,
      hitpoint: 1500,
    };

    // with boosts
    this.currentStats = JSON.parse(JSON.stringify(this.stats));
  }

  get bonuses(): UnitBonuses {
    return {
      attack: {
        stab: 250,
        slash: 0,
        crush: 0,
        magic: 80,
        range: 150,
      },
      defence: {
        stab: 65,
        slash: 5,
        crush: 30,
        magic: 750,
        range: 825,
      },
      other: {
        meleeStrength: 0,
        rangedStrength: 5,
        magicDamage: 1.0,
        prayer: 0,
      },
    };
  }

  get attackSpeed() {
    // irrelevant
    return 7;
  }

  get attackRange() {
    return 1;
  }

  get size() {
    return 5;
  }

  attackStyleForNewAttack() {
    return "stab" as const;
  }

  canMeleeIfClose() {
    return "stab" as const;
  }

  magicMaxHit() {
    return 70;
  }

  get maxHit() {
    return 70;
  }

  attackAnimation(tickPercent: number, context) {
    context.rotate(tickPercent * Math.PI * 2);
  }

  attackIfPossible() {
    this.overheadHistory.push(!!this.aggro?.prayerController.overhead());
    this.attackStyle = this.attackStyleForNewAttack();

    this.attackFeedback = AttackIndicators.NONE;

    if (this.phaseId < PHASE_TRANSITION_POINTS.length - 1) {
      const [threshold, message] = PHASE_TRANSITION_POINTS[this.phaseId + 1];
      if (this.currentStats.hitpoint <= threshold) {
        if (this.phaseId >= 0) { // none on the first phase transition
          this.forceAttack = Attacks.PHASE_TRANSITION;
        }
        this.phaseId++;
        this.setOverheadText(message);
      }
    }

    if (!this.aggro) {
      return;
    }

    this.hadLOS = this.hasLOS;
    // override LOS check to attack melee diagonally
    const [tx, ty] = this.getClosestTileTo(this.aggro.location.x, this.aggro.location.y);
    const dx = this.aggro.location.x - tx,
      dy = this.aggro.location.y - ty;
    const isAdjacent = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
    this.hasLOS = isAdjacent;

    if (this.canAttack() === false) {
      return;
    }

    if (this.hasLOS && this.attackDelay <= 0 && this.stationaryTimer > 0) {
      const nextAttack = this.selectAttack();
      let nextDelay = 0;
      switch (nextAttack) {
        case Attacks.SHIELD:
          nextDelay = this.attackShield();
          break;
        case Attacks.SPEAR:
          nextDelay = this.attackSpear();
          break;
        case Attacks.TRIPLE_SHORT:
          nextDelay = this.attackTripleShort();
          break;
        case Attacks.TRIPLE_LONG:
          nextDelay = this.attackTripleLong();
          break;
        case Attacks.GRAPPLE:
          nextDelay = this.attackGrapple();
          break;
        case Attacks.PHASE_TRANSITION:
          nextDelay = this.phaseTransition(this.phaseId);
          break;
      }
      this.didAttack();
      this.attackDelay = nextDelay;
      this.forceAttack = null;
    }
  }

  private selectAttack() {
    if (this.forceAttack) {
      return this.forceAttack;
    }
    const attackPool = [
      ...(ColosseumSettings.useShields && [Attacks.SHIELD]),
      ...(ColosseumSettings.useSpears && [Attacks.SPEAR]),
      ...(ColosseumSettings.useTripleLong && [Attacks.TRIPLE_LONG]),
      ...(ColosseumSettings.useTripleShort && [Attacks.TRIPLE_SHORT]),
      ...(ColosseumSettings.useGrapple && [Attacks.GRAPPLE]),
    ];
    if (attackPool.length === 0) {
      return null;
    }
    return attackPool[Math.floor(Random.get() * attackPool.length)];
  }

  private attackSpear() {
    this.freeze(6);
    this.playAnimation(SolAnimations.SpearSlow);
    SoundCache.play(SPEAR_START);
    DelayedAction.registerDelayedAction(
      new DelayedAction(this.firstSpear ? this.doFirstSpear.bind(this) : this.doSecondSpear.bind(this), 2),
    );
    DelayedAction.registerDelayedAction(new DelayedAction(() => SoundCache.play(SPEAR_END), 3));
    this.firstSpear = !this.firstSpear;
    this.firstShield = true;
    return 7;
  }

  private attackShield() {
    this.freeze(4);
    this.playAnimation(SolAnimations.Shield);
    SoundCache.play(SHIELD_START);
    DelayedAction.registerDelayedAction(
      new DelayedAction(this.firstShield ? this.doFirstShield.bind(this) : this.doSecondShield.bind(this), 2),
    );
    DelayedAction.registerDelayedAction(new DelayedAction(() => SoundCache.play(SHIELD_END), 3));
    this.firstSpear = true;
    this.firstShield = !this.firstShield;
    return 6;
  }

  private fillRect(fromX: number, fromY: number, toX: number, toY: number, exceptRadius = null) {
    if (!this.aggro) {
      return;
    }
    const midX = (toX - fromX + 1) / 2;
    const midY = (toY - fromY + 1) / 2;
    const radius = Math.abs(fromX - toX);
    for (let xx = fromX; xx < toX; ++xx) {
      for (let yy = toY; yy > fromY; --yy) {
        const radX = Math.abs(midX - xx + fromX);
        const radY = Math.abs(midY - yy + fromY);
        if ((radX === exceptRadius && radY <= exceptRadius) || (radY === exceptRadius && radX <= exceptRadius)) {
          continue;
        }
        this.region.addEntity(
          new SolGroundSlam(this.region, { x: xx, y: yy }, this, this.aggro, Math.max(radX, radY) / radius),
        );
      }
    }
  }

  // Bresenham's line algorirthm
  private fillLine(fromX: number, fromY: number, direction: AttackDirection, length: number) {
    if (!this.aggro) {
      return;
    }
    const toX = fromX + DIRECTIONS[direction].dx * length;
    const toY = fromY + DIRECTIONS[direction].dy * length;
    const dx = Math.abs(toX - fromX);
    const dy = Math.abs(toY - fromY);
    const sx = Math.sign(toX - fromX);
    const sy = Math.sign(toY - fromY);
    let err = dx - dy;
    let n = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      this.region.addEntity(new SolGroundSlam(this.region, { x: fromX, y: fromY }, this, this.aggro, n++ / length));
      if (fromX === toX && fromY === toY) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        fromX += sx;
      }
      if (e2 < dx) {
        err += dx;
        fromY += sy;
      }
    }
  }

  private doFirstSpear() {
    const LINE_LENGTH = 7;
    // slam under boss
    this.fillRect(this.location.x, this.location.y - this.size, this.location.x + this.size, this.location.y);
    const direction = this.getAttackDirection();
    // slam line facing player
    switch (direction) {
      case AttackDirection.West:
        this.fillRect(this.location.x - 1, this.location.y - this.size, this.location.x, this.location.y);
        this.fillLine(this.location.x - 2, this.location.y - 1, direction, LINE_LENGTH);
        this.fillLine(this.location.x - 2, this.location.y - 3, direction, LINE_LENGTH);
        break;
      case AttackDirection.East:
        this.fillRect(
          this.location.x + this.size,
          this.location.y - this.size,
          this.location.x + this.size + 1,
          this.location.y,
        );
        this.fillLine(this.location.x + this.size + 1, this.location.y - 1, direction, LINE_LENGTH);
        this.fillLine(this.location.x + this.size + 1, this.location.y - 3, direction, LINE_LENGTH);
        break;
      case AttackDirection.North:
        this.fillRect(
          this.location.x,
          this.location.y - this.size - 1,
          this.location.x + this.size,
          this.location.y - this.size,
        );
        this.fillLine(this.location.x + 1, this.location.y - this.size - 1, direction, LINE_LENGTH);
        this.fillLine(this.location.x + 3, this.location.y - this.size - 1, direction, LINE_LENGTH);
        break;
      case AttackDirection.South:
        this.fillRect(this.location.x, this.location.y, this.location.x + this.size, this.location.y + 1);
        this.fillLine(this.location.x + 1, this.location.y + 2, direction, LINE_LENGTH);
        this.fillLine(this.location.x + 3, this.location.y + 2, direction, LINE_LENGTH);
        break;
      case AttackDirection.NorthEast:
        this.fillLine(this.location.x + this.size - 1, this.location.y - this.size, direction, LINE_LENGTH);
        this.fillLine(this.location.x + this.size, this.location.y - this.size + 1, direction, LINE_LENGTH);
        break;
      case AttackDirection.SouthEast:
        this.fillLine(this.location.x + this.size, this.location.y, direction, LINE_LENGTH);
        this.fillLine(this.location.x + this.size - 1, this.location.y + 1, direction, LINE_LENGTH);
        break;
      case AttackDirection.SouthWest:
        this.fillLine(this.location.x - 1, this.location.y, direction, LINE_LENGTH);
        this.fillLine(this.location.x, this.location.y + 1, direction, LINE_LENGTH);
        break;
      case AttackDirection.NorthWest:
        this.fillLine(this.location.x - 1, this.location.y - this.size + 1, direction, LINE_LENGTH);
        this.fillLine(this.location.x, this.location.y - this.size, direction, LINE_LENGTH);
        break;
    }
  }

  private doSecondSpear() {
    const LINE_LENGTH = 7;
    // slam under boss
    this.fillRect(
      this.location.x - 1,
      this.location.y - this.size - 1,
      this.location.x + this.size + 1,
      this.location.y + 1,
    );
    const direction = this.getAttackDirection();
    // slam line facing player
    switch (direction) {
      case AttackDirection.West:
        this.fillRect(this.location.x - 1, this.location.y - this.size, this.location.x, this.location.y);
        this.fillLine(this.location.x - 2, this.location.y, direction, LINE_LENGTH);
        this.fillLine(this.location.x - 2, this.location.y - 2, direction, LINE_LENGTH);
        this.fillLine(this.location.x - 2, this.location.y - 4, direction, LINE_LENGTH);
        break;
      case AttackDirection.East:
        this.fillLine(this.location.x + this.size + 1, this.location.y, direction, LINE_LENGTH);
        this.fillLine(this.location.x + this.size + 1, this.location.y - 2, direction, LINE_LENGTH);
        this.fillLine(this.location.x + this.size + 1, this.location.y - 4, direction, LINE_LENGTH);
        break;
      case AttackDirection.North:
        this.fillLine(this.location.x, this.location.y - this.size - 1, direction, LINE_LENGTH);
        this.fillLine(this.location.x + 2, this.location.y - this.size - 1, direction, LINE_LENGTH);
        this.fillLine(this.location.x + 4, this.location.y - this.size - 1, direction, LINE_LENGTH);
        break;
      case AttackDirection.South:
        this.fillLine(this.location.x, this.location.y + 2, direction, LINE_LENGTH);
        this.fillLine(this.location.x + 2, this.location.y + 2, direction, LINE_LENGTH);
        this.fillLine(this.location.x + 4, this.location.y + 2, direction, LINE_LENGTH);
        break;
      case AttackDirection.NorthEast:
        this.fillLine(this.location.x + this.size + 1, this.location.y - this.size - 1, direction, LINE_LENGTH);
        this.fillLine(this.location.x + this.size - 2, this.location.y - this.size - 1, direction, LINE_LENGTH);
        this.fillLine(this.location.x + this.size + 1, this.location.y - this.size + 2, direction, LINE_LENGTH);
        break;
      case AttackDirection.SouthEast:
        this.fillLine(this.location.x + this.size + 1, this.location.y - 1, direction, LINE_LENGTH);
        this.fillLine(this.location.x + this.size + 1, this.location.y + 2, direction, LINE_LENGTH);
        this.fillLine(this.location.x + this.size - 2, this.location.y + 2, direction, LINE_LENGTH);
        break;
      case AttackDirection.SouthWest:
        this.fillLine(this.location.x - 2, this.location.y + 2, direction, LINE_LENGTH);
        this.fillLine(this.location.x - 2, this.location.y - 1, direction, LINE_LENGTH);
        this.fillLine(this.location.x + 1, this.location.y + 2, direction, LINE_LENGTH);
        break;
      case AttackDirection.NorthWest:
        this.fillLine(this.location.x - 2, this.location.y - this.size + 2, direction, LINE_LENGTH);
        this.fillLine(this.location.x - 2, this.location.y - this.size - 1, direction, LINE_LENGTH);
        this.fillLine(this.location.x + 1, this.location.y - this.size - 1, direction, LINE_LENGTH);
        break;
    }
  }

  private doFirstShield() {
    this.fillRect(this.location.x - 8, this.location.y - 12, this.location.x + 11, this.location.y + 7, 4);
  }

  private doSecondShield() {
    this.fillRect(this.location.x - 8, this.location.y - 12, this.location.x + 11, this.location.y + 7, 5);
  }

  private attackTripleShort() {
    this.firstShield = true;
    this.firstSpear = true;
    // used above 50%
    this.playAnimation(SolAnimations.TripleAttackShort);
    this._attackTriple(true);
    return 12; // should be 11 between 50% and 75%
  }

  private attackTripleLong() {
    this.firstShield = true;
    this.firstSpear = true;
    // used below 50%
    this.playAnimation(SolAnimations.TripleAttackLong);
    this._attackTriple(false);
    return 12;
  }

  private attackGrapple() {
    this.firstShield = true;
    this.firstSpear = true;
    this.playAnimation(SolAnimations.Grapple);
    SoundCache.play(GRAPPLE_CHARGE);
    const slotIdx = Math.floor(Random.get() * Object.keys(GRAPPLE_SLOTS).length);
    const slot = Object.keys(GRAPPLE_SLOTS)[slotIdx];
    const overheadText = GRAPPLE_SLOTS[slot];
    this.setOverheadText(overheadText);

    let didParry = false;
    EquipmentControls?.instance.addEquipmentInteraction((clickedSlot) => {
      if (clickedSlot === slot) {
        didParry = true;
      }
    });
    DelayedAction.registerDelayedNpcAction(
      new DelayedAction(() => {
        if (didParry) {
          SoundCache.play(GRAPPLE_PARRY);
        }
        // queue damage to be played this tick (remember NPCs take turn before enemy)
        this.aggro.addProjectile(
          new Projectile(
            new ParryUnblockableWeapon(),
            didParry ? 0 : 20 + Math.floor(Random.get() * 25),
            this,
            this.aggro,
            "stab",
            { hidden: true, setDelay: 0 },
          ),
        );
        EquipmentControls?.instance.resetEquipmentInteractions();
      }, 3),
    );
    return 8; // should be 7 under 75%
  }

  private _attackTriple(short: boolean) {
    SoundCache.play(TRIPLE_START);
    SoundCache.play(TRIPLE_CHARGE_1);
    DelayedAction.registerDelayedAction(new DelayedAction(this.doParryAttack(15, 3).bind(this), 2));
    DelayedAction.registerDelayedAction(
      new DelayedAction(() => {
        SoundCache.play(TRIPLE_PARRY_1);
      }, 3),
    );
    DelayedAction.registerDelayedAction(new DelayedAction(() => SoundCache.play(TRIPLE_CHARGE_2), 4));
    DelayedAction.registerDelayedAction(new DelayedAction(this.doParryAttack(short ? 25 : 30, 2).bind(this), 5));
    DelayedAction.registerDelayedAction(new DelayedAction(() => SoundCache.play(TRIPLE_PARRY_2), 6));
    if (short) {
      DelayedAction.registerDelayedAction(new DelayedAction(() => SoundCache.play(TRIPLE_CHARGE_3_SHORT), 6));
      DelayedAction.registerDelayedAction(new DelayedAction(this.doParryAttack(35, 2).bind(this), 8));
      DelayedAction.registerDelayedAction(new DelayedAction(() => SoundCache.play(TRIPLE_PARRY_3), 9));
    } else {
      DelayedAction.registerDelayedAction(new DelayedAction(() => SoundCache.play(TRIPLE_CHARGE_3_LONG), 6));
      DelayedAction.registerDelayedAction(new DelayedAction(this.doParryAttack(45, 3).bind(this), 9));
      DelayedAction.registerDelayedAction(new DelayedAction(() => SoundCache.play(TRIPLE_PARRY_3), 10));
    }
  }

  private wasOverheadOn(ticks: number) {
    for (let i = 0; i < ticks; ++i) {
      if (this.overheadHistory.pop()) {
        return true;
      }
    }
    return false;
  }

  private doParryAttack = (damage: number, ticks: number) => () => {
    const overheadWasOn = this.wasOverheadOn(ticks);
    this.aggro?.addProjectile(
      new Projectile(
        overheadWasOn ? new ParryUnblockableWeapon() : new MeleeWeapon(),
        damage,
        this,
        this.aggro,
        "stab",
        { hidden: true, setDelay: 1, checkPrayerAtHit: !overheadWasOn },
      ),
    );
    this.aggro?.prayerController.findPrayerByName("Protect from Melee").deactivate();
    this.aggro?.prayerController.findPrayerByName("Protect from Range").deactivate();
    this.aggro?.prayerController.findPrayerByName("Protect from Magic").deactivate();
    this.overheadHistory.clear();
  };

  private phaseTransition(toPhase: number) {
    this.freeze(5);
    SoundCache.play(POOL_SPAWN);
    const lastAggro = this.aggro;
    const {x , y } = this.aggro.location;
    this.tryPlacePool(x, y);
    const numOtherPools = toPhase === 5 ? 4 : 5;
    for (let i = 0 ; i < numOtherPools; ++i) {
      const xx = _.clamp(x - 4 + Math.floor(Random.get() * 9), ColosseumRegion.ARENA_WEST + 1, ColosseumRegion.ARENA_EAST - 1);
      const yy = _.clamp(y - 4 + Math.floor(Random.get() * 9), ColosseumRegion.ARENA_NORTH + 1, ColosseumRegion.ARENA_SOUTH - 1);
      this.tryPlacePool(xx, yy);
    }
    this.aggro = null;
    DelayedAction.registerDelayedAction(new DelayedAction(() => {
      SoundCache.play(POOL_SHRIEK);
    }, 3));
    DelayedAction.registerDelayedAction(new DelayedAction(() => {
      this.aggro = lastAggro;
    }, 5));

    return 7;
  }

  private tryPlacePool(x: number, y: number) {
    const key = `${x}.${y}`;
    if (this.poolCache[key]) {
      return;
    }
    this.poolCache[key] = true;
    this.region.addEntity(new SolSandPool(this.region, { x, y }));
  }

  private getAttackDirection() {
    const [closestX, closestY] = this.getClosestTileTo(this.aggro.location.x, this.aggro.location.y);
    const dx = this.aggro.location.x - closestX;
    const dy = this.aggro.location.y - closestY;
    if (dx < 0 && dy === 0) {
      return AttackDirection.West;
    } else if (dx < 0 && dy < 0) {
      return AttackDirection.NorthWest;
    } else if (dx === 0 && dy < 0) {
      return AttackDirection.North;
    } else if (dx > 0 && dy < 0) {
      return AttackDirection.NorthEast;
    } else if (dx > 0 && dy === 0) {
      return AttackDirection.East;
    } else if (dx > 0 && dy > 0) {
      return AttackDirection.SouthEast;
    } else if (dx === 0 && dy > 0) {
      return AttackDirection.South;
    } else {
      // technically also if dx = 0 and dy = 0, i.e. you're under the boss
      return AttackDirection.SouthWest;
    }
  }

  create3dModel() {
    return GLTFModel.forRenderable(this, SolHereditModel, 0.02);
  }

  override get idlePoseId() {
    return SolAnimations.Idle;
  }

  override get walkingPoseId() {
    return SolAnimations.Walk;
  }

  override get attackAnimationId() {
    // controlled separately
    return null;
  }

  override get deathAnimationId() {
    return SolAnimations.Death;
  }

  override get deathAnimationLength() {
    return 8;
  }

  get maxSpeed() {
    return 2;
  }

  override movementStep() {
    super.movementStep();
    if (this.lastLocation.x === this.location.x && this.lastLocation.y === this.location.y) {
      ++this.stationaryTimer;
    } else {
      this.stationaryTimer = 0;
    }
    this.lastLocation = { ...this.location };
  }

  override getNextMovementStep() {
    if (!this.aggro) {
      return { dx: this.location.x, dy: this.location.y };
    }
    const { x: tx, y: ty } = this.aggro.location;
    const closestTile = this.getClosestTileTo(tx, ty);
    const originLocation = { x: closestTile[0], y: closestTile[1] };
    const seekingTiles: Location[] = [];
    const aggroSize = this.aggro.size;
    _.range(0, aggroSize).forEach((xx) => {
      [-1, this.aggro.size].forEach((yy) => {
        // Don't path into an unpathable object.
        const px = this.aggro.location.x + xx;
        const py = this.aggro.location.y - yy;
        if (!Collision.collidesWithAnyEntities(this.region, px, py, 1)) {
          seekingTiles.push({
            x: px,
            y: py,
          });
        }
      });
    });
    _.range(0, aggroSize).forEach((yy) => {
      [-1, this.aggro.size].forEach((xx) => {
        // Don't path into an unpathable object.
        const px = this.aggro.location.x + xx;
        const py = this.aggro.location.y - yy;
        if (!Collision.collidesWithAnyEntities(this.region, px, py, 1)) {
          seekingTiles.push({
            x: px,
            y: py,
          });
        }
      });
    });
    // Create paths to all npc tiles
    const { destination, path } = Pathing.constructPaths(this.region, originLocation, seekingTiles);
    if (path.length === 0) {
      return;
    }
    let diffX = 0,
      diffY = 0;
    if (path.length <= this.maxSpeed) {
      // Step to the destination
      diffX = path[0].x - originLocation.x;
      diffY = path[0].y - originLocation.y;
    } else {
      // Move two steps forward
      diffX = path[path.length - this.maxSpeed - 1].x - originLocation.x;
      diffY = path[path.length - this.maxSpeed - 1].y - originLocation.y;
    }

    let dx = this.location.x + diffX;
    let dy = this.location.y + diffY;
    if (
      Collision.collisionMath(
        this.location.x,
        this.location.y,
        this.size,
        this.aggro.location.x,
        this.aggro.location.y,
        1,
      )
    ) {
      // Random movement if player is under the mob.
      if (Random.get() < 0.5) {
        dy = this.location.y;
        if (Random.get() < 0.5) {
          dx = this.location.x + 1;
        } else {
          dx = this.location.x - 1;
        }
      } else {
        dx = this.location.x;
        if (Random.get() < 0.5) {
          dy = this.location.y + 1;
        } else {
          dy = this.location.y - 1;
        }
      }
    }
    return { dx, dy };
  }

  override get drawTrueTile() {
    return true;
  }
}