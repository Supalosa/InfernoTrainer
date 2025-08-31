import KarambwanImage from "../../assets/images/potions/Cooked_karambwan.png";
import { Food } from "../../sdk/gear/Food";
import { ItemName } from "../../sdk/ItemName";
import { Player } from "../../sdk/Player";
import { ImageLoader } from "../../sdk/utils/ImageLoader";

export class Karambwan extends Food {
  healAmount = 18;
  inventorySprite: HTMLImageElement = ImageLoader.createImage(KarambwanImage);
  get inventoryImage() {
    return KarambwanImage;
  }
  get itemName(): ItemName {
    return ItemName.KARAMBWAN;
  }
  get weight(): number {
    return 0.65;
  }
  inventoryLeftClick(player: Player) {
    player.eats.eatComboFood(this);
  }
}
