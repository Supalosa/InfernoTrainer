import {
  ScytheOfVitur,
  TorvaFullhelm,
  OccultNecklace,
  InfernalCape,
  DragonArrows,
  TorvaPlatebody,
  TorvaPlatelegs,
  PrimordialBoots,
  ZaryteVambraces,
  RingOfSufferingImbued,
  TwistedBow,
  MasoriBodyF,
  DizanasQuiver,
  PegasianBoots,
  NecklaceOfAnguish,
  MasoriChapsF,
  MasoriMaskF,
  SaradominBrew,
  SuperRestore,
  BastionPotion,
  StaminaPotion,
  Item,
  ItemName,
  Player,
  UnitOptions,
  SuperCombatPotion,
  FerociousGloves,
  AmuletOfTorture,
  BladeOfSaeldor,
  AvernicDefender,
} from "@supalosa/oldschool-trainer-sdk";

import { filter, indexOf, map } from "lodash";

export class VerzikLoadout {

  loadoutMaxMelee() {
    return {
      equipment: {
        weapon: new ScytheOfVitur(),
        offhand: null,
        helmet: new TorvaFullhelm(),
        necklace: new AmuletOfTorture(), // TODO
        cape: new InfernalCape(),
        ammo: new DragonArrows(),
        chest: new TorvaPlatebody(),
        legs: new TorvaPlatelegs(),
        feet: new PrimordialBoots(),
        gloves: new FerociousGloves(),
        ring: new RingOfSufferingImbued(), // TODO
      },
      inventory: [
        new BladeOfSaeldor(),
        new AvernicDefender(),
        null,
        null,
        null,
        null,
        null,
        new SaradominBrew(),
        new SaradominBrew(),
        new SaradominBrew(),
        new SuperRestore(),
        new SuperRestore(),
        new SaradominBrew(),
        new SaradominBrew(),
        new SuperRestore(),
        new SuperRestore(),
        new SaradominBrew(),
        new SaradominBrew(),
        new SuperRestore(),
        new SuperRestore(),
        new SaradominBrew(),
        new SaradominBrew(),
        new SuperRestore(),
        new SuperRestore(),
        new SuperCombatPotion(),
        new StaminaPotion(),
        new SuperRestore(),
        new SuperRestore(),
      ],
    };
  }

  findItemByName(list: Item[], name: ItemName) {
    return indexOf(map(list, "itemName"), name);
  }

  findAnyItemWithName(list: Item[], names: ItemName[]) {
    return (
      filter(
        names.map((name: ItemName) => {
          return this.findItemByName(list, name);
        }),
        (index: number) => index !== -1,
      )[0] || -1
    );
  }

  setStats(player: Player) {
    player.stats.prayer = 99;
    player.currentStats.prayer = 99;
    player.stats.defence = 99;
    player.currentStats.defence = 99;
  }

  getLoadout(): UnitOptions {
    return this.loadoutMaxMelee();
  }
}
