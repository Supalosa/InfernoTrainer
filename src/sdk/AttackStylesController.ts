"use strict";

import { Weapon } from "./gear/Weapon";
import { ImageLoader } from "./utils/ImageLoader";

import BowAccurateImage from "../assets/images/attackstyles/bow/accurate.png";
import BowRapidImage from "../assets/images/attackstyles/bow/rapid.png";
import BowLongrangeImage from "../assets/images/attackstyles/bow/longrange.png";

import CrossbowAccurateImage from "../assets/images/attackstyles/crossbows/accurate.png";
import CrossbowRapidImage from "../assets/images/attackstyles/crossbows/rapid.png";
import CrossbowLongrangeImage from "../assets/images/attackstyles/crossbows/longrange.png";

import ThrownAccurateImage from "../assets/images/attackstyles/thrown/accurate.png";
import ThrownRapidImage from "../assets/images/attackstyles/thrown/rapid.png";
import ThrownLongrangeImage from "../assets/images/attackstyles/thrown/longrange.png";

import StaffAccurateImage from "../assets/images/attackstyles/staff/accurate.png";
import StaffAggressiveImage from "../assets/images/attackstyles/staff/aggressive.png";
import StaffDefensiveImage from "../assets/images/attackstyles/staff/defensive.png";

import ScytheAccurateImage from "../assets/images/attackstyles/scythe/accurate.png";
import ScytheAggressiveSlashImage from "../assets/images/attackstyles/scythe/aggressiveslash.png";
import ScytheAggressiveCrushImage from "../assets/images/attackstyles/scythe/aggressivecrush.png";
import ScytheDefensiveImage from "../assets/images/attackstyles/scythe/defensive.png";

import ChinchompaShortFuseImage from "../assets/images/attackstyles/chinchompas/short.png";
import ChinchompaMediumFuseImage from "../assets/images/attackstyles/chinchompas/medium.png";
import ChinchompaLongFuseImage from "../assets/images/attackstyles/chinchompas/long.png";

import SwordChopImage from "../assets/images/attackstyles/swords/chop.png";
import SwordSlashImage from "../assets/images/attackstyles/swords/slash.png";
import SwordLungeImage from "../assets/images/attackstyles/swords/lunge.png";
import SwordBlockImage from "../assets/images/attackstyles/swords/block.png";

//https://oldschool.runescape.wiki/w/Weapons/Types
export enum AttackStyleTypes {
  CROSSBOW = "CROSSBOW",
  BOW = "BOW",
  CHINCHOMPA = "CHINCOMPA",
  GUN = "GUN",
  THROWN = "THROWN",
  BLADEDSTAFF = "BLADEDSTAFF",
  POWEREDSTAFF = "POWEREDSTAFF",
  STAFF = "STAFF",
  SALAMANDER = "SALAMANDER",
  TWOHANDSWORD = "TWOHANDSWORD",
  AXE = "AXE",
  BANNER = "BANNER",
  BLUNT = "BLUNT",
  BLUDGEON = "BLUDGEON",
  BULWARK = "BULWARK",
  CLAW = "CLAW",
  PICKAXE = "PICKAXE",
  POLEARM = "POLEARM",
  POLESTAFF = "POLESTAFF",
  SCYTHE = "SCYTHE",
  SLASHSWORD = "SLASHSWORD",
  SPEAR = "SPEAR",
  SPIKEDWEAPON = "SPIKEDWEAPON",
  STABSWORD = "STABSWORD",
  UNARMED = "UNARMED",
  WHIP = "WHIP",
}

export enum AttackStyle {
  ACCURATE = "ACCURATE",
  RAPID = "RAPID",
  LONGRANGE = "LONGRANGE",
  REAP = "REAP",
  AGGRESSIVECRUSH = "AGGRESSIVE (CRUSH)",
  AGGRESSIVESLASH = "AGGRESSIVE (SLASH)",
  STAB = "STAB",
  DEFENSIVE = "DEFENSIVE",
  CONTROLLED = "CONTROLLED",
  AUTOCAST = "AUTOCAST",
  SHORT_FUSE = "SHORT_FUSE",
  MEDIUM_FUSE = "MEDIUM_FUSE",
  LONG_FUSE = "LONG_FUSE",
}

interface AttackStyleStorage {
  [key: string]: AttackStyle;
}

interface AttackStyleImageMap {
  [type: string]: IAttackStyleImageMap;
}

interface IAttackStyleImageMap {
  [style: string]: HTMLImageElement;
}

// xp multiplier constants
const DEFENCE_2 = { skill: "defence", multiplier: 2 };
const HITPOINTS_133 = { skill: "hitpoint", multiplier: 1.33 };

const MELEE_ACCURATE = [{ skill: "attack", multiplier: 4 }, HITPOINTS_133];
const MELEE_AGGRESSIVE = [{ skill: "strength", multiplier: 4 }, HITPOINTS_133];
const MELEE_DEFENSIVE = [{ skill: "defence", multiplier: 4 }, HITPOINTS_133];
const MELEE_CONTROLLED = [
  { skill: "attack", multiplier: 1.33 },
  { skill: "strength", multiplier: 1.33 },
  { skill: "defence", multiplier: 1.33 },
  HITPOINTS_133,
];

const RANGE_ACCURATE = [{ skill: "range", multiplier: 4 }, HITPOINTS_133];
const RANGE_RAPID = [{ skill: "range", multiplier: 4 }, HITPOINTS_133];
const RANGE_LONGRANGE = [{ skill: "range", multiplier: 2 }, DEFENCE_2, HITPOINTS_133];

// This badly needs a refactor to classify each styles by parent style
export class AttackStylesController {
  static attackStyleImageMap: AttackStyleImageMap = {
    [AttackStyleTypes.CROSSBOW]: {
      [AttackStyle.ACCURATE]: ImageLoader.createImage(CrossbowAccurateImage),
      [AttackStyle.RAPID]: ImageLoader.createImage(CrossbowRapidImage),
      [AttackStyle.LONGRANGE]: ImageLoader.createImage(CrossbowLongrangeImage),
    },
    [AttackStyleTypes.BOW]: {
      [AttackStyle.ACCURATE]: ImageLoader.createImage(BowAccurateImage),
      [AttackStyle.RAPID]: ImageLoader.createImage(BowRapidImage),
      [AttackStyle.LONGRANGE]: ImageLoader.createImage(BowLongrangeImage),
    },
    [AttackStyleTypes.STAFF]: {
      [AttackStyle.ACCURATE]: ImageLoader.createImage(StaffAccurateImage),
      [AttackStyle.AGGRESSIVECRUSH]: ImageLoader.createImage(StaffAggressiveImage),
      [AttackStyle.DEFENSIVE]: ImageLoader.createImage(StaffDefensiveImage),
      [AttackStyle.AUTOCAST]: ImageLoader.createImage(StaffDefensiveImage),
    },
    [AttackStyleTypes.THROWN]: {
      [AttackStyle.ACCURATE]: ImageLoader.createImage(ThrownAccurateImage),
      [AttackStyle.RAPID]: ImageLoader.createImage(ThrownRapidImage),
      [AttackStyle.LONGRANGE]: ImageLoader.createImage(ThrownLongrangeImage),
    },
    [AttackStyleTypes.SCYTHE]: {
      [AttackStyle.REAP]: ImageLoader.createImage(ScytheAccurateImage),
      [AttackStyle.AGGRESSIVESLASH]: ImageLoader.createImage(ScytheAggressiveSlashImage),
      [AttackStyle.AGGRESSIVECRUSH]: ImageLoader.createImage(ScytheAggressiveCrushImage),
      [AttackStyle.DEFENSIVE]: ImageLoader.createImage(ScytheDefensiveImage),
    },
    [AttackStyleTypes.SLASHSWORD]: {
      [AttackStyle.ACCURATE]: ImageLoader.createImage(SwordChopImage),
      [AttackStyle.AGGRESSIVESLASH]: ImageLoader.createImage(SwordSlashImage),
      [AttackStyle.STAB]: ImageLoader.createImage(SwordLungeImage),
      [AttackStyle.DEFENSIVE]: ImageLoader.createImage(SwordBlockImage),
    },
    [AttackStyleTypes.CHINCHOMPA]: {
      [AttackStyle.SHORT_FUSE]: ImageLoader.createImage(ChinchompaShortFuseImage),
      [AttackStyle.MEDIUM_FUSE]: ImageLoader.createImage(ChinchompaMediumFuseImage),
      [AttackStyle.LONG_FUSE]: ImageLoader.createImage(ChinchompaLongFuseImage),
    },
  };

  static attackStyleXpType: Record<AttackStyle, { skill: string; multiplier: number }[]> = {
    [AttackStyle.ACCURATE]: RANGE_ACCURATE,
    [AttackStyle.RAPID]: RANGE_RAPID,
    [AttackStyle.LONGRANGE]: RANGE_LONGRANGE,
    [AttackStyle.REAP]: MELEE_ACCURATE,
    [AttackStyle.AGGRESSIVECRUSH]: MELEE_AGGRESSIVE,
    [AttackStyle.AGGRESSIVESLASH]: MELEE_AGGRESSIVE,
    // TODO: add different defensives for different weapons
    [AttackStyle.DEFENSIVE]: MELEE_DEFENSIVE,
    [AttackStyle.STAB]: MELEE_CONTROLLED,
    [AttackStyle.CONTROLLED]: MELEE_CONTROLLED,
    [AttackStyle.AUTOCAST]: [{ skill: "magic", multiplier: 2 }, HITPOINTS_133],
    // TODO: AUTOCAST_DEFENSIVE
    [AttackStyle.SHORT_FUSE]: RANGE_ACCURATE,
    [AttackStyle.MEDIUM_FUSE]: RANGE_RAPID,
    [AttackStyle.LONG_FUSE]: RANGE_LONGRANGE,
  };

  static attackStyleStrengthBonus: {[style in AttackStyle]?: number} = {
    // aggressive = 3
    [AttackStyle.AGGRESSIVECRUSH]: 3,
    [AttackStyle.AGGRESSIVESLASH]: 3,
    // controlled = 1
    [AttackStyle.CONTROLLED]: 1,
    [AttackStyle.STAB]: 1,
  }

  static controller: AttackStylesController = new AttackStylesController();
  stylesMap: AttackStyleStorage = {};

  getAttackStyleForType(type: AttackStyleTypes, weapon: Weapon) {
    if (!this.stylesMap[type]) {
      this.stylesMap[type] = weapon.defaultStyle();
    }
    return this.stylesMap[type];
  }

  setWeaponAttackStyle(weapon: Weapon, newStyle: AttackStyle) {
    this.stylesMap[weapon.attackStyleCategory()] = newStyle;
  }
  
  getWeaponAttackStyle(weapon: Weapon): AttackStyle {
    return this.stylesMap[weapon.attackStyleCategory()];
  }

  getWeaponXpDrops(style: AttackStyle, damage: number, npcMultiplier: number): { xp: number; skill: string }[] {
    return AttackStylesController.attackStyleXpType[style].map(({ skill, multiplier: skillMultiplier }) => ({
      xp: damage * skillMultiplier * npcMultiplier,
      skill,
    }));
  }

  getWeaponStrengthBonus(style: AttackStyle): number {
    return AttackStylesController.attackStyleStrengthBonus[style] ?? 0;
  }
}
