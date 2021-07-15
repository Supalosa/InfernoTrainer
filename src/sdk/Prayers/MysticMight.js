'use strict';

import { BasePrayer } from "./BasePrayer";
import OverheadImg from "../../assets/images/prayers/rangeOver.png"

import OnSound from "../../assets/sounds/rangeOn.ogg"
import OffSound from "../../assets/sounds/rangeOff.ogg"
import { Settings } from "../Settings";

export class MysticMight extends BasePrayer{
  
  get name() {
    return 'Mystic Might';
  }

  get groups(){
    return [BasePrayer.groups.MAGIC, BasePrayer.groups.DEFENCE];
  }
  
  isOverhead() {
    return false;
  }

  feature () {
    return 'offensiveMagic';
  }

  playOnSound(){
    if (Settings.playsAudio){
      // new Audio(OnSound).play();
    }
  }
  
  playOffSound() {
    if (Settings.playsAudio){
      // new Audio(OffSound).play();
    }
  }
  
}