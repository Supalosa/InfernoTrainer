import { COLOSSEUM_ASSETS } from "../../../../assets";
"use strict";

import _ from "lodash";

import {
  CacheRenderModel,
  CacheRenderReferences,
  DelayedAction,
  EquipmentControls,
  Collision,
  Region,
  Location,
  EquipmentTypes,
  AttackIndicators,
  cacheSound,
  Mob,
  Pathing,
  Random,
  UnitBonuses,
  MeleeWeapon,
  Projectile,
  Sound,
  SoundCache,
  Trainer,
  Viewport,
  GraphicsObject,
} from "osrs-sdk";

import { SolGroundSlam } from "../entities/SolGroundSlam";
import { colosseumSettings } from "../ColosseumSettings";
import TripleParry1 from "../../assets/sounds/8140_triple_parry_1.ogg";
import TripleParry2 from "../../assets/sounds/8171_triple_parry_2.ogg";
import TripleParry3 from "../../assets/sounds/8242_triple_parry_3.ogg";

import { SolSandPool } from "../entities/SolSandPool";
import { Edge, LaserOrb } from "../entities/LaserOrb";
import { ColosseumConstants } from "../Constants";
import { Button } from "osrs-sdk";

const PLAYER_DEATH_TAUNTS = [
  "How disappointing...",
  "I knew you weren't the one.",
  "You had me excited for a moment.",
  "Your lack of coordination is concerning.",
  "Your light shines no more.",
  "Maybe next time...",
  "Pathetic, really...",
  "I was just getting into my rhythm...",
];

enum SolAnimations {
  Idle = 0, // 10874
  Walk = 1, // 10878
  SpearSlow = 2, // 10883
  Grapple = 3, // 10884
  Shield = 4, // 10885
  TripleAttackLong = 5, // 10886
  TripleAttackShort = 6, // 10887
  Death = 7, // 10888
  Land = 8, // 10877
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

// Empirically it seems like all the frame sounds (where pretty much all of Sol's sounds come from)
// are delayed by 240ms. I haven't done enough testing to know if this is true for all framesounsd in the engine
// so we added a way to configure the delay per-model.
const SOL_FRAME_SOUNDS_DELAY_MS = 240;

const TRIPLE_PARRY_1 = new Sound(cacheSound(COLOSSEUM_ASSETS.sounds.solTripleParry1.id), 0.1);
const TRIPLE_PARRY_2 = new Sound(cacheSound(COLOSSEUM_ASSETS.sounds.solTripleParry2.id), 0.1);
const TRIPLE_PARRY_3 = new Sound(cacheSound(COLOSSEUM_ASSETS.sounds.solTripleParry3.id), 0.1);


const POOL_SPAWN = new Sound(cacheSound(COLOSSEUM_ASSETS.sounds.solPoolSpawn.id), 0.1);
const POOL_SHRIEK = new Sound(cacheSound(COLOSSEUM_ASSETS.sounds.solPoolShriek.id), 0.1);
const LASER_CHARGE = new Sound(cacheSound(COLOSSEUM_ASSETS.sounds.solLaserCharge.id), 0.1);
const LASER_FIRE = new Sound(cacheSound(COLOSSEUM_ASSETS.sounds.solLaserFire.id), 0.1);

const SOL_SOUNDS = [
  POOL_SPAWN,
  POOL_SHRIEK,
  LASER_CHARGE,
  LASER_FIRE,
];

const SPECIAL_ATTACK_COOLDOWN = 2;

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
  [1125, "Impressive. Let's see how you handle this..."],
  [750, "You can't win!"],
  [375, "Ralos guides my hand!"],
  [150, "LET'S END THIS!"],
];

const GRAPPLE_SLOTS: { [slot in EquipmentTypes]?: string } = {
  [EquipmentTypes.CHEST]: "<col=ff0000>I'LL CRUSH YOUR </color><col=ffffff>BODY</color><col=ff0000>!</color>",
  [EquipmentTypes.BACK]: "<col=ff0000>I'LL BREAK YOUR </color><col=ffffff>BACK</color><col=ff0000>!</color>",
  [EquipmentTypes.GLOVES]: "<col=ff0000>I'LL TWIST YOUR </color><col=ffffff>HANDS</color><col=ff0000> OFF!</color>",
  [EquipmentTypes.LEGS]: "<col=ff0000>I'LL BREAK YOUR </color><col=ffffff>LEGS</color><col=ff0000>!</color>",
  [EquipmentTypes.FEET]: "<col=ff0000>I'LL CUT YOUR </color><col=ffffff>FEET</color><col=ff0000> OFF!</color>",
};

const GRAPPLE_BODY_PARTS: { [slot in EquipmentTypes]?: string } = {
  [EquipmentTypes.CHEST]: "body",
  [EquipmentTypes.BACK]: "back",
  [EquipmentTypes.GLOVES]: "hands",
  [EquipmentTypes.LEGS]: "legs",
  [EquipmentTypes.FEET]: "feet",
};

// used when the player messed up the parry
class ParryUnblockableWeapon extends MeleeWeapon {
  override isBlockable() {
    return false;
  }
}

const MIN_LASER_ORB_COOLDOWN = 25;
const MAX_LASER_ORB_COOLDOWN = 35;
const ENRAGE_LASER_ORB_COOLDOWN = 12;
// Temporary visual test mode: put all four crystal orbs on the perimeter and
// fire them on a predictable cadence instead of waiting for phase transitions.
const LASER_TEST_MODE = false;
const LASER_TEST_FIRE_INTERVAL = 10;
const PROTECTION_PRAYERS = ["Protect from Melee", "Protect from Range", "Protect from Magic"];

export class SolHeredit extends Mob {
  shouldRespawnMobs: boolean;
  // public for testing
  firstSpear = true;
  firstShield = true;

  specialAttackCooldown = 0;

  forceAttack: Attacks | null = Attacks.SPEAR; // first attack is always a spear

  lastLocation = { ...this.location };

  laserOrbs: LaserOrb[];
  laserOrbCooldown = MIN_LASER_ORB_COOLDOWN;

  phaseId = -1;
  poolCache: { [xy: string]: boolean } = {};
  private groundSlamTick = -1;
  private groundSlamTiles = new Set<string>();
  finalPhasePoolTimer = 7; // once the phase transition is up

  stationaryTimer = 0;

  // for instancing of slams
  tickNumber = 0;
  private grappleParryMessage: string | null = null;
  private grappleParryMessageTimer = 0;
  private eagerPrayerMessage: string | null = null;
  private eagerPrayerMessageTimer = 0;
  private tripleParryAttackTicks: number[] = [];

  mobName() {
    return "Sol Heredit";
  }

  shouldChangeAggro(projectile: Projectile) {
    return !this.isFrozen() && this.aggro != projectile.from && this.autoRetaliate;
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

  get clickboxRadius() {
    // Sol's decoded model is the intended geometric clickbox.
    return null;
  }

  dead() {
    super.dead();
    Viewport.viewport.components.push(new Button("Reset", 120, 60, () => Trainer.reset()));
  }

  tauntPlayerDeath() {
    this.overheadText = PLAYER_DEATH_TAUNTS[Math.floor(Random.get() * PLAYER_DEATH_TAUNTS.length)];
    this.overheadTextTimer = 8;
  }

  setStats() {
    this.laserOrbs = [];
    this.stunned = 4;
    this.attackDelay = 6;
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

    this.playAnimation(SolAnimations.Land);
    this.setRotationImmediate(Math.PI * 1.5); // south

    if (LASER_TEST_MODE) {
      // createLaserOrb() chooses the next cardinal edge in order.
      for (let i = 0; i < 4; i++) this.createLaserOrb();
    }
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

  override contextActions(region: Region, x: number, y: number) {
    return super.contextActions(region, x, y).concat(
      PHASE_TRANSITION_POINTS.map(([hp], idx) => ({
        text: [
          { text: "Set to ", fillStyle: "white" },
          { text: `${hp}`, fillStyle: "yellow" },
          { text: " hp ", fillStyle: "white" },
        ],
        action: () => {
          Trainer.clickController.redClick();
          this.phaseId = idx;
          this.currentStats.hitpoint = hp;
        },
      })),
    );
  }

  get attackSpeed() {
    return 0;
  }

  get attackRange() {
    return 1;
  }

  get size() {
    return 5;
  }

  // The unanimated cache model is 360 units tall and NPC 12821 applies a
  // vertical scale of 300/128. Convert cache units to world tiles.
  override get logicalHeight() {
    return (360 * (300 / 128)) / 128;
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
    if (this.grappleParryMessageTimer > 0 && --this.grappleParryMessageTimer === 0) {
      this.grappleParryMessage = null;
    }
    if (this.eagerPrayerMessageTimer > 0 && --this.eagerPrayerMessageTimer === 0) {
      this.eagerPrayerMessage = null;
    }
    this.tickNumber++;
    this.laserOrbCooldown--;
    if (LASER_TEST_MODE && this.tickNumber % LASER_TEST_FIRE_INTERVAL === 0) {
      this.fireOrbs();
    }
    this.attackStyle = this.attackStyleForNewAttack();

    this.attackFeedback = AttackIndicators.NONE;

    if (
      colosseumSettings.getSnapshot().usePhaseTransitions &&
      this.attackDelay <= 0 &&
      this.phaseId < PHASE_TRANSITION_POINTS.length - 1
    ) {
      const [threshold, message] = PHASE_TRANSITION_POINTS[this.phaseId + 1];
      if (this.currentStats.hitpoint <= threshold) {
        if (this.phaseId >= 0) {
          // none on the first phase transition
          this.forceAttack = Attacks.PHASE_TRANSITION;
        }
        this.phaseId++;
        this.setOverheadText(message);
      }
    }
    if (this.phaseId === 5 && this.aggro) {
      if (--this.finalPhasePoolTimer === 0) {
        this.tryPlacePools(this.aggro.location.x, this.aggro.location.y, 1);
        this.finalPhasePoolTimer = 3;
      }
    }

    if (!this.aggro) {
      return;
    }

    this.punishEagerProtectionPrayer();

    this.hadLOS = this.hasLOS;
    // override LOS check to attack melee diagonally
    const [tx, ty] = this.getClosestTileTo(this.aggro.location.x, this.aggro.location.y);
    const dx = this.aggro.location.x - tx,
      dy = this.aggro.location.y - ty;
    const isAdjacent = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
    const targetIsUnderSol = Collision.collisionMath(
      this.location.x,
      this.location.y,
      this.size,
      this.aggro.location.x,
      this.aggro.location.y,
      this.aggro.size,
    );
    this.hasLOS = isAdjacent;

    if (this.canAttack() === false) {
      return;
    }

    // can phase without being in range
    const inRange = this.hasLOS || this.forceAttack === Attacks.PHASE_TRANSITION;
    if (inRange && this.attackDelay <= 0 && (this.stationaryTimer > 0 || targetIsUnderSol)) {
      const nextAttack = this.selectAttack();
      this.forceAttack = null;
      let nextDelay = 0;
      switch (nextAttack) {
        case Attacks.SHIELD:
          nextDelay = this.attackShield();
          this.specialAttackCooldown--;
          break;
        case Attacks.SPEAR:
          nextDelay = this.attackSpear();
          this.specialAttackCooldown--;
          break;
        case Attacks.TRIPLE_SHORT:
          this.specialAttackCooldown = SPECIAL_ATTACK_COOLDOWN;
          nextDelay = this.attackTripleShort();
          break;
        case Attacks.TRIPLE_LONG:
          this.specialAttackCooldown = SPECIAL_ATTACK_COOLDOWN;
          nextDelay = this.attackTripleLong();
          break;
        case Attacks.GRAPPLE:
          this.specialAttackCooldown = SPECIAL_ATTACK_COOLDOWN;
          nextDelay = this.attackGrapple();
          break;
        case Attacks.PHASE_TRANSITION:
          this.specialAttackCooldown = SPECIAL_ATTACK_COOLDOWN;
          this.forceAttack = Attacks.SPEAR;
          nextDelay = this.phaseTransition(this.phaseId);
          break;
      }
      this.didAttack();
      this.attackDelay = nextDelay;
      // trigger laser orbs on anything but a phase transition
      if (!LASER_TEST_MODE && nextAttack !== Attacks.PHASE_TRANSITION && this.laserOrbs.length > 0 && this.laserOrbCooldown < 0) {
        this.fireOrbs();
      }
    }
  }

  private getUserSelectedAttacks() {
    // Attacks selected in the UI, not necessarily what's possible in the game.
    const attacks = new Set<Attacks>();
    const settings = colosseumSettings.getSnapshot();
    if (settings.useSpears) {
      attacks.add(Attacks.SPEAR);
    }
    if (settings.useShields) {
      attacks.add(Attacks.SHIELD);
    }
    if (settings.useTriple) {
      attacks.add(Attacks.TRIPLE_SHORT);
    }
    if (settings.useGrapple) {
      attacks.add(Attacks.GRAPPLE);
    }
    if (settings.usePhaseTransitions) {
      attacks.add(Attacks.PHASE_TRANSITION);
    }
    return attacks;
  }

  private selectAttack(): Attacks | null {
    const settings = colosseumSettings.getSnapshot();
    const selectedAttacks = this.getUserSelectedAttacks();
    // check we can actually do a forced attack
    if (this.forceAttack && selectedAttacks.has(this.forceAttack)) {
      return this.forceAttack;
    }
    this.forceAttack = null;

    const canSpecial = this.specialAttackCooldown <= 0;

    const attackPool: Attacks[] = [
      // hacky 4x weighting for autos
      ...(settings.useShields ? [Attacks.SHIELD, Attacks.SHIELD, Attacks.SHIELD, Attacks.SHIELD] : []),
      ...(settings.useSpears ? [Attacks.SPEAR, Attacks.SPEAR, Attacks.SPEAR, Attacks.SPEAR] : []),
      ...(settings.useTriple && canSpecial && this.phaseId >= 3 ? [Attacks.TRIPLE_LONG] : []),
      ...(settings.useTriple && canSpecial && this.phaseId >= 1 && this.phaseId < 3 ? [Attacks.TRIPLE_SHORT] : []),
      ...(settings.useGrapple && canSpecial && this.phaseId >= 2 ? [Attacks.GRAPPLE] : []),
    ];
    if (attackPool.length === 0) {
      // at least allow it to do something
      this.specialAttackCooldown = 0;
      // forced an single attack  (and it can't do that attack due to phasing, for example), so allow it anyway
      if (selectedAttacks.size > 0) {
        return selectedAttacks.values().next().value!;
      }
      return null;
    }
    return attackPool[Math.floor(Random.get() * attackPool.length)];
  }

  private attackSpear() {
    this.freeze(6);
    this.playAnimation(SolAnimations.SpearSlow);
    DelayedAction.registerDelayedAction(
      new DelayedAction(this.firstSpear ? this.doFirstSpear.bind(this) : this.doSecondSpear.bind(this), 2),
    );
    this.firstSpear = !this.firstSpear;
    this.firstShield = true;
    return this.phaseId < 2 ? 7 : 6;
  }

  private attackShield() {
    this.freeze(4);
    this.playAnimation(SolAnimations.Shield);
    DelayedAction.registerDelayedAction(
      new DelayedAction(this.firstShield ? this.doFirstShield.bind(this) : this.doSecondShield.bind(this), 2),
    );
    this.firstSpear = true;
    this.firstShield = !this.firstShield;
    return this.phaseId < 2 ? 6 : 5;
  }

  private fillRect(fromX: number, fromY: number, toX: number, toY: number, exceptRadius = null) {
    if (!this.aggro) {
      return;
    }
    const midX = Math.floor((toX - fromX) / 2);
    const midY = Math.floor((toY - fromY) / 2);
    const radius = (Math.abs(fromX - toX) - 1) / 2 + 1;
    for (let xx = fromX; xx < toX; ++xx) {
      for (let yy = toY; yy > fromY; --yy) {
        if (!this.isArenaTile(xx, yy)) continue;
        const radX = Math.abs(fromX + midX - xx);
        const radY = Math.abs(fromY + midY - yy + 1);
        if ((radX === exceptRadius && radY <= exceptRadius) || (radY === exceptRadius && radX <= exceptRadius)) {
          continue;
        }
        const delay = Math.max(radX, radY) / radius;
        this.addGroundSlam(xx, yy, delay);
      }
    }
  }

  private addGroundSlam(x: number, y: number, delay: number) {
    if (this.groundSlamTick !== this.tickNumber) {
      this.groundSlamTick = this.tickNumber;
      this.groundSlamTiles.clear();
    }
    const key = `${x}.${y}`;
    if (this.groundSlamTiles.has(key)) return;
    this.groundSlamTiles.add(key);
    this.region.addEntity(new SolGroundSlam(this.region, { x, y }, this, this.aggro, delay));
  }

  private isArenaTile(x: number, y: number) {
    // Hazards stop at the inside edge of the wallmen; never place them on the
    // perimeter tiles themselves.
    return x > ColosseumConstants.ARENA_WEST && x < ColosseumConstants.ARENA_EAST &&
      y > ColosseumConstants.ARENA_NORTH && y < ColosseumConstants.ARENA_SOUTH;
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
      const delay = n / length;
      if (this.isArenaTile(fromX, fromY)) {
        this.addGroundSlam(fromX, fromY, delay);
      }
      n++;
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
    this.fillRect(this.location.x - 7, this.location.y - 12, this.location.x + 12, this.location.y + 7, 4);
  }

  private doSecondShield() {
    this.fillRect(this.location.x - 7, this.location.y - 12, this.location.x + 12, this.location.y + 7, 5);
  }

  private attackTripleShort() {
    this.firstShield = true;
    this.firstSpear = true;
    // used above 50%
    this.playAnimation(SolAnimations.TripleAttackShort);
    this.addSpotAnim({
      id: COLOSSEUM_ASSETS.spotAnims.solTripleAttackShort.id,
      channel: "sol-triple-attack",
      animation: SolAnimations.TripleAttackShort,
      height: 0,
    });
    this._attackTriple(true);
    return this.phaseId >= 2 ? 11 : 12; // should be 11 between 50% and 75%
  }

  private attackTripleLong() {
    this.firstShield = true;
    this.firstSpear = true;
    // used below 50%
    this.playAnimation(SolAnimations.TripleAttackLong);
    this.addSpotAnim({
      id: COLOSSEUM_ASSETS.spotAnims.solTripleAttackLong.id,
      channel: "sol-triple-attack",
      animation: SolAnimations.TripleAttackLong,
      height: 0,
    });
    this._attackTriple(false);
    return 12;
  }

  private attackGrapple() {
    this.freeze(5);
    this.firstShield = true;
    this.firstSpear = true;
    const slotIdx = Math.floor(Random.get() * Object.keys(GRAPPLE_SLOTS).length);
    const slot = Object.keys(GRAPPLE_SLOTS)[slotIdx];
    const overheadText = GRAPPLE_SLOTS[slot];
    this.setOverheadText(overheadText);

    let didParry = false;
    let didPerfectParry = false;
    const perfectParryStartTick = this.region.world.globalTickCounter + 3;

    DelayedAction.registerDelayedAction(
      new DelayedAction(() => {
        this.playAnimation(SolAnimations.Grapple);
      }, 1),
    );
    EquipmentControls?.instance.addEquipmentInteraction((clickedSlot) => {
      if (clickedSlot === slot) {
        didParry = true;
        if (!didPerfectParry) {
          this.grappleParryMessage = `You successfully defend your ${GRAPPLE_BODY_PARTS[slot]} from Sol Heredit's grapple!`;
          this.grappleParryMessageTimer = 8;
          if (this.region.world.globalTickCounter >= perfectParryStartTick) {
            didPerfectParry = true;
            this.grappleParryMessage = "You perfectly parry Sol Heredit's grapple!";
          }
        }
      }
    });
    DelayedAction.registerDelayedNpcAction(
      new DelayedAction(() => {
        if (didPerfectParry) {
          this.aggro?.grantMaxDamageRollsOnNextAttack();
        }
        // queue damage to be played this tick (remember NPCs take turn before enemy)
        this.aggro?.addProjectile(
          new Projectile(
            new ParryUnblockableWeapon(),
            didParry ? 0 : 20 + Math.floor(Random.get() * 25),
            this,
            this.aggro,
            "stab",
            { visuals: { hidden: true }, setDelay: 0 },
          ),
        );
        EquipmentControls?.instance.resetEquipmentInteractions();
      }, 4),
    );
    return 7; // only used under 75%, so always at 7
  }

  private _attackTriple(short: boolean) {
    const attackStartTick = this.region.world.globalTickCounter;
    // Each delayed parry creates a one-tick melee projectile, so the prayer
    // check belongs on the following tick when that hitsplat lands.
    this.tripleParryAttackTicks = short ? [attackStartTick + 3, attackStartTick + 6, attackStartTick + 9] : [attackStartTick + 3, attackStartTick + 6, attackStartTick + 10];
    this.punishEagerProtectionPrayer();
    DelayedAction.registerDelayedAction(new DelayedAction(this.doParryAttack(15).bind(this), 2));
    /*DelayedAction.registerDelayedAction(
      new DelayedAction(() => {
        SoundCache.play(TRIPLE_PARRY_1);
      }, 3),
    );*/
    DelayedAction.registerDelayedAction(new DelayedAction(this.doParryAttack(short ? 25 : 30).bind(this), 5));
    // DelayedAction.registerDelayedAction(new DelayedAction(() => SoundCache.play(TRIPLE_PARRY_2), 6));
    if (short) {
      DelayedAction.registerDelayedAction(new DelayedAction(this.doParryAttack(35).bind(this), 8));
      // DelayedAction.registerDelayedAction(new DelayedAction(() => SoundCache.play(TRIPLE_PARRY_3), 10));
    } else {
      DelayedAction.registerDelayedAction(new DelayedAction(this.doParryAttack(45).bind(this), 9));
      // DelayedAction.registerDelayedAction(new DelayedAction(() => SoundCache.play(TRIPLE_PARRY_3), 10));

    }
  }

  private punishEagerProtectionPrayer() {
    const currentTick = this.region.world.globalTickCounter;
    if (this.tripleParryAttackTicks.length > 0 && currentTick > this.tripleParryAttackTicks[this.tripleParryAttackTicks.length - 1]) {
      this.tripleParryAttackTicks = [];
      return;
    }
    if (this.tripleParryAttackTicks.length === 0 || this.tripleParryAttackTicks.includes(currentTick)) {
      return;
    }
    const activePrayer = this.aggro?.prayerController.activePrayers().find((prayer) => PROTECTION_PRAYERS.includes(prayer.name));
    if (activePrayer) {
      this.aggro.prayerController.disableProtectionPrayersForTicks(3);
      this.eagerPrayerMessage = "Sol Heredit doesn't take kindly to your eager prayer.";
      this.eagerPrayerMessageTimer = 8;
    }
  }

  private doParryAttack = (damage: number) => () => {
    this.aggro?.addProjectile(
      new Projectile(
        new MeleeWeapon(),
        damage,
        this,
        this.aggro,
        "stab",
        { visuals: { hidden: true }, setDelay: 1, checkPrayerAtHit: true },
      ),
    );
  };

  private phaseTransition(toPhase: number) {
    this.freeze(5);
    const lastAggro = this.aggro;
    const { x, y } = this.aggro.location;
    DelayedAction.registerDelayedNpcAction(
      new DelayedAction(() => {
        this.tryPlacePool(x, y);
        const numOtherPools = toPhase === 5 ? 4 : 5;
        this.tryPlacePools(x, y, numOtherPools);
      }, 1),
    );
    this.setAggro(null);
    DelayedAction.registerDelayedAction(
      new DelayedAction(() => {
        if (!lastAggro.hasDiedAndAwaitingRemoval) {
          this.setAggro(lastAggro);
        }
      }, 5),
    );
    if (toPhase >= 1 && toPhase <= 4) {
      this.createLaserOrb();
    } else if (toPhase >= 5) {
      this.laserOrbCooldown = ENRAGE_LASER_ORB_COOLDOWN; // force laser
    }
    return 7;
  }

  private tryPlacePools(x: number, y: number, amount: number) {
    SoundCache.play(POOL_SPAWN);
    DelayedAction.registerDelayedAction(
      new DelayedAction(() => {
        SoundCache.play(POOL_SHRIEK);
      }, 2),
    );
    for (let i = 0; i < amount; ++i) {
      const xx = _.clamp(
        x - 4 + Math.floor(Random.get() * 9),
        ColosseumConstants.ARENA_WEST + 1,
        ColosseumConstants.ARENA_EAST - 1,
      );
      const yy = _.clamp(
        y - 4 + Math.floor(Random.get() * 9),
        ColosseumConstants.ARENA_NORTH + 1,
        ColosseumConstants.ARENA_SOUTH - 1,
      );
      this.tryPlacePool(xx, yy);
    }
  }

  private tryPlacePool(x: number, y: number) {
    const key = `${x}.${y}`;
    if (this.poolCache[key]) {
      return;
    }
    this.poolCache[key] = true;
    this.region.addEntity(new SolSandPool(this.region, { x, y }));
    this.region.addEntity(new GraphicsObject(
      this.region,
      { x, y },
      COLOSSEUM_ASSETS.spotAnims.sandPool.id,
      // tiny vertical offset to avoid z-fighting
      { height: 0.005, delay: 0 },
    ));
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

  private createLaserOrb() {
    if (this.laserOrbs.length >= 4) {
      return;
    }
    const orbEdge = [Edge.NORTH, Edge.EAST, Edge.SOUTH, Edge.WEST][this.laserOrbs.length];
    const orb = LaserOrb.onEdge(this.region, orbEdge);
    this.laserOrbs.push(orb);
    this.region.addEntity(orb);
  }

  private fireOrbs() {
    this.laserOrbs.forEach((orb) => orb.fire());
    if (this.phaseId < 5) {
      this.laserOrbCooldown =
        MIN_LASER_ORB_COOLDOWN + Math.floor(Random.get() * (MAX_LASER_ORB_COOLDOWN - MIN_LASER_ORB_COOLDOWN));
    } else {
      this.laserOrbCooldown = ENRAGE_LASER_ORB_COOLDOWN;
    }
    DelayedAction.registerDelayedAction(
      new DelayedAction(() => {
        SoundCache.play(LASER_CHARGE);
      }, 3),
    );
    DelayedAction.registerDelayedAction(
      new DelayedAction(() => {
        SoundCache.play(LASER_FIRE);
      }, 7),
    );
  }

  create3dModel() {
    return CacheRenderModel.forRenderable(this, CacheRenderReferences.npc(12821), {
      frameSoundDelayMs: SOL_FRAME_SOUNDS_DELAY_MS
    });
  }

  override async preload() {
    await Promise.all([
      super.preload(),
      ...SOL_SOUNDS.map((sound) => SoundCache.preload(sound.src)),
    ]);
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

  override get canRun() {
    return true;
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

  override drawOverheadText(context, scale, alignCenter = true, prefix = "") {
    if (!alignCenter) {
      super.drawOverheadText(context, scale, alignCenter, prefix);
      return;
    }
    context.save();
    // Place the text baseline just above the health bar drawn at y=0.
    context.translate(0, (this.size / 2) * scale);
    super.drawOverheadText(context, scale, alignCenter, prefix);
    context.restore();
  }

  override drawUILayer(tickPercent, projector, context, scale) {
    super.drawUILayer(tickPercent, projector, context, scale);
    // draw overhead text on the bottom left to simulate chatbox
    context.save();
    context.translate(10, context.canvas.height - 10);
    this.drawOverheadText(context, scale, false, `${this.mobName()}: `);
    if (this.grappleParryMessage) {
      context.translate(0, -30);
      this.drawText(context, [{ text: this.grappleParryMessage, color: "006400" }], scale, false);
    }
    if (this.eagerPrayerMessage) {
      context.translate(0, -60);
      this.drawText(context, [{ text: this.eagerPrayerMessage, color: "ff0000" }], scale, false);
    }

    context.restore();
  }
}
