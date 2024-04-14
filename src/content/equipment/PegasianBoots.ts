import { Feet } from "../../sdk/gear/Feet";
import { ImageLoader } from "../../sdk/utils/ImageLoader";
import InventImage from '../../assets/images/equipment/Pegasian_boots.png';
import { ItemName } from "../../sdk/ItemName";

import PegasianBootsModel from "../../assets/models/male_Pegasian_boots-v6.glb";

export class PegasianBoots extends Feet {
  inventorySprite: HTMLImageElement = ImageLoader.createImage(
    this.inventoryImage
  );

  get inventoryImage() {
    return InventImage;
  }
  get itemName(): ItemName {
    return ItemName.PEGASIAN_BOOTS;
  }
  get weight(): number {
    return 1.814;
  }

  constructor() {
    super();
    this.bonuses = {
      attack: {
        stab: 0,
        slash: 0,
        crush: 0,
        magic: -12,
        range: 12,
      },
      defence: {
        stab: 5,
        slash: 5,
        crush: 5,
        magic: 5,
        range: 5,
      },
      other: {
        meleeStrength: 0,
        rangedStrength: 0,
        magicDamage: 0,
        prayer: 0,
      },
      targetSpecific: {
        undead: 0,
        slayer: 0,
      },
    };
  }

  override get model() {
    return PegasianBootsModel;
  }
}