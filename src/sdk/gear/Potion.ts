import Vial from "../../assets/images/potions/Vial.png";
import { Item } from "../Item";
import { Player } from "../Player";
import { ImageLoader } from "../utils/ImageLoader";

import PotionSound from "../../assets/sounds/liquid_2401.ogg";
import { Sound, SoundCache } from "../utils/SoundCache";

export class Potion extends Item {
  inventorySprite: HTMLImageElement = ImageLoader.createImage(this.inventoryImage);
  vial: HTMLImageElement = ImageLoader.createImage(Vial);
  doses = 4;

  constructor() {
    super();
    this.defaultAction = "Drink";
  }
  drink(player: Player) {
    player.interruptCombat();
  }

  get weight(): number {
    if (this.doses === 4) {
      return 0.035;
    } else if (this.doses === 3) {
      return 0.03;
    } else if (this.doses === 2) {
      return 0.025
    } else if (this.doses === 1) {
      return 0.02;
    }
  }

  updateInventorySprite() {
    // Override me
  }

  get hasInventoryLeftClick(): boolean {
    return true;
  }
  inventoryLeftClick(player: Player) {
    let didDrink = false;
    if (this.doses > 0) {
      didDrink = player.eats.drinkPotion(this);
    }
    if (this.doses === 0) {
      this.consumeItem(player);
    }
    if (didDrink) {
      SoundCache.play(new Sound(PotionSound, 0.1));
    }
    this.updateInventorySprite();
  }
}
