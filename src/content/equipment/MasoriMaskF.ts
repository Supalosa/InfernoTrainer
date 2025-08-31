import InventImage from "../../assets/images/equipment/Masori_mask_(f).png";
import { Helmet } from "../../sdk/gear/Helmet";
import { ItemName } from "../../sdk/ItemName";
import { Assets } from "../../sdk/utils/Assets";
import { ImageLoader } from "../../sdk/utils/ImageLoader";

export class MasoriMaskF extends Helmet {
  inventorySprite: HTMLImageElement = ImageLoader.createImage(this.inventoryImage);

  get inventoryImage() {
    return InventImage;
  }
  get itemName(): ItemName {
    return ItemName.MASORI_MASK_F;
  }

  get weight(): number {
    return 1.5;
  }

  constructor() {
    super();
    this.bonuses = {
      attack: {
        stab: 0,
        slash: 0,
        crush: 0,
        magic: -1,
        range: 12,
      },
      defence: {
        stab: 8,
        slash: 10,
        crush: 12,
        magic: 12,
        range: 9,
      },
      other: {
        meleeStrength: 0,
        rangedStrength: 2,
        magicDamage: 0,
        prayer: 1,
      },
      targetSpecific: {
        undead: 0,
        slayer: 0,
      },
    };
  }

  override get model() {
    return this.Model;
  }
  Model = Assets.getAssetUrl("models/player_masori_mask__f_.glb");
}
