"use strict";
import { Pathing } from "./Pathing";
import { Settings } from "./Settings";
import { LineOfSight } from "./LineOfSight";
import { minBy, range, filter, find, map, min, uniq, sumBy, flatMap } from "lodash";
import { Unit, UnitTypes, UnitBonuses, UnitOptions } from "./Unit";
import { XpDropController } from "./XpDropController";
import { AttackBonuses, Weapon } from "./gear/Weapon";
import { BasePrayer } from "./BasePrayer";
import { XpDrop, XpDropAggregator } from "./XpDrop";
import { Location } from "./Location";
import { Mob } from "./Mob";
import { Equipment } from "./Equipment";
import { SetEffect } from "./SetEffect";
import chebyshev from "chebyshev";
import { ItemName } from "./ItemName";
import { Item } from "./Item";
import { Collision } from "./Collision";
import { Eating } from "./Eating";
import { PlayerStats } from "./PlayerStats";
import { PlayerRegenTimer } from "./PlayerRegenTimers";
import { PrayerController } from "./PrayerController";
import { AmmoType } from "./gear/Ammo";
import { Region } from "./Region";
import { Viewport } from "./Viewport";
import { Sound, SoundCache } from "./utils/SoundCache";

import LeatherHit from "../assets/sounds/hit.ogg";
import HumanHit from "../assets/sounds/human_hit_513.ogg";
import { Model } from "./rendering/Model";
import { BasicModel } from "./rendering/BasicModel";
import { TileMarker } from "../content/TileMarker";
import { PointingModel } from "./rendering/PlayerModel";

/* eslint-disable @typescript-eslint/no-explicit-any */

class PlayerEffects {
  poisoned = 0;
  venomed = 0;
  stamina = 0;
}

export class Player extends Unit {
  manualSpellCastSelection: Weapon;
  destinationLocation?: Location;

  stats: PlayerStats;
  currentStats: PlayerStats;
  xpDrops: XpDropAggregator;
  overhead: BasePrayer;
  running = true;
  cachedBonuses: UnitBonuses = null;
  useSpecialAttack = false;
  effects = new PlayerEffects();
  regenTimer: PlayerRegenTimer = new PlayerRegenTimer(this);

  autocastDelay = 1;
  manualCastHasTarget = false;

  eats: Eating = new Eating();
  inventory: Item[];

  seekingItem: Item = null;

  path: Location[] | null;

  clickMarker: ClickMarker | null = null;
  aggroMarker: ClickMarker | null = null;
  trueTileMarker: ClickMarker;

  constructor(region: Region, location: Location, options: UnitOptions = {}) {
    super(region, location, options);

    this.destinationLocation = location;
    this.equipmentChanged();
    this.clearXpDrops();
    this.autoRetaliate = false;
    this.eats.player = this;

    this.setUnitOptions(options);

    this.prayerController = new PrayerController(this);
    this.trueTileMarker = new ClickMarker(this.region, this.location);
    this.region.addEntity(this.trueTileMarker);
  }

  contextActions(region: Region, x: number, y: number) {
    return super.contextActions(region, x, y).concat([
      {
        text: [
          { text: "Attack ", fillStyle: "white" },
          { text: `Player`, fillStyle: "yellow" },
          {
            text: ` (level ${this.combatLevel})`,
            fillStyle: Viewport.viewport.player.combatLevelColor(this),
          },
        ],
        action: () => {
          Viewport.viewport.clickController.redClick();
          Viewport.viewport.player.setAggro(this);
        },
      },
    ]);
  }

  setUnitOptions(options: UnitOptions) {
    this.equipment = options.equipment || {};
    this.inventory = options.inventory || new Array(28).fill(null);
    this.equipmentChanged();
  }

  interruptCombat() {
    this.setAggro(null);
  }

  get color() {
    return "#00FF00";
  }

  get isPlayer(): boolean {
    return true;
  }

  get attackRange() {
    if (this.manualSpellCastSelection) {
      return this.manualSpellCastSelection.attackRange;
    }
    if (this.equipment.weapon) {
      return this.equipment.weapon.attackRange;
    }
    return 1;
  }

  get attackSpeed() {
    if (this.manualSpellCastSelection) {
      return this.manualSpellCastSelection.attackSpeed;
    }
    if (this.equipment.weapon) {
      return this.equipment.weapon.attackSpeed;
    }
    return 5;
  }

  openInventorySlots(): number[] {
    const openSpots = [];
    for (let i = 0; i < 28; i++) {
      if (!this.inventory[i]) {
        openSpots.push(i);
      }
    }
    return openSpots;
  }

  postAttacksEvent() {
    this.eats.checkRedemption(this);
  }

  equipmentChanged() {
    this.interruptCombat();

    const gear = [
      this.equipment.weapon,
      this.equipment.offhand,
      this.equipment.helmet,
      this.equipment.necklace,
      this.equipment.chest,
      this.equipment.legs,
      this.equipment.feet,
      this.equipment.gloves,
      this.equipment.ring,
      this.equipment.cape,
    ];

    if (
      this.equipment.weapon &&
      this.equipment.ammo &&
      this.equipment.weapon
        .compatibleAmmo()
        .includes(this.equipment.ammo.itemName)
    ) {
      gear.push(this.equipment.ammo);
    } else if (
      this.equipment.ammo &&
      this.equipment.ammo.ammoType() == AmmoType.BLESSING
    ) {
      gear.push(this.equipment.ammo);
    }

    // updated gear bonuses
    this.cachedBonuses = Unit.emptyBonuses();
    gear.forEach((gear: Equipment) => {
      if (gear && gear.bonuses) {
        this.cachedBonuses = Unit.mergeEquipmentBonuses(
          this.cachedBonuses,
          gear.bonuses
        );
      }
    });

    // update set effects
    const allSetEffects = [];
    gear.forEach((equipment: Equipment) => {
      if (equipment && equipment.equipmentSetEffect) {
        allSetEffects.push(equipment.equipmentSetEffect);
      }
    });
    const completeSetEffects = [];
    uniq(allSetEffects).forEach((setEffect: typeof SetEffect) => {
      const itemsInSet = setEffect.itemsInSet();
      let setItemsEquipped = 0;
      find(itemsInSet, (itemName: string) => {
        gear.forEach((equipment: Equipment) => {
          if (!equipment) {
            return;
          }
          if (itemName === equipment.itemName) {
            setItemsEquipped++;
          }
        });
      });
      if (itemsInSet.length === setItemsEquipped) {
        completeSetEffects.push(setEffect);
      }
    });
    this.setEffects = completeSetEffects;
  }

  get bonuses(): UnitBonuses {
    return this.cachedBonuses;
  }

  setStats() {
    // non boosted numbers
    this.stats = Settings.player_stats;

    // with boosts
    this.currentStats = JSON.parse(JSON.stringify(Settings.player_stats));
  }

  get weight(): number {
    let gear: Item[] = [
      this.equipment.weapon,
      this.equipment.offhand,
      this.equipment.helmet,
      this.equipment.necklace,
      this.equipment.chest,
      this.equipment.legs,
      this.equipment.feet,
      this.equipment.gloves,
      this.equipment.ring,
      this.equipment.cape,
      this.equipment.ammo,
    ];
    gear = gear.concat(this.inventory);
    gear = filter(gear);

    const kgs = Math.max(Math.min(64, sumBy(gear, "weight")), 0);
    return kgs;
  }

  get prayerDrainResistance(): number {
    // https://oldschool.runescape.wiki/w/Prayer#Prayer_drain_mechanics
    return 2 * this.bonuses.other.prayer + 60;
  }

  get type() {
    return UnitTypes.PLAYER;
  }

  clearXpDrops() {
    this.xpDrops = {};
  }

  grantXp(xpDrop: XpDrop) {
    if (!this.xpDrops[xpDrop.skill]) {
      this.xpDrops[xpDrop.skill] = 0;
    }
    this.xpDrops[xpDrop.skill] += xpDrop.xp;
  }

  sendXpToController() {
    if (!XpDropController.controller) {
      return;
    }
    if (this !== Viewport.viewport.player) {
      return;
    }

    Object.keys(this.xpDrops).forEach((skill) => {
      XpDropController.controller.registerXpDrop({
        skill,
        xp: Math.ceil(this.xpDrops[skill]),
      });
    });

    this.clearXpDrops();
  }

  moveTo(x: number, y: number) {
    this.interruptCombat();

    this.manualSpellCastSelection = null;

    const clickedOnEntities = Collision.collideableEntitiesAtPoint(
      this.region,
      x,
      y,
      1
    );
    if (clickedOnEntities.length) {
      // Clicked on an entity, scan around to find the best spot to actually path to
      const clickedOnEntity = clickedOnEntities[0];
      const maxDist = Math.ceil(clickedOnEntity.size / 2);
      let bestDistances = [];
      let bestDistance = 9999;
      for (let yOff = -maxDist; yOff < maxDist; yOff++) {
        for (let xOff = -maxDist; xOff < maxDist; xOff++) {
          const potentialX = x + xOff;
          const potentialY = y + yOff;
          const e = Collision.collideableEntitiesAtPoint(
            this.region,
            potentialX,
            potentialY,
            1
          );
          if (e.length === 0) {
            const distance = Pathing.dist(potentialX, potentialY, x, y);
            if (distance <= bestDistance) {
              if (
                bestDistances[0] &&
                bestDistances[0].bestDistance > distance
              ) {
                bestDistance = distance;
                bestDistances = [];
              }
              bestDistances.push({
                x: potentialX,
                y: potentialY,
                bestDistance,
              });
            }
          }
        }
      }
      const winner = minBy(bestDistances, (distance) =>
        Pathing.dist(distance.x, distance.y, this.location.x, this.location.y)
      );
      if (winner) {
        this.destinationLocation = { x: winner.x, y: winner.y };
      }
    } else {
      this.destinationLocation = { x, y };
    }
  }

  attack(): boolean {
    if (this.manualSpellCastSelection) {
      const target = this.aggro;
      this.manualSpellCastSelection.cast(this, target);
      this.manualSpellCastSelection = null;
      this.interruptCombat();
      this.destinationLocation = this.location;
    } else {
      // use equipped weapon
      if (this.equipment.weapon) {
        if (this.equipment.weapon.hasSpecialAttack() && this.useSpecialAttack) {
          if (
            this.currentStats.specialAttack >=
            this.equipment.weapon.specialAttackDrain()
          ) {
            this.equipment.weapon.specialAttack(
              this,
              this.aggro as Unit /* hack */
            );
            this.currentStats.specialAttack -=
              this.equipment.weapon.specialAttackDrain();
            this.regenTimer.specUsed();
          }
          this.useSpecialAttack = false;
        } else {
          const bonuses: AttackBonuses = {};
          if (
            this.equipment.helmet &&
            this.equipment.helmet.itemName === ItemName.SLAYER_HELMET_I
          ) {
            bonuses.gearMeleeMultiplier = 7 / 6;
            bonuses.gearRangeMultiplier = 1.15;
            bonuses.gearMageMultiplier = 1.15;
          }

          this.playAttackSound();
          return this.equipment.weapon.attack(
            this,
            this.aggro /* hack */,
            bonuses
          );
        }
      } else {
        return false;
      }
    }

    return true;
  }

  playAttackSound() {
    if (Settings.playsAudio && this.equipment.weapon?.attackSound) {
      SoundCache.play(this.equipment.weapon?.attackSound);
    }
  }

  activatePrayers() {
    this.lastOverhead = this.overhead;
    this.overhead = this.prayerController.overhead();
    if (this.lastOverhead && !this.overhead) {
      this.lastOverhead.playOffSound();
    } else if (this.lastOverhead !== this.overhead) {
      this.overhead.playOnSound();
    }
  }

  setAggro(mob: Unit) {
    if (mob !== this.aggro) {
      // do spam clicks constantly reset autocast delay? idk
      this.autocastDelay = 1; // not sure if this is actually correct behavior but whatever
    }

    if (this.manualSpellCastSelection && mob != null) {
      this.manualCastHasTarget = true;
    } else {
      this.manualCastHasTarget = false;
    }

    this.aggro = mob;
    this.seekingItem = null;
  }

  setSeekingItem(item: Item) {
    this.interruptCombat();
    this.seekingItem = item;
  }
  determineDestination() {
    if (this.aggro) {
      if (this.aggro.dying > -1) {
        this.destinationLocation = this.location;
        return;
      }
      const isUnderAggrodMob = Collision.collisionMath(
        this.location.x,
        this.location.y,
        1,
        this.aggro.location.x,
        this.aggro.location.y,
        this.aggro.size
      );
      this.setHasLOS();

      if (isUnderAggrodMob) {
        const maxDist = Math.ceil(this.aggro.size / 2);
        let bestDistance = 9999;
        let winner = null;
        for (let yy = -maxDist; yy < maxDist; yy++) {
          for (let xx = -maxDist; xx < maxDist; xx++) {
            const x = this.location.x + xx;
            const y = this.location.y + yy;
            if (Pathing.canTileBePathedTo(this.region, x, y, 1, {} as Mob)) {
              const distance = Pathing.dist(
                this.location.x,
                this.location.y,
                x,
                y
              );
              if (distance > 0 && distance < bestDistance) {
                bestDistance = distance;
                winner = { x, y };
              }
            }
          }
        }
        if (winner) {
          this.destinationLocation = { x: winner.x, y: winner.y };
        } else {
          console.log(
            "I don't understand what could cause this, but i'd like to find out"
          );
        }
      } else if (!this.hasLOS) {
        const seekingTiles: Location[] = [];
        // "When clicking on an npc, object, or player, the requested tiles will be all tiles"
        // "within melee range of the npc, object, or player."
        // For implementation reasons we also ensure the north/south tiles are added to seekingTiles *first* so that
        // in cases of ties, the north and south tiles are picked by minBy below.
        const aggroSize = this.aggro.size;
        range(0, aggroSize).forEach((xx) => {
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
        range(0, aggroSize).forEach((yy) => {
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
        const potentialPaths = flatMap(seekingTiles, (point) =>
          Pathing.constructPaths(this.region, this.location, [{
            x: point.x,
            y: point.y,
          }])
        );
        const potentialPathLengths = map(potentialPaths, (path) => path.path.length);
        // Figure out what the min distance is
        const shortestPathLength = min(potentialPathLengths);
        // Get all of the paths of the same minimum distance (can be more than 1)
        const shortestPaths = filter(
          map(potentialPathLengths, (length, index) =>
            length === shortestPathLength ? seekingTiles[index] : null
          )
        );
        // Take the path that is the shortest absolute distance from player
        this.destinationLocation = minBy(shortestPaths, (point) =>
          Pathing.dist(this.location.x, this.location.y, point.x, point.y)
        );
      } else {
        // stop moving
        this.destinationLocation = this.location;
      }
    } else if (this.seekingItem) {
      this.destinationLocation = this.seekingItem.groundLocation;
    }
  }

  moveTowardsDestination() {
    this.restingAngle = this.nextAngle;
    // Actually move the player
    this.perceivedLocation = this.location;

    // Calculate run energy
    const dist = chebyshev(
      [this.location.x, this.location.y],
      [this.destinationLocation.x, this.destinationLocation.y]
    );
    if (this.running && dist > 1) {
      const runReduction =
        67 + Math.floor(67 + Math.min(Math.max(0, this.weight), 64) / 64);
      if (this.effects.stamina) {
        this.currentStats.run -= Math.floor(0.3 * runReduction);
      } else if (
        this.equipment.ring &&
        this.equipment.ring.itemName === ItemName.RING_OF_ENDURANCE
      ) {
        this.currentStats.run -= Math.floor(0.85 * runReduction);
      } else {
        this.currentStats.run -= runReduction;
      }
    } else {
      this.currentStats.run += Math.floor(this.currentStats.agility / 6) + 8;
    }
    this.currentStats.run = Math.min(Math.max(this.currentStats.run, 0), 10000);
    if (this.currentStats.run === 0) {
      this.running = false;
    }
    this.effects.stamina--;
    this.effects.stamina = Math.min(Math.max(this.effects.stamina, 0), 200);

    const path = Pathing.path(
      this.region,
      this.location,
      this.destinationLocation,
      this.running ? 2 : 1,
      this.aggro
    );
    this.location = { x: path.x, y: path.y };

    if (this.clickMarker && this.location.x === path.destination.x && this.location.y === path.destination.y) {
      this.clickMarker.remove();
      this.region.removeEntity(this.clickMarker);
      this.clickMarker = null;
    } else if (!this.clickMarker) {
      this.clickMarker = new ClickMarker(this.region, path.destination);
      this.region.addEntity(this.clickMarker);
    } else {
        this.clickMarker.location = this.aggro ? path.destination : this.destinationLocation;
    }

    // save the next 2 steps for interpolation purposes
    this.path = path.path;
    this.trueTileMarker.location = this.location;
    this.nextAngle = this.getTargetAngle();
  }

  takeSeekingItem() {
    if (this.seekingItem) {
      if (this.seekingItem.groundLocation.x === this.location.x) {
        if (this.seekingItem.groundLocation.y === this.location.y) {
          // Verify player is close. Apparently we need to have the player keep track of this item
          this.region.removeGroundItem(
            this.seekingItem,
            this.location.x,
            this.location.y
          );
          const slots = this.openInventorySlots();
          if (slots.length) {
            const slot = slots[0];
            this.inventory[slot] = this.seekingItem;
          }
          this.seekingItem = null;
        }
      }
    }
  }

  dead() {
    super.dead();
    this.perceivedLocation = this.location;
    this.destinationLocation = this.location;
  }

  // Rotation Code
  private restingAngle = 0;
  private nextAngle = 0;

  private _angle = 0;

  private lastTickPercent = 0;

  getPerceivedRotation(tickPercent) {
    // https://gist.github.com/shaunlebron/8832585
    function shortAngleDist(a0, a1) {
      const da = (a1 - a0) % (Math.PI * 2);
      return 2 * da % (Math.PI * 2) - da;
    }
    // player can rotate this many JAUs per client tick
    const JAU_PER_CLIENT_TICK = 48;
    const CLIENT_TICKS_PER_SECOND = 50;
    const JAU_PER_RADIAN = 512;
    const RADIANS_PER_TICK = ((CLIENT_TICKS_PER_SECOND * JAU_PER_CLIENT_TICK) / JAU_PER_RADIAN) * 0.6; 
    //
    const turnAmount = (RADIANS_PER_TICK * Math.max(0, (tickPercent - this.lastTickPercent)));
    this.lastTickPercent = tickPercent;
    const diff = ((this.nextAngle - this._angle + Math.PI * 2) % (Math.PI * 2));
    const direction = diff - Math.PI > 0 ? -1 : 1;
    if (diff >= turnAmount) {
      this._angle += turnAmount * direction; 
    } else {
      this._angle = this.nextAngle;
    }
    return this._angle;
    //return this.restingAngle + shortAngleDist(this.restingAngle, this.nextAngle) * Math.min(tickPercent * 2, 1);
  }

  getTargetAngle() {
    if (this.aggro) {
      const angle = Pathing.angle(
        this.perceivedLocation.x + this.size / 2,
        this.perceivedLocation.y - this.size / 2,
        this.aggro.location.x + this.aggro.size / 2,
        this.aggro.location.y - this.aggro.size / 2
      );
      return -angle;
    }
    if (this.path?.length > 0) {
      const angle = Pathing.angle(
        this.perceivedLocation.x,
        this.perceivedLocation.y,
        this.path[this.path.length - 1].x,
        this.path[this.path.length - 1].y
      );
      return -angle;
    }
    return this.restingAngle;
  }

  movementStep() {
    if (this.dying > -1) {
      return;
    }

    this.activatePrayers();

    this.takeSeekingItem();

    if (!this.isFrozen()) {
      this.determineDestination();

      this.moveTowardsDestination();
    }
    this.frozen--;
  }

  hitSound(damaged: boolean): Sound | null {
    return damaged ? new Sound(HumanHit, 0.10) : new Sound(LeatherHit, 0.15); 
  }

  damageTaken() {
    if (
      this.prayerController.isPrayerActiveByName("Redemption") &&
      this.currentStats.hitpoint > 0 &&
      this.currentStats.hitpoint < Math.floor(this.stats.hitpoint / 10)
    ) {
      this.eats.redemptioned = true;
    }
  }

  pretick() {
    this.prayerController.tick(this);
  }

  attackStep() {
    this.detectDeath();

    if (this.dying > -1) {
      return;
    }

    this.clearXpDrops();

    this.attackIfPossible();

    this.processIncomingAttacks();

    this.eats.tickFood(this);

    this.regenTimer.regen();

    this.sendXpToController();
  }

  attackIfPossible() {
    this.attackDelay--;

    if (this.canAttack() === false) {
      return;
    }

    if (this.aggro) {
      this.setHasLOS();
      if (
        this.hasLOS &&
        this.attackDelay <= 0 &&
        this.aggro.isDying() === false
      ) {
        const attackDelay = this.attackSpeed;
        if (this.attack()) {
          this.attackDelay = attackDelay;
        }
      } else if (
        this.manualSpellCastSelection &&
        this.manualCastHasTarget &&
        this.hasLOS &&
        this.attackDelay <= 0 &&
        this.aggro.dying == this.aggro.deathAnimationLength
      ) {
        // Phantom/ghost barrage
        const attackDelay = this.attackSpeed;
        if (this.attack()) {
          this.attackDelay = attackDelay;
        }
      }

      // After allowing ghost barrage, unset aggro if enemy is dead
      if (this.aggro && this.aggro.isDying()) {
        this.interruptCombat();
      }
    }
  }

  draw(tickPercent: number) {
    // this.region.context.fillStyle = '#FFFF00'
    // this.region.context.fillRect(
    //   26 * Settings.tileSize,
    //   24 * Settings.tileSize,
    //   6 * Settings.tileSize,
    //   12 * Settings.tileSize
    // // 26 - 32 x
    // // 24 - 36 y

    // )
    if (Settings.displayPlayerLoS) {
      LineOfSight.drawLOS(
        this.region,
        this.location.x,
        this.location.y,
        this.size,
        this.attackRange,
        "#00FF0055",
        this.type === UnitTypes.MOB
      );
    }

    this.region.context.save();
    const perceivedLocation = this.getPerceivedLocation(tickPercent);
    const perceivedX = perceivedLocation.x;
    const perceivedY = perceivedLocation.y;

    // Perceived location

    if (this.dying === -1) {
      this.region.context.globalAlpha = 0.7;
      this.region.context.fillStyle = "#FFFF00";
      this.region.context.fillRect(
        perceivedX * Settings.tileSize,
        perceivedY * Settings.tileSize,
        Settings.tileSize,
        Settings.tileSize
      );
      this.region.context.globalAlpha = 1;
    }

    // Draw player on true tile
    this.region.context.fillStyle = "#ffffff73";
    // feedback for when you shoot
    if (this.shouldShowAttackAnimation()) {
      this.region.context.fillStyle = "#00FFFF";
    }
    if (this.dying > -1) {
      this.region.context.fillStyle = "#000";
    }
    this.region.context.strokeStyle = "#FFFFFF73";
    this.region.context.lineWidth = 3;
    this.region.context.fillRect(
      this.location.x * Settings.tileSize,
      this.location.y * Settings.tileSize,
      Settings.tileSize,
      Settings.tileSize
    );

    // Destination location
    this.region.context.strokeStyle = "#FFFFFF73";
    this.region.context.lineWidth = 3;
    this.region.context.strokeRect(
      this.destinationLocation.x * Settings.tileSize,
      this.destinationLocation.y * Settings.tileSize,
      Settings.tileSize,
      Settings.tileSize
    );
    this.region.context.restore();
    return { x: perceivedX, y: perceivedY };
  }

  getPerceivedLocation(tickPercent: number) {
    if (this.dying > -1) {
      tickPercent = 0;
    }

    let perceivedX = Pathing.linearInterpolation(
      this.perceivedLocation.x,
      this.location.x,
      tickPercent
    );
    let perceivedY = Pathing.linearInterpolation(
      this.perceivedLocation.y,
      this.location.y,
      tickPercent
    );

    if (this.path && this.path.length === 2 && this.dying === -1) {
      if (tickPercent < 0.5) {
        perceivedX = Pathing.linearInterpolation(
          this.perceivedLocation.x,
          this.path[0].x,
          tickPercent * 2
        );
        perceivedY = Pathing.linearInterpolation(
          this.perceivedLocation.y,
          this.path[0].y,
          tickPercent * 2
        );
      } else {
        perceivedX = Pathing.linearInterpolation(
          this.path[0].x,
          this.location.x,
          (tickPercent - 0.5) * 2
        );
        perceivedY = Pathing.linearInterpolation(
          this.path[0].y,
          this.location.y,
          (tickPercent - 0.5) * 2
        );
      }
    }
    return {
      x: perceivedX,
      y: perceivedY,
      z: 0,
    };
  }

  drawUILayer(
    tickPercent: number,
    offset: Location,
    context: OffscreenCanvasRenderingContext2D,
    scale: number,
    hitsplatsAbove: boolean
  ) {
    if (this.dying > -1) {
      return;
    }
    context.save();

    context.translate(offset.x, offset.y);

    if (Settings.rotated === "south") {
      this.region.context.rotate(Math.PI);
    }
    this.drawHPBar(context, scale);
    this.drawHitsplats(context, scale, hitsplatsAbove);
    this.drawOverheadPrayers(context, scale);
    context.restore();
  }

  create3dModel(): Model {
    return PointingModel.forRenderable(this);
  }
}


class ClickMarker extends TileMarker {
  constructor(region: Region, location: Location) {
    super(region, location, "#FFFFFF", 1, false);
  }
  remove() {
    this.dying = 0;
  }
}