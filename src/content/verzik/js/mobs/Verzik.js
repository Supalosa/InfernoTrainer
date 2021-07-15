'use strict';

import { Mob } from "../../../../sdk/Mob";
import { MeleeWeapon } from "../../../../sdk/Weapons/MeleeWeapon";
import VerzikImage from "../../assets/images/verzik.png";
import BatSound from "../../assets/sounds/bat.ogg";

export class Verzik extends Mob{

  get displayName(){
    return "Verzik";
  }

  get combatLevel() {
    return 1520
  }

  get combatLevelColor() {
    return 'red';
  }


  setStats () {
    this.frozen = 1;

    this.weapons = {
      melee: new MeleeWeapon()
    }

    // non boosted numbers
    this.stats = {
      attack: 0,
      strength: 0,
      defence: 55,
      range: 120,
      magic: 120,
      hitpoint: 2000
    };

    // with boosts
    this.currentStats = JSON.parse(JSON.stringify(this.stats))

    this.bonuses = {
      attack: {
        stab: 0,
        slash: 0,
        crush: 0,
        magic: 0,
        range: 25
      },
      defence: {
        stab: 30,
        slash: 30,
        crush: 30,
        magic: -20,
        range: 45
      },
      other: {
        meleeStrength: 0,
        rangedStrength: 30,
        magicDamage: 0,
        prayer: 0
      }
    }
  }
  
  get cooldown() {
    return 7;
  }

  get attackRange() {
    return 1;
  }

  get size() {
    return 7;
  }

  get image() {
    return VerzikImage;
  }

  get sound() {
    return BatSound;
  }
  
  get color() {
    return "#aadd7333";
  }

  attackStyle() {
    return 'melee';
  }
  
  attackAnimation(region, framePercent){
    region.ctx.transform(1, 0, Math.sin(-framePercent * Math.PI * 2) / 2, 1, 0, 0)
  }
}