"use strict";

import InventoryImage from "../../assets/images/equipment/Ancient_staff.png";
import { AttackStyle, AttackStyleTypes } from "../../sdk/AttackStylesController";
import { AttackBonuses } from "../../sdk/gear/Weapon";
import { ItemName } from "../../sdk/ItemName";
import { Unit } from "../../sdk/Unit";
import { BarrageSpell } from "../../sdk/weapons/BarrageSpell";
import { BloodBarrageSpell } from "../../sdk/weapons/BloodBarrageSpell";
import { MeleeWeapon } from "../../sdk/weapons/MeleeWeapon";

export class AncientStaff extends MeleeWeapon {
  autocastSpell: BarrageSpell = new BloodBarrageSpell();

  constructor() {
    super();

    this.bonuses = {
      attack: {
        stab: 10,
        slash: -1,
        crush: 40,
        magic: 15,
        range: 0,
      },
      defence: {
        stab: 2,
        slash: 3,
        crush: 1,
        magic: 15,
        range: 0,
      },
      other: {
        meleeStrength: 50,
        rangedStrength: 0,
        magicDamage: 0,
        prayer: -1,
      },
      targetSpecific: {
        undead: 0,
        slayer: 0,
      },
    };
  }

  get weight(): number {
    return 2.267;
  }

  attack(from: Unit, to: Unit, bonuses: AttackBonuses = {}): boolean {
    if (this.attackStyle() === AttackStyle.AUTOCAST) {
      if (from.isPlayer) {
        this.autocastSpell.cast(from, to);
        return true;
      }
    }

    return super.attack(from, to, bonuses);
  }

  attackStyles() {
    return [AttackStyle.ACCURATE, AttackStyle.AGGRESSIVECRUSH, AttackStyle.DEFENSIVE, AttackStyle.AUTOCAST];
  }


  attackStyleCategory(): AttackStyleTypes {
    return AttackStyleTypes.STAFF;
  }

  defaultStyle(): AttackStyle {
    return AttackStyle.AUTOCAST;
  }

  get itemName(): ItemName {
    return ItemName.ANCIENT_STAFF;
  }

  get isTwoHander(): boolean {
    return false;
  }

  hasSpecialAttack(): boolean {
    return false;
  }

  get attackRange() {
    if (this.attackStyle() === AttackStyle.AUTOCAST) {
      return 10;
    }
    return 1;
  }

  get attackSpeed() {
    return 5;
  }

  get inventoryImage() {
    return InventoryImage;
  }
}
